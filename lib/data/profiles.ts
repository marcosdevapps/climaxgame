import 'server-only'

import type { FollowStatus } from '@/components/profile/follow-button'
import type { GameCardData } from '@/lib/data/catalog'
import { createClient } from '@/lib/supabase/server'

import { getCurrentUserId } from './session'
import { getFollowStatuses, type ProfileSummary } from './social'

const CARD_FIELDS = 'id, slug, title, release_date, cover_image_id, critic_score'

export type ProfilePage = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  is_private: boolean
  platforms: string[]
  favorites_count: number
  followers_count: number
  following_count: number
  isOwn: boolean
  followStatus: FollowStatus
  blockedByMe: boolean
  // Favoritos visibles: perfil público, propio o seguidor aprobado (lo mismo que aplica RLS).
  canViewFavorites: boolean
}

export async function getProfileByUsername(username: string): Promise<ProfilePage | null> {
  const me = await getCurrentUserId()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select(
      'id, username, display_name, avatar_url, bio, is_private, platforms, favorites_count, followers_count, following_count',
    )
    .eq('username', username.toLowerCase())
    .maybeSingle()
  // RLS devuelve null si el dueño bloqueó al visitante.
  if (!profile) return null

  const isOwn = profile.id === me
  const [statuses, { data: block }] = await Promise.all([
    getFollowStatuses([profile.id]),
    me && !isOwn
      ? supabase.from('blocks').select('blocked_id').eq('blocker_id', me).eq('blocked_id', profile.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const followStatus = statuses.get(profile.id) ?? 'none'

  return {
    ...profile,
    isOwn,
    followStatus,
    blockedByMe: block != null,
    canViewFavorites: isOwn || !profile.is_private || followStatus === 'accepted',
  }
}

export async function getProfileFavorites(userId: string, sort: 'added' | 'score'): Promise<GameCardData[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('favorites')
    .select(`created_at, games(${CARD_FIELDS})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200)
    .overrideTypes<{ created_at: string; games: GameCardData | null }[], { merge: false }>()
  const games = (data ?? []).flatMap((f) => (f.games ? [f.games] : []))
  return sort === 'score' ? games.sort((a, b) => (b.critic_score ?? -1) - (a.critic_score ?? -1)) : games
}

// Favoritos que comparten el visitante y el dueño del perfil: el mejor motivo para seguir a alguien.
export async function getCommonGames(userId: string): Promise<GameCardData[]> {
  const me = await getCurrentUserId()
  if (!me || me === userId) return []
  const supabase = await createClient()
  const { data: mine } = await supabase.from('favorites').select('game_id').eq('user_id', me)
  const ids = (mine ?? []).map((f) => f.game_id)
  if (ids.length === 0) return []
  const { data } = await supabase
    .from('favorites')
    .select(`games(${CARD_FIELDS})`)
    .eq('user_id', userId)
    .in('game_id', ids)
    .limit(24)
    .overrideTypes<{ games: GameCardData | null }[], { merge: false }>()
  return (data ?? []).flatMap((f) => (f.games ? [f.games] : []))
}

export type ConnectionView = ProfileSummary & { followStatus: FollowStatus }

export async function getConnections(userId: string, direction: 'followers' | 'following'): Promise<ConnectionView[]> {
  const supabase = await createClient()
  const column = direction === 'followers' ? 'following_id' : 'follower_id'
  const relation =
    direction === 'followers'
      ? 'profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio)'
      : 'profiles!follows_following_id_fkey(id, username, display_name, avatar_url, bio)'

  const { data } = await supabase
    .from('follows')
    .select(`created_at, ${relation}`)
    .eq(column, userId)
    .eq('status', 'accepted')
    .order('created_at', { ascending: false })
    .limit(200)
    .overrideTypes<{ profiles: ProfileSummary | null }[], { merge: false }>()

  const people = (data ?? []).flatMap((row) => (row.profiles ? [row.profiles] : []))
  const statuses = await getFollowStatuses(people.map((p) => p.id))
  return people.map((p) => ({ ...p, followStatus: statuses.get(p.id) ?? 'none' }))
}
