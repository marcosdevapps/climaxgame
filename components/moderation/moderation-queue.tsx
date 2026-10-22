'use client'

import { EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { RelativeTime } from '@/components/relative-time'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { REPORT_REASON_LABELS } from '@/lib/labels'
import type { Enums } from '@/lib/supabase/database.types'
import { createClient } from '@/lib/supabase/client'

export type QueueItem = {
  commentId: number
  body: string
  status: Enums<'comment_status'>
  createdAt: string
  authorId: string
  authorUsername: string
  authorSuspended: boolean
  game: { slug: string; title: string } | null
  reasons: Partial<Record<Enums<'report_reason'>, number>>
  details: string[]
  total: number
}

// Acciones de M1: restaurar, borrar (avisa al autor con el motivo) y suspender
// 7 días o de forma permanente. Todo queda en el registro de moderación.
export function ModerationQueue({ items }: { items: QueueItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.commentId}>
          <QueueCard item={item} />
        </li>
      ))}
    </ul>
  )
}

function QueueCard({ item }: { item: QueueItem }) {
  const router = useRouter()
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const supabase = createClient()

  async function decide(decision: 'restore' | 'delete') {
    setBusy(true)
    const { error } = await supabase.rpc('moderate_comment', {
      target_comment_id: item.commentId,
      decision,
      reason: reason || (decision === 'delete' ? 'Incumple las reglas de la comunidad' : undefined),
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success(decision === 'restore' ? 'Comentario restaurado' : 'Comentario borrado y autor notificado')
    router.refresh()
  }

  async function suspend(days: number | null) {
    const label = days ? `${days} días` : 'de forma permanente'
    if (!window.confirm(`¿Suspender a @${item.authorUsername} ${label}?`)) return
    setBusy(true)
    const { error } = await supabase.rpc('suspend_user', {
      target_user_id: item.authorId,
      // null = permanente (la función SQL lo interpreta así).
      days: days as number,
      reason: reason || undefined,
    })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success(`@${item.authorUsername} suspendido ${label}`)
    router.refresh()
  }

  return (
    <article className="space-y-3 rounded-lg border p-4">
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/u/${item.authorUsername}`} className="font-medium hover:underline">
          @{item.authorUsername}
        </Link>
        {item.game && (
          <Link href={`/juego/${item.game.slug}`} className="text-primary hover:underline">
            en {item.game.title}
          </Link>
        )}
        <span className="text-muted-foreground">
          · <RelativeTime date={item.createdAt} />
        </span>
        {item.status === 'hidden' && (
          <Badge variant="secondary" className="gap-1">
            <EyeOff className="size-3" /> Oculto automáticamente
          </Badge>
        )}
        {item.authorSuspended && <Badge variant="destructive">Autor suspendido</Badge>}
      </header>

      <blockquote className="border-l-2 pl-3 text-sm whitespace-pre-line">{item.body}</blockquote>

      <div className="flex flex-wrap gap-1.5">
        {(Object.entries(item.reasons) as [Enums<'report_reason'>, number][]).map(([key, count]) => (
          <Badge key={key} variant="outline">
            {REPORT_REASON_LABELS[key]} × {count}
          </Badge>
        ))}
      </div>
      {item.details.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-muted-foreground">
          {item.details.map((d, i) => (
            <li key={i}>{d}</li>
          ))}
        </ul>
      )}

      <Input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (se le muestra al autor si borras)"
        className="h-9"
      />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy} onClick={() => decide('restore')}>
          Restaurar
        </Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => decide('delete')}>
          Borrar
        </Button>
        <Button size="sm" variant="ghost" disabled={busy || item.authorSuspended} onClick={() => suspend(7)}>
          Suspender 7 días
        </Button>
        <Button size="sm" variant="ghost" disabled={busy || item.authorSuspended} onClick={() => suspend(null)}>
          Suspender permanente
        </Button>
      </div>
    </article>
  )
}
