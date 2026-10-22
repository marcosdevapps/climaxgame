import Link from 'next/link'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

// Lee la sesión del request: va dentro de <Suspense> para no bloquear la página cacheada.
export async function UserMenu() {
  const profile = hasSupabaseEnv() ? await getCurrentProfile() : null

  if (!profile) {
    return (
      <Button asChild size="sm">
        <Link href="?auth=login">Ingresar</Link>
      </Button>
    )
  }

  return (
    <Link href={`/u/${profile.username}`} aria-label="Tu perfil">
      <Avatar className="size-8">
        {profile.avatar_url && <AvatarImage src={profile.avatar_url} alt="" />}
        <AvatarFallback>{profile.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
    </Link>
  )
}

async function getCurrentProfile() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', data.claims.sub)
    .single()
  return profile
}
