import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { ModerationQueue, type QueueItem } from '@/components/moderation/moderation-queue'
import { RelativeTime } from '@/components/relative-time'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentProfile, isModerator } from '@/lib/data/session'
import type { Enums } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Moderación', robots: { index: false } }

const ACTION_LABELS: Record<Enums<'moderation_action_type'>, string> = {
  restore_comment: 'restauró un comentario de',
  delete_comment: 'borró un comentario de',
  suspend_user: 'suspendió a',
  unsuspend_user: 'levantó la suspensión de',
}

export default function ModerationPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Moderación</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Moderation />
      </Suspense>
    </div>
  )
}

type ReportRow = {
  reason: Enums<'report_reason'>
  details: string | null
  comment_id: number
  comments: {
    id: number
    body: string
    status: Enums<'comment_status'>
    is_spoiler: boolean
    created_at: string
    user_id: string
    games: { slug: string; title: string } | null
    profiles: { username: string; suspended_until: string | null } | null
  } | null
}

type ActionRow = {
  id: number
  action: Enums<'moderation_action_type'>
  reason: string | null
  created_at: string
  moderator: { username: string } | null
  target: { username: string } | null
}

async function Moderation() {
  const profile = await getCurrentProfile()
  // La página solo existe para moderadores; RLS protege los datos igual.
  if (!isModerator(profile)) notFound()

  const supabase = await createClient()
  const [{ data: reports }, { data: actions }] = await Promise.all([
    supabase
      .from('reports')
      .select(
        `reason, details, comment_id,
         comments(id, body, status, is_spoiler, created_at, user_id, games(slug, title),
                  profiles!comments_user_id_fkey(username, suspended_until))`,
      )
      .eq('status', 'open')
      .order('created_at', { ascending: true })
      .overrideTypes<ReportRow[], { merge: false }>(),
    supabase
      .from('moderation_actions')
      .select(
        `id, action, reason, created_at,
         moderator:profiles!moderation_actions_moderator_id_fkey(username),
         target:profiles!moderation_actions_target_user_id_fkey(username)`,
      )
      .order('created_at', { ascending: false })
      .limit(20)
      .overrideTypes<ActionRow[], { merge: false }>(),
  ])

  // Un ítem por comentario con el conteo de motivos.
  const byComment = new Map<number, QueueItem>()
  for (const report of reports ?? []) {
    const c = report.comments
    if (!c || !c.profiles) continue
    const item =
      byComment.get(c.id) ??
      ({
        commentId: c.id,
        body: c.body,
        status: c.status,
        createdAt: c.created_at,
        authorId: c.user_id,
        authorUsername: c.profiles.username,
        authorSuspended: c.profiles.suspended_until != null && new Date(c.profiles.suspended_until) > new Date(),
        game: c.games,
        reasons: {},
        details: [],
        total: 0,
      } satisfies QueueItem)
    item.reasons[report.reason] = (item.reasons[report.reason] ?? 0) + 1
    if (report.details) item.details.push(report.details)
    item.total++
    byComment.set(c.id, item)
  }
  // Primero los ocultos automáticamente y los más reportados.
  const queue = [...byComment.values()].sort(
    (a, b) => Number(b.status === 'hidden') - Number(a.status === 'hidden') || b.total - a.total,
  )

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Cola de reportes <span className="text-muted-foreground">({queue.length})</span>
        </h2>
        {queue.length === 0 ? (
          <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
            No hay reportes pendientes. 🎉
          </p>
        ) : (
          <ModerationQueue items={queue} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Registro de acciones</h2>
        {(actions ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay acciones registradas.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {(actions ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline gap-x-1.5 p-3">
                <strong>@{a.moderator?.username ?? 'moderador eliminado'}</strong>
                <span>{ACTION_LABELS[a.action]}</span>
                <strong>@{a.target?.username ?? 'usuario eliminado'}</strong>
                {a.reason && <span className="text-muted-foreground">— {a.reason}</span>}
                <span className="ml-auto text-xs text-muted-foreground">
                  <RelativeTime date={a.created_at} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
