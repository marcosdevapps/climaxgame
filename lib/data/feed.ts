import 'server-only'

import { createClient } from '@/lib/supabase/server'

import { getCurrentUserId } from './session'

export type FeedActor = { username: string; displayName: string | null; avatarUrl: string | null }
export type FeedGame = { slug: string; title: string; cover_image_id: string | null }

export type FeedItem = {
  key: string
  kind: 'favorite' | 'comment'
  createdAt: string
  actor: FeedActor
  game: FeedGame
  body?: string
  isSpoiler?: boolean
}

export const FEED_PAGE_SIZE = 20

type Profile = { username: string; display_name: string | null; avatar_url: string | null } | null
const toActor = (p: NonNullable<Profile>): FeedActor => ({
  username: p.username,
  displayName: p.display_name,
  avatarUrl: p.avatar_url,
})

export async function getFollowingIds(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted')
  return (data ?? []).map((row) => row.following_id)
}

// Actividad de las personas que sigo (S3): favoritos y comentarios nuevos, en
// orden cronológico. Paginación por cursor: "before" es la fecha del último ítem.
export async function getFeed({ before, limit = FEED_PAGE_SIZE }: { before?: string; limit?: number } = {}) {
  const me = await getCurrentUserId()
  if (!me) return { items: [] as FeedItem[], nextCursor: null, followingCount: 0 }

  const following = await getFollowingIds(me)
  if (following.length === 0) return { items: [], nextCursor: null, followingCount: 0 }

  const supabase = await createClient()
  const cursor = before ?? new Date().toISOString()

  const [{ data: favorites }, { data: comments }] = await Promise.all([
    supabase
      .from('favorites')
      .select(
        'user_id, game_id, created_at, profiles!favorites_user_id_fkey(username, display_name, avatar_url), games(slug, title, cover_image_id)',
      )
      .in('user_id', following)
      .lt('created_at', cursor)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('comments')
      .select(
        'id, body, is_spoiler, created_at, profiles!comments_user_id_fkey(username, display_name, avatar_url), games(slug, title, cover_image_id)',
      )
      .in('user_id', following)
      .eq('status', 'visible')
      .lt('created_at', cursor)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const items: FeedItem[] = [
    ...(favorites ?? []).flatMap((f) =>
      f.profiles && f.games
        ? [
            {
              key: `fav-${f.user_id}-${f.game_id}`,
              kind: 'favorite' as const,
              createdAt: f.created_at,
              actor: toActor(f.profiles),
              game: f.games,
            },
          ]
        : [],
    ),
    ...(comments ?? []).flatMap((c) =>
      c.profiles && c.games
        ? [
            {
              key: `com-${c.id}`,
              kind: 'comment' as const,
              createdAt: c.created_at,
              actor: toActor(c.profiles),
              game: c.games,
              body: c.body,
              isSpoiler: c.is_spoiler,
            },
          ]
        : [],
    ),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit)

  return {
    items,
    nextCursor: items.length === limit ? items[items.length - 1].createdAt : null,
    followingCount: following.length,
  }
}
