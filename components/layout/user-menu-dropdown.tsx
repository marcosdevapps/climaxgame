'use client'

import { Activity, LogOut, Settings, Shield, User } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { useSession } from '@/components/providers/session-provider'
import { UserAvatar } from '@/components/profile/user-avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'

export function LoginButton() {
  const { openAuth } = useSession()
  return (
    <Button size="sm" onClick={() => openAuth('login')}>
      Ingresar
    </Button>
  )
}

export function UserMenuDropdown({
  username,
  displayName,
  avatarUrl,
  moderator,
}: {
  username: string
  displayName: string
  avatarUrl: string | null
  moderator: boolean
}) {
  const router = useRouter()

  async function signOut() {
    await createClient().auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:ring-2 focus-visible:ring-ring" aria-label="Tu cuenta">
        <UserAvatar username={username} avatarUrl={avatarUrl} className="size-8" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-medium">{displayName}</p>
          <p className="truncate text-xs text-muted-foreground">@{username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/u/${username}`}>
            <User /> Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/actividad">
            <Activity /> Actividad
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/ajustes">
            <Settings /> Ajustes
          </Link>
        </DropdownMenuItem>
        {moderator && (
          <DropdownMenuItem asChild>
            <Link href="/moderacion">
              <Shield /> Moderación
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut}>
          <LogOut /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
