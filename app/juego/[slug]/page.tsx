import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CommentsSection } from '@/components/comments/comments-section'
import { FavoriteButton } from '@/components/game/favorite-button'
import { GameCarousel } from '@/components/game/game-carousel'
import { FriendsWhoFavorited } from '@/components/game/friends-who-favorited'
import { IgdbImage } from '@/components/game/igdb-image'
import { ScoreBadge } from '@/components/game/score-badge'
import { Trailer } from '@/components/game/trailer'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { hasIgdbCredentials } from '@/lib/catalog/igdb'
import { importGameBySlug } from '@/lib/catalog/sync'
import { type GameDetail, getGameBySlug, getRelatedGames, loadGameBySlug } from '@/lib/data/catalog'
import { formatDate } from '@/lib/format'
import { igdbImageUrl } from '@/lib/igdb/images'
import { platformLabel, sortPlatforms } from '@/lib/platforms'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ orden?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const game = await getGameBySlug(slug)
  if (!game) return { title: 'Juego no encontrado' }

  const description = (game.summary_es ?? game.summary_en ?? `Ficha de ${game.title} en ClimaxGame`).slice(0, 160)
  return {
    title: game.title,
    description,
    alternates: { canonical: `/juego/${game.slug}` },
    openGraph: {
      title: game.title,
      description,
      type: 'website',
      images: game.cover_image_id ? [igdbImageUrl(game.cover_image_id, 'cover_big')] : [],
    },
  }
}

export default function GamePage({ params, searchParams }: Props) {
  return (
    <Suspense fallback={<GameSkeleton />}>
      {Promise.all([params, searchParams]).then(([{ slug }, { orden }]) => (
        <GameView slug={slug} sort={orden === 'recientes' ? 'recent' : 'relevant'} />
      ))}
    </Suspense>
  )
}

// Si el juego no está en la base, se pide una vez a IGDB y se guarda (plan, sección 6).
async function findGame(slug: string) {
  const game = await getGameBySlug(slug)
  if (game) return game
  if (!hasIgdbCredentials() || !process.env.SUPABASE_SECRET_KEY) return null
  const imported = await importGameBySlug(createAdminClient(), slug).catch(() => false)
  return imported ? loadGameBySlug(slug) : null
}

async function GameView({ slug, sort }: { slug: string; sort: 'relevant' | 'recent' }) {
  const game = await findGame(slug)
  if (!game) notFound()

  const related = await getRelatedGames(
    game.id,
    game.genres.map((g) => g.id),
  )

  return (
    <article>
      <GameJsonLd game={game} />
      <GameHeader game={game} />

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Tabs defaultValue="resumen">
          <TabsList>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            {(game.trailers.length > 0 || game.screenshots.length > 0) && (
              <TabsTrigger value="multimedia">Multimedia</TabsTrigger>
            )}
            <TabsTrigger value="comunidad">Comunidad</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="pt-4">
            <Summary game={game} />
          </TabsContent>

          <TabsContent value="multimedia" className="space-y-6 pt-4">
            <Media game={game} />
          </TabsContent>

          <TabsContent value="comunidad" className="pt-4">
            <Suspense fallback={<Skeleton className="h-40 w-full" />}>
              <FriendsWhoFavorited gameId={game.id} />
            </Suspense>
            <Suspense fallback={<CommentsSkeleton />}>
              <CommentsSection gameId={game.id} gameSlug={game.slug} sort={sort} />
            </Suspense>
          </TabsContent>
        </Tabs>

        <div className="mt-12">
          <GameCarousel title="También te puede gustar" games={related} />
        </div>
      </div>
    </article>
  )
}

function GameHeader({ game }: { game: GameDetail }) {
  const platforms = sortPlatforms(game.platforms)
  return (
    <header className="relative overflow-hidden border-b">
      <div className="absolute inset-0">
        {game.background_image_id && (
          <IgdbImage imageId={game.background_image_id} size="1080p" alt="" priority sizes="100vw" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-5 px-4 pt-16 pb-6 md:flex-row md:items-end md:pt-32">
        <div className="relative aspect-[3/4] w-36 shrink-0 overflow-hidden rounded-lg border shadow-xl md:w-48">
          {game.cover_image_id && (
            <IgdbImage imageId={game.cover_image_id} size="cover_big" alt={`Portada de ${game.title}`} priority />
          )}
        </div>

        <div className="flex-1 space-y-3">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">{game.title}</h1>
          <p className="text-sm text-muted-foreground">
            {[game.developers[0]?.name, game.release_date && formatDate(game.release_date, 'UTC')]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {platforms.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Plataformas">
              {platforms.map((p) => (
                <li key={p.id} className="rounded-md border bg-background/60 px-2 py-0.5 text-xs">
                  {platformLabel(p)}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-4 md:items-end">
          <div className="flex gap-4">
            <Score label="Crítica" score={game.critic_score} />
            <Score label="Usuarios" score={game.user_score_external} />
          </div>
          <Suspense fallback={<Skeleton className="h-11 w-52" />}>
            <GameFavorite gameId={game.id} title={game.title} />
          </Suspense>
        </div>
      </div>
    </header>
  )
}

// El contador se lee fresco en cada visita; el resto de la ficha va cacheado.
async function GameFavorite({ gameId, title }: { gameId: number; title: string }) {
  const { data } = await createPublicClient().from('games').select('favorites_count').eq('id', gameId).single()
  const count = data?.favorites_count ?? 0
  // key: si el servidor trae un contador nuevo (router.refresh), el botón se reinicia con él.
  return <FavoriteButton key={count} gameId={gameId} title={title} variant="full" initialCount={count} />
}

function Score({ label, score }: { label: string; score: number | null }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {score == null ? (
        <span className="flex size-12 items-center justify-center rounded-md border text-sm text-muted-foreground">
          –
        </span>
      ) : (
        <ScoreBadge score={score} label={`Nota de ${label.toLowerCase()}`} size="lg" />
      )}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Summary({ game }: { game: GameDetail }) {
  const summary = game.summary_es ?? game.summary_en
  const facts = [
    ['Géneros', game.genres.map((g) => g.name).join(', ')],
    ['Desarrollador', game.developers.map((c) => c.name).join(', ')],
    ['Distribuidora', game.publishers.map((c) => c.name).join(', ')],
    ['Lanzamiento', game.release_date ? formatDate(game.release_date, 'UTC') : ''],
    ['Clasificación', game.age_rating ?? ''],
  ].filter(([, value]) => value)

  return (
    <div className="grid gap-8 md:grid-cols-[2fr_1fr]">
      <div>
        <h2 className="mb-2 text-lg font-semibold">Sinopsis</h2>
        {summary ? (
          <p lang={game.summary_es ? 'es' : 'en'} className="leading-relaxed whitespace-pre-line text-muted-foreground">
            {summary}
          </p>
        ) : (
          <p className="text-muted-foreground">Todavía no hay sinopsis para este juego.</p>
        )}
      </div>
      {/* Los campos vacíos se ocultan (J1). */}
      <dl className="space-y-3 text-sm">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Media({ game }: { game: GameDetail }) {
  return (
    <>
      {game.trailers.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Tráileres</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {game.trailers.map((videoId) => (
              <Trailer key={videoId} videoId={videoId} title={game.title} />
            ))}
          </div>
        </section>
      )}
      {game.screenshots.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Capturas</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {game.screenshots.map((imageId, index) => (
              <li key={imageId} className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                <a href={igdbImageUrl(imageId, '1080p')} target="_blank" rel="noreferrer">
                  <IgdbImage
                    imageId={imageId}
                    size="screenshot_med"
                    alt={`Captura ${index + 1} de ${game.title}`}
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

function GameJsonLd({ game }: { game: GameDetail }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: game.title,
    description: game.summary_es ?? game.summary_en ?? undefined,
    datePublished: game.release_date?.slice(0, 10),
    image: game.cover_image_id ? igdbImageUrl(game.cover_image_id, 'cover_big') : undefined,
    genre: game.genres.map((g) => g.name),
    gamePlatform: game.platforms.map((p) => p.name),
    author: game.developers.map((c) => ({ '@type': 'Organization', name: c.name })),
    publisher: game.publishers.map((c) => ({ '@type': 'Organization', name: c.name })),
    contentRating: game.age_rating ?? undefined,
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}

function GameSkeleton() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-32 pb-6">
      <div className="flex gap-5">
        <Skeleton className="aspect-[3/4] w-36 md:w-48" />
        <div className="flex-1 space-y-3 pt-16">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    </div>
  )
}

function CommentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  )
}
