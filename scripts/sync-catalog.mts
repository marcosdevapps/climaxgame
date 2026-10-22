// Sincroniza el catálogo desde IGDB.
//   pnpm catalog:sync          → sync normal (populares, recientes, próximos)
//   pnpm catalog:sync --seed   → carga inicial (+ más esperados y clásicos)

import { createClient } from '@supabase/supabase-js'

import { syncCatalog } from '../lib/catalog/sync'
import type { Database } from '../lib/supabase/database.types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!url || !secretKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local')
  process.exit(1)
}

const db = createClient<Database>(url, secretKey, { auth: { persistSession: false } })
const seed = process.argv.includes('--seed')

const started = Date.now()
console.log(seed ? 'Carga inicial del catálogo…' : 'Sincronizando catálogo…')
const stats = await syncCatalog(db, { seed })
console.log(`Listo en ${((Date.now() - started) / 1000).toFixed(1)} s`, stats)
