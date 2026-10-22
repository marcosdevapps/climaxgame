import { type NextRequest, NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/safe-redirect'
import { createClient } from '@/lib/supabase/server'

// Destino de Google OAuth y de los enlaces de verificación / recuperación (flujo PKCE).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth=error`)
}
