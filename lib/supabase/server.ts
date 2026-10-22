import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { getSupabaseEnv } from './env'

// Cliente por request para Server Components, Server Actions y Route Handlers.
// Respeta RLS con la sesión del usuario.
export async function createClient() {
  const { url, publishableKey } = getSupabaseEnv()
  const cookieStore = await cookies()

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // proxy.ts ya refrescó la sesión en este request.
        }
      },
    },
  })
}
