import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { OnboardingFlow } from '@/components/onboarding/onboarding-flow'
import { Skeleton } from '@/components/ui/skeleton'
import { getPopularGames } from '@/lib/data/catalog'
import { getCurrentProfile } from '@/lib/data/session'
import { getSuggestedUsers } from '@/lib/data/social'
import { safeNextPath } from '@/lib/safe-redirect'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Arma tu perfil', robots: { index: false } }

type Props = { searchParams: Promise<{ next?: string }> }

export default function OnboardingPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {searchParams.then(({ next }) => (
          <Onboarding next={safeNextPath(next)} />
        ))}
      </Suspense>
    </div>
  )
}

async function Onboarding({ next }: { next: string }) {
  const profile = await getCurrentProfile()
  if (!profile) redirect('/?auth=login&next=%2Fonboarding')

  const supabase = await createClient()
  const [{ data: details }, games, suggestions] = await Promise.all([
    supabase.from('profiles').select('platforms').eq('id', profile.id).single(),
    getPopularGames(12),
    getSuggestedUsers(6),
  ])

  return (
    <OnboardingFlow
      userId={profile.id}
      currentUsername={profile.username}
      currentPlatforms={details?.platforms ?? []}
      games={games}
      suggestions={suggestions}
      next={next === '/onboarding' ? '/' : next}
    />
  )
}
