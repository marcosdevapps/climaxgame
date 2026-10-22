'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'

import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export type FollowStatus = 'none' | 'accepted' | 'pending'

// Tres estados (S1): Seguir · Siguiendo (al pasar el cursor, "Dejar de seguir") ·
// Solicitado, cuando el perfil es privado y falta la aprobación.
export function FollowButton({
  userId,
  username,
  initialStatus,
  size = 'sm',
  refreshOnChange = true,
  className,
}: {
  userId: string
  username: string
  initialStatus: FollowStatus
  size?: 'sm' | 'default'
  refreshOnChange?: boolean
  className?: string
}) {
  const router = useRouter()
  const { userId: me, requireAuth } = useSession()
  const [status, setStatus] = useState<FollowStatus>(initialStatus)
  const [busy, setBusy] = useState(false)

  if (me === userId) return null

  async function onClick() {
    if (!requireAuth({ type: 'follow', userId, username }) || !me) return
    setBusy(true)
    const supabase = createClient()
    const previous = status

    if (status === 'none') {
      setStatus('accepted')
      const { data, error } = await supabase
        .from('follows')
        .insert({ follower_id: me, following_id: userId })
        .select('status')
        .single()
      if (error) {
        setStatus(previous)
        toast.error(error.message)
      } else {
        setStatus(data.status)
        if (data.status === 'pending') toast.success(`Solicitud enviada a @${username}`)
      }
    } else {
      setStatus('none')
      const { error } = await supabase.from('follows').delete().eq('follower_id', me).eq('following_id', userId)
      if (error) {
        setStatus(previous)
        toast.error(error.message)
      }
    }

    setBusy(false)
    if (refreshOnChange) router.refresh()
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={busy}
      onClick={onClick}
      variant={status === 'none' ? 'default' : 'outline'}
      aria-pressed={status !== 'none'}
      className={cn('group/follow min-w-28', className)}
    >
      {status === 'none' && 'Seguir'}
      {status === 'pending' && 'Solicitado'}
      {status === 'accepted' && (
        <>
          <span className="group-hover/follow:hidden">Siguiendo</span>
          <span className="hidden text-destructive group-hover/follow:inline">Dejar de seguir</span>
        </>
      )}
    </Button>
  )
}
