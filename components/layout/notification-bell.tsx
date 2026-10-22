import { Bell } from 'lucide-react'
import Link from 'next/link'

import { getCurrentUserId } from '@/lib/data/session'
import { createClient } from '@/lib/supabase/server'

// Campana con el número de notificaciones sin leer (solo con sesión).
export async function NotificationBell() {
  const userId = await getCurrentUserId()
  if (!userId) return null

  const supabase = await createClient()
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('read_at', null)
  const unread = count ?? 0

  return (
    <Link
      href="/actividad?tab=notificaciones"
      aria-label={unread > 0 ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
      className="relative flex size-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
