import type { Metadata } from 'next'
import { Suspense } from 'react'

import { SearchView } from '@/components/search/search-view'
import { getPopularGames } from '@/lib/data/catalog'

export const metadata: Metadata = { title: 'Buscar juegos' }

export default async function SearchPage() {
  const suggestions = await getPopularGames(12)
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="sr-only">Buscar juegos</h1>
      <Suspense>
        <SearchView suggestions={suggestions} />
      </Suspense>
    </div>
  )
}
