'use client'

import { Loader2, Search } from 'lucide-react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { GameGrid } from '@/components/game/game-carousel'
import { Input } from '@/components/ui/input'
import type { GameCardData } from '@/lib/data/catalog'
import { createClient } from '@/lib/supabase/client'

const MIN_CHARS = 2
const DEBOUNCE_MS = 250

// Resultados mientras se escribe, desde 2 caracteres y tolerando errores (D2).
export function SearchView({ suggestions }: { suggestions: GameCardData[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [results, setResults] = useState<GameCardData[] | null>(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    const term = query.trim()
    const id = ++requestId.current

    const timer = setTimeout(async () => {
      router.replace(term ? `${pathname}?q=${encodeURIComponent(term)}` : pathname, { scroll: false })
      if (term.length < MIN_CHARS) {
        setResults(null)
        return
      }
      setLoading(true)
      const { data } = await createClient().rpc('search_games', { query: term, max_results: 30 })
      // Descarta respuestas viejas si el usuario siguió escribiendo.
      if (id !== requestId.current) return
      setResults(data ?? [])
      setLoading(false)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query, pathname, router])

  const term = query.trim()

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          type="search"
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Busca un juego por nombre"
          aria-label="Buscar juegos"
          className="h-12 pl-10 text-base"
        />
        {loading && (
          <Loader2 className="absolute top-1/2 right-3 size-5 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {term.length < MIN_CHARS ? (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Populares ahora</h2>
          <GameGrid games={suggestions} />
        </section>
      ) : results && results.length === 0 && !loading ? (
        <section className="space-y-6">
          <div className="rounded-lg border p-6 text-center">
            <p className="font-medium">No encontramos juegos para “{term}”</p>
            <p className="text-sm text-muted-foreground">
              Revisa cómo está escrito o prueba con otra palabra del título.
            </p>
          </div>
          <h2 className="text-lg font-semibold">Quizás te interese</h2>
          <GameGrid games={suggestions} />
        </section>
      ) : (
        results && (
          <section aria-live="polite">
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
            </p>
            <GameGrid games={results} />
          </section>
        )
      )}
    </div>
  )
}
