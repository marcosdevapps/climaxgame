import { Gamepad2 } from 'lucide-react'
import Link from 'next/link'

import type { GameCardData } from '@/lib/data/catalog'
import { formatDate } from '@/lib/format'

import { FavoriteButton } from './favorite-button'
import { IgdbImage } from './igdb-image'
import { ReleaseCountdown } from './release-countdown'
import { ScoreBadge } from './score-badge'

// Componente central del sitio: se reutiliza en home, búsqueda, perfiles y feed.
// Las fechas de lanzamiento son días calendario: se formatean en UTC.
export function GameCard({ game, countdown = false }: { game: GameCardData; countdown?: boolean }) {
  return (
    <div className="group relative">
      <Link href={`/juego/${game.slug}`} className="block rounded-lg focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
          {game.cover_image_id ? (
            <IgdbImage
              imageId={game.cover_image_id}
              size="cover_big"
              alt={`Portada de ${game.title}`}
              sizes="(min-width: 768px) 160px, 128px"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <Gamepad2 className="size-8" aria-hidden />
            </div>
          )}
          <ScoreBadge score={game.critic_score} label="Nota de la crítica" className="absolute bottom-2 left-2" />
        </div>
        <h3 className="mt-2 line-clamp-2 text-sm leading-snug font-medium">{game.title}</h3>
        <p className="text-xs text-muted-foreground">
          {game.release_date ? (
            countdown ? (
              <ReleaseCountdown date={game.release_date} />
            ) : (
              formatDate(game.release_date, 'UTC')
            )
          ) : (
            'Sin fecha'
          )}
        </p>
      </Link>
      <FavoriteButton gameId={game.id} title={game.title} className="absolute top-2 right-2" />
    </div>
  )
}
