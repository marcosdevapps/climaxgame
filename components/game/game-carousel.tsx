import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

import type { GameCardData } from '@/lib/data/catalog'

import { GameCard } from './game-card'

export function GameCarousel({
  title,
  games,
  href,
  countdown,
}: {
  title: string
  games: GameCardData[]
  href?: string
  countdown?: boolean
}) {
  if (games.length === 0) return null
  const headingId = `carrusel-${title.toLowerCase().replace(/\W+/g, '-')}`

  return (
    <section aria-labelledby={headingId} className="mb-10">
      <div className="mb-3 flex items-end justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold md:text-xl">
          {title}
        </h2>
        {href && (
          <Link href={href} className="flex items-center text-sm text-muted-foreground hover:text-foreground">
            Ver todos
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        )}
      </div>
      <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 [scrollbar-width:none] gap-3 overflow-x-auto px-4 pb-2">
        {games.map((game) => (
          <li key={game.id} className="w-32 shrink-0 snap-start md:w-40">
            <GameCard game={game} countdown={countdown} />
          </li>
        ))}
      </ul>
    </section>
  )
}

export function GameGrid({ games, countdown }: { games: GameCardData[]; countdown?: boolean }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {games.map((game) => (
        <li key={game.id}>
          <GameCard game={game} countdown={countdown} />
        </li>
      ))}
    </ul>
  )
}
