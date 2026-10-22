// Sincronización del catálogo: IGDB → Supabase (plan, sección 6).
// Las páginas leen siempre de la base propia; IGDB solo se consulta aquí.

import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database, TablesInsert } from '../supabase/database.types'
import { igdbQuery } from './igdb'

type Db = SupabaseClient<Database>

type Named = { id: number; name: string; slug: string }

export type IgdbGame = {
  id: number
  name: string
  slug: string
  summary?: string
  first_release_date?: number
  cover?: { image_id: string }
  artworks?: { image_id: string }[]
  screenshots?: { image_id: string }[]
  videos?: { video_id: string }[]
  platforms?: Named[]
  genres?: Named[]
  involved_companies?: { company?: Named; developer: boolean; publisher: boolean }[]
  aggregated_rating?: number
  rating?: number
  age_ratings?: { organization?: number; rating_category?: { rating?: string } }[]
}

const GAME_FIELDS = [
  'name',
  'slug',
  'summary',
  'first_release_date',
  'cover.image_id',
  'artworks.image_id',
  'screenshots.image_id',
  'videos.video_id',
  'platforms.name',
  'platforms.slug',
  'genres.name',
  'genres.slug',
  'involved_companies.company.name',
  'involved_companies.company.slug',
  'involved_companies.developer',
  'involved_companies.publisher',
  'aggregated_rating',
  'rating',
  'age_ratings.organization',
  'age_ratings.rating_category.rating',
].join(',')

// Juego principal, remake, remaster y edición expandida (sin DLC, mods ni bundles).
const MAIN_GAME_TYPES = 'game_type = (0,8,9,10)'
const MAX_SCREENSHOTS = 8
const MAX_TRAILERS = 3

// Organizaciones de clasificación por edad en IGDB.
const ESRB = 1
const PEGI = 2
// Tipos de popularidad de IGDB: 3 = "Playing" (gente jugando ahora), 2 = "Want to Play".
const POPULARITY_PLAYING = 3
const POPULARITY_WANT_TO_PLAY = 2

const DAY = 86_400

// ESRB es la más usada en la región; si no está, PEGI.
export function ageRating(game: IgdbGame): string | null {
  for (const [organization, label] of [
    [ESRB, 'ESRB'],
    [PEGI, 'PEGI'],
  ] as const) {
    const rating = game.age_ratings?.find((r) => r.organization === organization)?.rating_category?.rating
    if (rating) return `${label} ${rating}`
  }
  return null
}

const roundScore = (score?: number) => (score == null ? null : Math.round(score * 100) / 100)

// La popularidad no se incluye: la fija cada sync solo para los juegos populares.
export function mapGame(game: IgdbGame, syncedAt = new Date().toISOString()): TablesInsert<'games'> {
  return {
    igdb_id: game.id,
    slug: game.slug,
    title: game.name,
    summary_en: game.summary ?? null,
    release_date: game.first_release_date ? new Date(game.first_release_date * 1000).toISOString() : null,
    cover_image_id: game.cover?.image_id ?? null,
    background_image_id: game.artworks?.[0]?.image_id ?? game.screenshots?.[0]?.image_id ?? null,
    critic_score: roundScore(game.aggregated_rating),
    user_score_external: roundScore(game.rating),
    age_rating: ageRating(game),
    synced_at: syncedAt,
  }
}

function uniqueBy<T>(items: T[], key: (item: T) => number | string) {
  return [...new Map(items.map((item) => [key(item), item])).values()]
}

function chunk<T>(items: T[], size: number) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size))
}

async function check<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>, what: string) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data
}

// ─── Consultas a IGDB ───────────────────────────────────────

async function gamesByIds(ids: number[]) {
  const games: IgdbGame[] = []
  for (const group of chunk(ids, 400)) {
    games.push(
      ...(await igdbQuery<IgdbGame>(
        'games',
        `fields ${GAME_FIELDS}; where id = (${group.join(',')}) & ${MAIN_GAME_TYPES}; limit 500;`,
      )),
    )
  }
  return games
}

async function popularityOf(type: number, limit: number) {
  const rows = await igdbQuery<{ game_id: number; value: number }>(
    'popularity_primitives',
    `fields game_id,value; where popularity_type = ${type}; sort value desc; limit ${limit};`,
  )
  return new Map(rows.map((row) => [row.game_id, row.value]))
}

function recentGames(now: number) {
  return igdbQuery<IgdbGame>(
    'games',
    `fields ${GAME_FIELDS}; where first_release_date >= ${now - 30 * DAY} & first_release_date <= ${now}
     & ${MAIN_GAME_TYPES} & cover != null & (hypes >= 3 | total_rating_count >= 2);
     sort first_release_date desc; limit 150;`,
  )
}

function upcomingGames(now: number) {
  return igdbQuery<IgdbGame>(
    'games',
    `fields ${GAME_FIELDS}; where first_release_date > ${now} & first_release_date <= ${now + 180 * DAY}
     & ${MAIN_GAME_TYPES} & cover != null & hypes >= 5;
     sort first_release_date asc; limit 150;`,
  )
}

// Clásicos muy valorados: solo para la carga inicial (búsqueda y onboarding con contenido).
function acclaimedGames() {
  return igdbQuery<IgdbGame>(
    'games',
    `fields ${GAME_FIELDS}; where aggregated_rating_count >= 8 & aggregated_rating >= 80
     & ${MAIN_GAME_TYPES} & cover != null;
     sort aggregated_rating_count desc; limit 300;`,
  )
}

// ─── Escritura en Supabase ──────────────────────────────────

export async function upsertGames(db: Db, games: IgdbGame[]) {
  if (games.length === 0) return new Map<number, number>()
  const syncedAt = new Date().toISOString()

  const platforms = uniqueBy(
    games.flatMap((g) => g.platforms ?? []),
    (p) => p.id,
  )
  const genres = uniqueBy(
    games.flatMap((g) => g.genres ?? []),
    (g) => g.id,
  )
  const companies = uniqueBy(
    games.flatMap((g) => (g.involved_companies ?? []).flatMap((ic) => (ic.company ? [ic.company] : []))),
    (c) => c.id,
  )

  const toNamed = ({ id, name, slug }: Named) => ({ id, name, slug })
  for (const group of chunk(platforms.map(toNamed), 500)) {
    await check(db.from('platforms').upsert(group, { onConflict: 'id' }), 'platforms')
  }
  for (const group of chunk(genres.map(toNamed), 500)) {
    await check(db.from('genres').upsert(group, { onConflict: 'id' }), 'genres')
  }
  for (const group of chunk(companies.map(toNamed), 500)) {
    await check(db.from('companies').upsert(group, { onConflict: 'id' }), 'companies')
  }

  const idByIgdbId = new Map<number, number>()
  for (const group of chunk(games, 200)) {
    const rows = await check(
      db
        .from('games')
        .upsert(
          group.map((g) => mapGame(g, syncedAt)),
          { onConflict: 'igdb_id' },
        )
        .select('id, igdb_id'),
      'games',
    )
    ;(rows ?? []).forEach((row) => idByIgdbId.set(row.igdb_id, row.id))
  }

  // Relaciones: se reemplazan completas en cada sync.
  const gameIds = [...idByIgdbId.values()]
  for (const group of chunk(gameIds, 300)) {
    for (const table of ['game_platforms', 'game_genres', 'game_companies', 'game_media'] as const) {
      await check(db.from(table).delete().in('game_id', group), `${table} (limpieza)`)
    }
  }

  const gamePlatforms: TablesInsert<'game_platforms'>[] = []
  const gameGenres: TablesInsert<'game_genres'>[] = []
  const gameCompanies: TablesInsert<'game_companies'>[] = []
  const gameMedia: TablesInsert<'game_media'>[] = []

  for (const game of games) {
    const gameId = idByIgdbId.get(game.id)
    if (!gameId) continue
    uniqueBy(game.platforms ?? [], (p) => p.id).forEach((p) =>
      gamePlatforms.push({ game_id: gameId, platform_id: p.id }),
    )
    uniqueBy(game.genres ?? [], (g) => g.id).forEach((g) => gameGenres.push({ game_id: gameId, genre_id: g.id }))
    const roles = new Set<string>()
    for (const ic of game.involved_companies ?? []) {
      if (!ic.company) continue
      for (const role of [ic.developer && 'developer', ic.publisher && 'publisher'] as const) {
        if (!role || roles.has(`${ic.company.id}:${role}`)) continue
        roles.add(`${ic.company.id}:${role}`)
        gameCompanies.push({ game_id: gameId, company_id: ic.company.id, role })
      }
    }
    uniqueBy(game.screenshots ?? [], (s) => s.image_id)
      .slice(0, MAX_SCREENSHOTS)
      .forEach((s, position) =>
        gameMedia.push({ game_id: gameId, type: 'screenshot', external_id: s.image_id, position }),
      )
    uniqueBy(game.videos ?? [], (v) => v.video_id)
      .slice(0, MAX_TRAILERS)
      .forEach((v, position) => gameMedia.push({ game_id: gameId, type: 'trailer', external_id: v.video_id, position }))
  }

  for (const group of chunk(gamePlatforms, 1000)) await check(db.from('game_platforms').insert(group), 'game_platforms')
  for (const group of chunk(gameGenres, 1000)) await check(db.from('game_genres').insert(group), 'game_genres')
  for (const group of chunk(gameCompanies, 1000)) await check(db.from('game_companies').insert(group), 'game_companies')
  for (const group of chunk(gameMedia, 1000)) await check(db.from('game_media').insert(group), 'game_media')

  return idByIgdbId
}

// Sync programado (cada 6 h en producción con Vercel Pro; diario en el plan gratuito).
// Con { seed: true } suma clásicos y los más esperados para la carga inicial.
export async function syncCatalog(db: Db, { seed = false } = {}) {
  const now = Math.floor(Date.now() / 1000)

  const playing = await popularityOf(POPULARITY_PLAYING, 200)
  const wanted = seed ? await popularityOf(POPULARITY_WANT_TO_PLAY, 200) : new Map<number, number>()

  const [popular, recent, upcoming, acclaimed] = [
    await gamesByIds([...new Set([...playing.keys(), ...wanted.keys()])]),
    await recentGames(now),
    await upcomingGames(now),
    seed ? await acclaimedGames() : [],
  ]

  const games = uniqueBy([...popular, ...recent, ...upcoming, ...acclaimed], (g) => g.id)
  const idByIgdbId = await upsertGames(db, games)

  // Popularidad: se reinicia y se fija solo para los juegos que la gente está jugando ahora.
  await check(db.from('games').update({ popularity: 0 }).gt('popularity', 0), 'reinicio de popularidad')
  const popularRows = games
    .filter((g) => playing.has(g.id))
    .map((g) => ({ igdb_id: g.id, slug: g.slug, title: g.name, popularity: playing.get(g.id)! }))
  for (const group of chunk(popularRows, 200)) {
    await check(db.from('games').upsert(group, { onConflict: 'igdb_id' }), 'popularidad')
  }

  await check(db.rpc('refresh_trending_games'), 'trending')

  return {
    games: idByIgdbId.size,
    popular: popularRows.length,
    recent: recent.length,
    upcoming: upcoming.length,
    acclaimed: acclaimed.length,
  }
}

// Fetch bajo demanda: alguien abre la ficha de un juego que todavía no está en la base.
export async function importGameBySlug(db: Db, slug: string) {
  if (!/^[a-z0-9-]+$/.test(slug)) return false
  const [game] = await igdbQuery<IgdbGame>('games', `fields ${GAME_FIELDS}; where slug = "${slug}"; limit 1;`)
  if (!game) return false
  await upsertGames(db, [game])
  return true
}
