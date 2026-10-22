import { type NextRequest, NextResponse } from 'next/server'

import { getCurrentProfile } from '@/lib/data/session'

// Atajo de la barra inferior: lleva al perfil público propio o abre el registro.
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile()
  const target = profile ? `/u/${profile.username}` : '/?auth=login&next=%2Fperfil'
  return NextResponse.redirect(new URL(target, request.url))
}
