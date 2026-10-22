import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

import { hasSupabaseEnv, getSupabaseEnv } from '@/lib/supabase/env'

// Rutas que requieren sesión. La autorización real vive en RLS;
// esto solo evita mostrar pantallas vacías a visitantes.
const PRIVATE_PREFIXES = ['/onboarding', '/actividad', '/ajustes', '/moderacion']

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  if (!hasSupabaseEnv()) return response

  const { url, publishableKey } = getSupabaseEnv()
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value))
      },
    },
  })

  // Debe llamarse antes de devolver la respuesta para que el refresco del token llegue a las cookies.
  const { data } = await supabase.auth.getClaims()

  const { pathname, search } = request.nextUrl
  const isPrivate = PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))

  if (isPrivate && !data?.claims) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/'
    loginUrl.search = `?auth=login&next=${encodeURIComponent(pathname + search)}`
    const redirect = NextResponse.redirect(loginUrl)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
