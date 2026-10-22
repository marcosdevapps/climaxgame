'use client'

import { Heart, ShieldAlert, UserPlus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { FollowButton } from '@/components/profile/follow-button'
import { UserAvatar } from '@/components/profile/user-avatar'
import { useSession } from '@/components/providers/session-provider'
import { RelativeTime } from '@/components/relative-time'
import { Button } from '@/components/ui/button'
import type { NotificationView } from '@/lib/data/notifications'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function NotificationList({ notifications }: { notifications: NotificationView[] }) {
  const router = useRouter()
  const { userId } = useSession()
  const hasUnread = notifications.some((n) => !n.read)

  // Al abrir la lista se marcan como leídas (y se apaga el contador de la campana).
  useEffect(() => {
    if (!userId || !hasUnread) return
    createClient()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
      .then(() => router.refresh())
  }, [userId, hasUnread, router])

  if (notifications.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No tienes notificaciones.</p>
    )
  }

  return (
    <ul className="divide-y rounded-lg border">
      {notifications.map((n) => (
        <li key={n.id} className={cn('flex items-start gap-3 p-3', !n.read && 'bg-primary/5')}>
          <NotificationItem notification={n} />
        </li>
      ))}
    </ul>
  )
}

function NotificationItem({ notification: n }: { notification: NotificationView }) {
  const router = useRouter()
  const { userId } = useSession()
  const [resolved, setResolved] = useState<'accepted' | 'rejected' | null>(null)

  async function answerRequest(accept: boolean) {
    if (!n.actor || !userId) return
    const supabase = createClient()
    const { error } = accept
      ? await supabase
          .from('follows')
          .update({ status: 'accepted' })
          .eq('follower_id', n.actor.id)
          .eq('following_id', userId)
      : await supabase.from('follows').delete().eq('follower_id', n.actor.id).eq('following_id', userId)
    if (error) return toast.error(error.message)
    setResolved(accept ? 'accepted' : 'rejected')
    router.refresh()
  }

  const actorLink = n.actor && (
    <Link href={`/u/${n.actor.username}`} className="font-medium hover:underline">
      {n.actor.displayName ?? n.actor.username}
    </Link>
  )
  const gameLink = n.game && (
    <Link href={`/juego/${n.game.slug}`} className="font-medium hover:underline">
      {n.game.title}
    </Link>
  )

  if (n.type === 'comment_moderated') {
    return (
      <>
        <ShieldAlert className="mt-0.5 size-8 shrink-0 rounded-full bg-destructive/15 p-1.5 text-destructive" />
        <div className="flex-1 text-sm">
          <p>
            Moderación borró tu comentario{gameLink ? <> en {gameLink}</> : null}.
            {n.reason && <span className="text-muted-foreground"> Motivo: {n.reason}</span>}
          </p>
          <Time date={n.createdAt} />
        </div>
      </>
    )
  }

  return (
    <>
      {n.actor ? (
        <Link href={`/u/${n.actor.username}`} className="shrink-0">
          <UserAvatar username={n.actor.username} avatarUrl={n.actor.avatarUrl} className="size-9" />
        </Link>
      ) : (
        <UserPlus className="size-9 shrink-0 p-2 text-muted-foreground" />
      )}
      <div className="min-w-0 flex-1 text-sm">
        {n.type === 'new_follower' && <p>{actorLink} empezó a seguirte.</p>}
        {n.type === 'follow_request' && <p>{actorLink} quiere seguirte.</p>}
        {n.type === 'comment_liked' && (
          <p>
            <Heart className="mb-0.5 inline size-3.5 fill-red-400 text-red-400" /> A {actorLink} le gustó tu comentario
            {gameLink ? <> en {gameLink}</> : null}.
          </p>
        )}
        <Time date={n.createdAt} />
      </div>

      {n.type === 'new_follower' && n.actor && n.followBack === 'none' && (
        <FollowButton userId={n.actor.id} username={n.actor.username} initialStatus="none" refreshOnChange={false} />
      )}
      {n.type === 'follow_request' &&
        n.actor &&
        (resolved ? (
          <span className="text-xs text-muted-foreground">{resolved === 'accepted' ? 'Aceptada' : 'Rechazada'}</span>
        ) : n.requestPending ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => answerRequest(true)}>
              Aceptar
            </Button>
            <Button size="sm" variant="outline" onClick={() => answerRequest(false)}>
              Rechazar
            </Button>
          </div>
        ) : null)}
    </>
  )
}

function Time({ date }: { date: string }) {
  return (
    <p className="mt-0.5 text-xs text-muted-foreground">
      <RelativeTime date={date} />
    </p>
  )
}
