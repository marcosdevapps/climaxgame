import { type NextRequest, NextResponse } from 'next/server'

import { safeNextPath } from '@/lib/safe-redirect'
import { createClient } from '@/lib/supabase/server'

// Destino de Google OAuth y de los enlaces de verificación / recuperación (flujo PKCE).
// Si es la primera vez, pasa por el onboarding antes de volver a donde estaba.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = safeNextPath(searchParams.get('next'))

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed_at')
        .eq('id', data.user.id)
        .single()
      const destination =
        profile && !profile.onboarding_completed_at && !next.startsWith('/onboarding')
          ? `/onboarding?next=${encodeURIComponent(next)}`
          : next
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  return NextResponse.redirect(`${origin}/?auth=error`)
}
