import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { SettingsForm } from '@/components/settings/settings-form'
import { Skeleton } from '@/components/ui/skeleton'
import { getCurrentUserId } from '@/lib/data/session'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Ajustes', robots: { index: false } }

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Ajustes</h1>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Settings />
      </Suspense>
    </div>
  )
}

async function Settings() {
  const userId = await getCurrentUserId()
  if (!userId) redirect('/?auth=login&next=%2Fajustes')

  const supabase = await createClient()
  const [{ data: profile }, { data: blocks }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url, bio, is_private, platforms, username_changed_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('blocks')
      .select('blocked_id, profiles!blocks_blocked_id_fkey(username, avatar_url)')
      .eq('blocker_id', userId)
      .order('created_at', { ascending: false }),
  ])
  if (!profile) redirect('/')

  const blocked = (blocks ?? []).flatMap((b) =>
    b.profiles ? [{ id: b.blocked_id, username: b.profiles.username, avatarUrl: b.profiles.avatar_url }] : [],
  )

  return <SettingsForm profile={profile} blocked={blocked} />
}
