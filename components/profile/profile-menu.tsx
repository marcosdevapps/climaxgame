'use client'

import { Ban, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

// Bloquear: el bloqueado no puede ver tu perfil ni tus comentarios, y se cortan
// los follows en ambas direcciones (lo hace la base).
export function ProfileMenu({ userId, username, blocked }: { userId: string; username: string; blocked: boolean }) {
  const router = useRouter()
  const { userId: me, requireAuth } = useSession()

  async function toggleBlock() {
    if (!requireAuth() || !me) return
    if (!blocked && !window.confirm(`¿Bloquear a @${username}? No podrá ver tu perfil ni tus comentarios.`)) return
    const supabase = createClient()
    const { error } = blocked
      ? await supabase.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', userId)
      : await supabase.from('blocks').insert({ blocker_id: me, blocked_id: userId })
    if (error) return toast.error(error.message)
    toast.success(blocked ? `Desbloqueaste a @${username}` : `Bloqueaste a @${username}`)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Más opciones">
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={toggleBlock} className={blocked ? undefined : 'text-destructive'}>
          <Ban /> {blocked ? 'Desbloquear' : 'Bloquear'} a @{username}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
