import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'
import { getSupabaseEnv } from './env'

// Cliente sin cookies para datos públicos del catálogo. Se puede usar dentro de
// funciones "use cache": no depende del request ni de la sesión.
export function createPublicClient() {
  const { url, publishableKey } = getSupabaseEnv()
  return createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
