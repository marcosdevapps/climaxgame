import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

import { syncCatalog } from '@/lib/catalog/sync'
import { createAdminClient } from '@/lib/supabase/admin'

// Vercel Cron llama con "Authorization: Bearer $CRON_SECRET".
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const stats = await syncCatalog(createAdminClient())
    revalidateTag('home', 'max')
    return NextResponse.json({ ok: true, ...stats })
  } catch (error) {
    console.error('sync-catalog', error)
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}
