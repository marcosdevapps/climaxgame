import 'server-only'

import type { Enums } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

import { getCurrentUserId } from './session'
import { getFollowStatuses } from './social'

export type NotificationView = {
  id: number
  type: Enums<'notification_type'>
  createdAt: string
  read: boolean
  actor: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null
  game: { slug: string; title: string } | null
  reason: string | null
  // new_follower: si ya sigo de vuelta; follow_request: si sigue pendiente.
  followBack: 'none' | 'accepted' | 'pending'
  requestPending: boolean
}

export async function getNotifications(limit = 50): Promise<NotificationView[]> {
  const me = await getCurrentUserId()
  if (!me) return []
  const supabase = await createClient()

  const { data } = await supabase
    .from('notifications')
    .select(
      'id, type, created_at, read_at, entity_id, data, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url)',
    )
    .eq('user_id', me)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = data ?? []

  // Juego de cada comentario mencionado (likes y moderación).
  const commentIds = rows.filter((n) => n.entity_id != null).map((n) => n.entity_id as number)
  const { data: comments } = commentIds.length
    ? await supabase.from('comments').select('id, games(slug, title)').in('id', commentIds)
    : { data: [] }
  const gameByComment = new Map((comments ?? []).map((c) => [c.id, c.games]))

  const actorIds = [...new Set(rows.flatMap((n) => (n.actor ? [n.actor.id] : [])))]
  const [followBack, { data: pending }] = await Promise.all([
    getFollowStatuses(actorIds),
    supabase.from('follows').select('follower_id').eq('following_id', me).eq('status', 'pending'),
  ])
  const pendingFrom = new Set((pending ?? []).map((p) => p.follower_id))

  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    createdAt: n.created_at,
    read: n.read_at != null,
    actor: n.actor
      ? { id: n.actor.id, username: n.actor.username, displayName: n.actor.display_name, avatarUrl: n.actor.avatar_url }
      : null,
    game: n.entity_id != null ? (gameByComment.get(n.entity_id) ?? null) : null,
    reason: (n.data as { reason?: string } | null)?.reason ?? null,
    followBack: n.actor ? (followBack.get(n.actor.id) ?? 'none') : 'none',
    requestPending: n.actor ? pendingFrom.has(n.actor.id) : false,
  }))
}
