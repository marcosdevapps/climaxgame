import 'server-only'

import type { FollowStatus } from '@/components/profile/follow-button'
import { createClient } from '@/lib/supabase/server'

import { getCurrentUserId } from './session'

export type ProfileSummary = {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
}

const SUMMARY_FIELDS = 'id, username, display_name, avatar_url, bio'

// Estado del follow del usuario actual hacia cada uno de los perfiles indicados.
export async function getFollowStatuses(userIds: string[]): Promise<Map<string, FollowStatus>> {
  const me = await getCurrentUserId()
  const statuses = new Map<string, FollowStatus>(userIds.map((id) => [id, 'none']))
  if (!me || userIds.length === 0) return statuses

  const supabase = await createClient()
  const { data } = await supabase
    .from('follows')
    .select('following_id, status')
    .eq('follower_id', me)
    .in('following_id', userIds)
  data?.forEach((row) => statuses.set(row.following_id, row.status))
  return statuses
}

// Para el onboarding: quienes comparten más favoritos con el usuario y, si aún
// no tiene, los perfiles con más seguidores.
export async function getSuggestedUsers(limit = 6): Promise<ProfileSummary[]> {
  const me = await getCurrentUserId()
  const supabase = await createClient()

  const { data: myFavorites } = me ? await supabase.from('favorites').select('game_id').eq('user_id', me) : { data: [] }
  const gameIds = (myFavorites ?? []).map((f) => f.game_id)

  const affinity = new Map<string, number>()
  if (gameIds.length > 0) {
    const { data: shared } = await supabase.from('favorites').select('user_id').in('game_id', gameIds).limit(1000)
    shared?.forEach((row) => row.user_id !== me && affinity.set(row.user_id, (affinity.get(row.user_id) ?? 0) + 1))
  }

  const { data: popular } = await supabase
    .from('profiles')
    .select(`${SUMMARY_FIELDS}, followers_count`)
    .neq('id', me ?? '00000000-0000-0000-0000-000000000000')
    .not('onboarding_completed_at', 'is', null)
    .order('followers_count', { ascending: false })
    .limit(50)

  return (popular ?? [])
    .sort((a, b) => (affinity.get(b.id) ?? 0) - (affinity.get(a.id) ?? 0) || b.followers_count - a.followers_count)
    .slice(0, limit)
    .map(({ followers_count: _count, ...profile }) => {
      void _count
      return profile
    })
}
