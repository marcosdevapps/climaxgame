// Las variables NEXT_PUBLIC_* se referencian de forma literal para que Next.js las incluya en el cliente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

export function hasSupabaseEnv() {
  return Boolean(url && publishableKey)
}

export function getSupabaseEnv() {
  if (!url || !publishableKey) {
    throw new Error(
      'Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example a .env.local y complétalas.',
    )
  }
  return { url, publishableKey }
}
