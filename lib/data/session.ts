import 'server-only'

import { cache } from 'react'

import type { Tables } from '@/lib/supabase/database.types'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'

// Sesión del request actual. React cache() evita repetir la consulta
// cuando varios componentes la piden en el mismo render.

export const getCurrentUserId = cache(async (): Promise<string | null> => {
  if (!hasSupabaseEnv()) return null
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  return data?.claims.sub ?? null
})

export type CurrentProfile = Pick<
  Tables<'profiles'>,
  'id' | 'username' | 'display_name' | 'avatar_url' | 'role' | 'onboarding_completed_at' | 'is_private'
>

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const userId = await getCurrentUserId()
  if (!userId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, role, onboarding_completed_at, is_private')
    .eq('id', userId)
    .single()
  return data
})

export const isModerator = (profile: CurrentProfile | null) =>
  profile?.role === 'moderator' || profile?.role === 'admin'
