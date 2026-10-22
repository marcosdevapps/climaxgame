import 'server-only'

import { createClient } from '@supabase/supabase-js'

import { getSupabaseEnv } from './env'

// Cliente con la secret key: ignora RLS. Solo para el sync del catálogo,
// el borrado de cuentas y tareas internas. Nunca importarlo desde el cliente.
export function createAdminClient() {
  const { url } = getSupabaseEnv()
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!secretKey) {
    throw new Error('Falta SUPABASE_SECRET_KEY (ver .env.example)')
  }

  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
