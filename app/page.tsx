import Link from 'next/link'
import { Suspense } from 'react'

import { FavoriteButton } from '@/components/game/favorite-button'
import { GameCarousel } from '@/components/game/game-carousel'
import { IgdbImage } from '@/components/game/igdb-image'
import { ScoreBadge } from '@/components/game/score-badge'
import { NetworkActivity } from '@/components/home/network-activity'
import { SignupBanner } from '@/components/home/signup-banner'
import { Button } from '@/components/ui/button'
import { getHomeSections, type HeroGame } from '@/lib/data/catalog'
import { formatDate } from '@/lib/format'

export default async function HomePage() {
  const { hero, trending, recent, upcoming } = await getHomeSections()

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {hero && <Hero game={hero} />}

      <GameCarousel title="Populares ahora" games={trending} href="/explorar/populares" />
      <GameCarousel title="Recién lanzados" games={recent} href="/explorar/recientes" />

      {/* El banner aparece después del segundo carrusel, no al cargar la página. */}
      <Suspense fallback={null}>
        <SignupBanner />
      </Suspense>

      <GameCarousel title="Próximamente" games={upcoming} href="/explorar/proximos" countdown />

      <Suspense fallback={null}>
        <NetworkActivity />
      </Suspense>
    </div>
  )
}

function Hero({ game }: { game: HeroGame }) {
  return (
    <section className="relative mb-10 overflow-hidden rounded-xl border">
      <div className="absolute inset-0">
        {game.background_image_id && (
          <IgdbImage imageId={game.background_image_id} size="1080p" alt="" priority sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20 md:bg-gradient-to-r" />
      </div>
      <div className="relative flex min-h-80 flex-col justify-end gap-3 p-5 md:min-h-96 md:max-w-xl md:p-8">
        <p className="text-xs font-semibold tracking-wider text-primary uppercase">El más jugado del momento</p>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{game.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <ScoreBadge score={game.critic_score} label="Nota de la crítica" />
          {game.release_date && <span>{formatDate(game.release_date, 'UTC')}</span>}
        </div>
        {game.summary_en && (
          <p lang="en" className="line-clamp-3 text-sm text-muted-foreground">
            {game.summary_en}
          </p>
        )}
        <div className="flex flex-wrap items-start gap-3 pt-1">
          <Button asChild size="lg" variant="outline">
            <Link href={`/juego/${game.slug}`}>Ver ficha</Link>
          </Button>
          <FavoriteButton gameId={game.id} title={game.title} variant="full" />
        </div>
      </div>
    </section>
  )
}
