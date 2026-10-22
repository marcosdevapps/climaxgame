import 'server-only'

import type { FollowStatus } from '@/components/profile/follow-button'
import type { Enums } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

import { getCurrentUserId } from './session'
import { getFollowStatuses } from './social'

export type CommentView = {
  id: number
  body: string
  isSpoiler: boolean
  status: Enums<'comment_status'>
  likesCount: number
  createdAt: string
  editedAt: string | null
  likedByMe: boolean
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  followStatus: FollowStatus
  game?: { slug: string; title: string }
}

type Row = {
  id: number
  body: string
  is_spoiler: boolean
  status: Enums<'comment_status'>
  likes_count: number
  created_at: string
  edited_at: string | null
  user_id: string
  profiles: { username: string; display_name: string | null; avatar_url: string | null } | null
  games?: { slug: string; title: string } | null
}

const COMMENT_FIELDS =
  'id, body, is_spoiler, status, likes_count, created_at, edited_at, user_id, profiles!comments_user_id_fkey(username, display_name, avatar_url)'

// Completa likes propios y estado de follow hacia los autores.
async function hydrate(rows: Row[]): Promise<CommentView[]> {
  const me = await getCurrentUserId()
  const supabase = await createClient()
  const ids = rows.map((r) => r.id)

  const [{ data: likes }, follows] = await Promise.all([
    me && ids.length > 0
      ? supabase.from('comment_likes').select('comment_id').eq('user_id', me).in('comment_id', ids)
      : Promise.resolve({ data: [] as { comment_id: number }[] }),
    getFollowStatuses([...new Set(rows.map((r) => r.user_id))]),
  ])
  const liked = new Set((likes ?? []).map((l) => l.comment_id))

  return rows.flatMap((row) =>
    row.profiles
      ? [
          {
            id: row.id,
            body: row.body,
            isSpoiler: row.is_spoiler,
            status: row.status,
            likesCount: row.likes_count,
            createdAt: row.created_at,
            editedAt: row.edited_at,
            likedByMe: liked.has(row.id),
            author: {
              id: row.user_id,
              username: row.profiles.username,
              displayName: row.profiles.display_name,
              avatarUrl: row.profiles.avatar_url,
            },
            followStatus: follows.get(row.user_id) ?? 'none',
            game: row.games ?? undefined,
          },
        ]
      : [],
  )
}

// Comentarios de un juego. RLS ya filtra: visibles para todos, ocultos solo para
// su autor y moderadores, y nada de usuarios bloqueados.
export async function getGameComments(gameId: number, sort: 'relevant' | 'recent') {
  const supabase = await createClient()
  let query = supabase.from('comments').select(COMMENT_FIELDS).eq('game_id', gameId).neq('status', 'deleted')
  query =
    sort === 'recent'
      ? query.order('created_at', { ascending: false })
      : query.order('likes_count', { ascending: false }).order('created_at', { ascending: false })

  const { data } = await query.limit(100).overrideTypes<Row[], { merge: false }>()
  return hydrate(data ?? [])
}

export async function getUserComments(userId: string, limit = 50) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('comments')
    .select(`${COMMENT_FIELDS}, games(slug, title)`)
    .eq('user_id', userId)
    .eq('status', 'visible')
    .order('created_at', { ascending: false })
    .limit(limit)
    .overrideTypes<Row[], { merge: false }>()
  return hydrate(data ?? [])
}
