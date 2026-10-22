import 'server-only'

import { cacheLife, cacheTag } from 'next/cache'

import { createPublicClient } from '@/lib/supabase/public'

// Datos públicos del catálogo, cacheados con "use cache" (plan, sección 3.2).
// El sync invalida 'home' y 'game:<slug>' con revalidateTag.

const CARD_FIELDS = 'id, slug, title, release_date, cover_image_id, critic_score'

export type GameCardData = {
  id: number
  slug: string
  title: string
  release_date: string | null
  cover_image_id: string | null
  critic_score: number | null
}

export type HeroGame = GameCardData & { background_image_id: string | null; summary_en: string | null }

export const SECTIONS = {
  populares: 'Populares ahora',
  recientes: 'Recién lanzados',
  proximos: 'Próximamente',
} as const
export type SectionKey = keyof typeof SECTIONS

const DAY_MS = 86_400_000

async function trendingIds(limit: number, offset = 0) {
  const db = createPublicClient()
  const { data } = await db
    .from('trending_games')
    .select('game_id')
    .order('score', { ascending: false })
    .range(offset, offset + limit - 1)
  return (data ?? []).map((row) => row.game_id).filter((id): id is number => id != null)
}

async function gamesInOrder<T extends { id: number }>(ids: number[], fields: string) {
  if (ids.length === 0) return []
  const db = createPublicClient()
  const { data } = await db.from('games').select(fields).in('id', ids).returns<T[]>()
  const byId = new Map((data ?? []).map((game) => [game.id, game]))
  return ids.map((id) => byId.get(id)).filter((game): game is T => game != null)
}

async function sectionGames(section: SectionKey, limit: number, offset = 0): Promise<GameCardData[]> {
  const db = createPublicClient()
  const now = new Date()

  if (section === 'populares') {
    return gamesInOrder<GameCardData>(await trendingIds(limit, offset), CARD_FIELDS)
  }
  if (section === 'recientes') {
    const { data } = await db
      .from('games')
      .select(CARD_FIELDS)
      .gte('release_date', new Date(now.getTime() - 30 * DAY_MS).toISOString())
      .lte('release_date', now.toISOString())
      .not('cover_image_id', 'is', null)
      .order('release_date', { ascending: false })
      .range(offset, offset + limit - 1)
    return data ?? []
  }
  const { data } = await db
    .from('games')
    .select(CARD_FIELDS)
    .gt('release_date', now.toISOString())
    .not('cover_image_id', 'is', null)
    .order('release_date', { ascending: true })
    .range(offset, offset + limit - 1)
  return data ?? []
}

export async function getHomeSections() {
  'use cache'
  cacheLife('hours')
  cacheTag('home')

  const [trending, recent, upcoming] = await Promise.all([
    sectionGames('populares', 20),
    sectionGames('recientes', 20),
    sectionGames('proximos', 20),
  ])

  // Hero: el juego más popular que tenga arte de fondo.
  const heroCandidates = await gamesInOrder<HeroGame>(
    trending.slice(0, 10).map((g) => g.id),
    `${CARD_FIELDS}, background_image_id, summary_en`,
  )
  const hero = heroCandidates.find((g) => g.background_image_id) ?? null

  return { hero, trending, recent, upcoming }
}

export const SECTION_PAGE_SIZE = 24

export async function getSectionPage(section: SectionKey, page: number) {
  'use cache'
  cacheLife('hours')
  cacheTag('home')
  // Se pide uno de más para saber si hay página siguiente.
  const games = await sectionGames(section, SECTION_PAGE_SIZE + 1, (page - 1) * SECTION_PAGE_SIZE)
  return { games: games.slice(0, SECTION_PAGE_SIZE), hasNext: games.length > SECTION_PAGE_SIZE }
}

const GAME_DETAIL_FIELDS = `
  id, igdb_id, slug, title, summary_en, summary_es, release_date, cover_image_id, background_image_id,
  critic_score, user_score_external, age_rating,
  game_platforms(platforms(id, name, slug)),
  game_genres(genres(id, name, slug)),
  game_companies(role, companies(id, name, slug)),
  game_media(type, external_id, position)
`

type Named = { id: number; name: string; slug: string }
type GameDetailRow = Omit<
  GameDetail,
  'platforms' | 'genres' | 'developers' | 'publishers' | 'screenshots' | 'trailers'
> & {
  game_platforms: { platforms: Named | null }[]
  game_genres: { genres: Named | null }[]
  game_companies: { role: 'developer' | 'publisher'; companies: Named | null }[]
  game_media: { type: 'screenshot' | 'trailer'; external_id: string; position: number }[]
}

export type GameDetail = {
  id: number
  igdb_id: number
  slug: string
  title: string
  summary_en: string | null
  summary_es: string | null
  release_date: string | null
  cover_image_id: string | null
  background_image_id: string | null
  critic_score: number | null
  user_score_external: number | null
  age_rating: string | null
  platforms: Named[]
  genres: Named[]
  developers: Named[]
  publishers: Named[]
  screenshots: string[]
  trailers: string[]
}

// Sin caché: se usa tras importar un juego bajo demanda.
export async function loadGameBySlug(slug: string): Promise<GameDetail | null> {
  const db = createPublicClient()
  const { data } = await db
    .from('games')
    .select(GAME_DETAIL_FIELDS)
    .eq('slug', slug)
    .maybeSingle()
    .overrideTypes<GameDetailRow, { merge: false }>()
  if (!data) return null

  const named = (items: (Named | null)[]) => items.filter((item): item is Named => item != null)
  const media = (type: 'screenshot' | 'trailer') =>
    data.game_media
      .filter((m) => m.type === type)
      .sort((a, b) => a.position - b.position)
      .map((m) => m.external_id)

  const { game_platforms, game_genres, game_companies, game_media: _media, ...game } = data
  void _media
  return {
    ...game,
    platforms: named(game_platforms.map((p) => p.platforms)),
    genres: named(game_genres.map((g) => g.genres)),
    developers: named(game_companies.filter((c) => c.role === 'developer').map((c) => c.companies)),
    publishers: named(game_companies.filter((c) => c.role === 'publisher').map((c) => c.companies)),
    screenshots: media('screenshot'),
    trailers: media('trailer'),
  }
}

export async function getGameBySlug(slug: string) {
  'use cache'
  cacheTag(`game:${slug}`)
  const game = await loadGameBySlug(slug)
  // Un juego inexistente puede importarse de IGDB en cualquier momento: caché corta.
  if (game) cacheLife('hours')
  else cacheLife('minutes')
  return game
}

export async function getRelatedGames(gameId: number, genreIds: number[]) {
  'use cache'
  cacheLife('hours')
  cacheTag('home')
  if (genreIds.length === 0) return []

  // El filtro !inner deja en game_genres solo los géneros compartidos: se ordena
  // por cuántos comparte y, a igualdad, por la nota de la crítica.
  const db = createPublicClient()
  const { data } = await db
    .from('games')
    .select(`${CARD_FIELDS}, game_genres!inner(genre_id)`)
    .in('game_genres.genre_id', genreIds)
    .neq('id', gameId)
    .not('cover_image_id', 'is', null)
    .not('critic_score', 'is', null)
    .order('critic_score', { ascending: false })
    .limit(300)

  return (data ?? [])
    .map(({ game_genres, ...game }) => ({ game, shared: game_genres.length }))
    .sort((a, b) => b.shared - a.shared || (b.game.critic_score ?? 0) - (a.game.critic_score ?? 0))
    .slice(0, 12)
    .map(({ game }) => game)
}

// Juegos para el onboarding y las sugerencias de "sin resultados".
export async function getPopularGames(limit: number) {
  'use cache'
  cacheLife('hours')
  cacheTag('home')
  return sectionGames('populares', limit)
}

export async function getAllGameSlugs() {
  'use cache'
  cacheLife('days')
  cacheTag('home')
  const db = createPublicClient()
  const { data } = await db.from('games').select('slug, synced_at').order('id').limit(5000)
  return data ?? []
}
