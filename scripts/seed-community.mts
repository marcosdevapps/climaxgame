// Comunidad de prueba para ver la parte social funcionando en local.
//   pnpm community:seed           → crea usuarios, favoritos, comentarios, likes, follows y reportes
//   pnpm community:seed --reset   → borra todo lo creado por este script
//
// Todos los usuarios usan el dominio demo.example.com y la contraseña DEMO_PASSWORD.

import { createClient } from '@supabase/supabase-js'

import type { Database } from '../lib/supabase/database.types'

const DEMO_DOMAIN = 'demo.example.com'
export const DEMO_PASSWORD = 'ClimaxDemo2026!'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secretKey = process.env.SUPABASE_SECRET_KEY
if (!url || !secretKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local')
  process.exit(1)
}
const db = createClient<Database>(url, secretKey, { auth: { persistSession: false } })

type Platform = 'pc' | 'playstation' | 'xbox' | 'switch' | 'mobile'
const USERS: {
  username: string
  name: string
  bio: string
  platforms: Platform[]
  role?: 'moderator'
  private?: boolean
}[] = [
  {
    username: 'moderadora_ana',
    name: 'Ana Gutiérrez',
    bio: 'Moderadora de ClimaxGame 🛡️ · RPGs y café',
    platforms: ['pc', 'switch'],
    role: 'moderator',
  },
  {
    username: 'diego_gamer',
    name: 'Diego Ramírez',
    bio: 'CDMX 🇲🇽 · Shooters competitivos y soulslikes',
    platforms: ['pc', 'playstation'],
  },
  {
    username: 'vale_plays',
    name: 'Valentina Rojas',
    bio: 'Bogotá 🇨🇴 · Indies, metroidvanias y todo lo que tenga pixel art',
    platforms: ['switch', 'pc'],
  },
  {
    username: 'tomi_rpg',
    name: 'Tomás Fernández',
    bio: 'Buenos Aires 🇦🇷 · Si tiene árbol de habilidades, lo juego',
    platforms: ['pc', 'xbox'],
  },
  { username: 'cami_nintendo', name: 'Camila Soto', bio: 'Santiago 🇨🇱 · Nintendo de corazón', platforms: ['switch'] },
  {
    username: 'mateo_fps',
    name: 'Mateo López',
    bio: 'Monterrey 🇲🇽 · Ranked todos los días',
    platforms: ['pc', 'xbox', 'mobile'],
  },
  {
    username: 'lu_aventuras',
    name: 'Lucía Martínez',
    bio: 'Medellín 🇨🇴 · Mundos abiertos y fotos in-game',
    platforms: ['playstation'],
  },
  {
    username: 'nico_retro',
    name: 'Nicolás Pérez',
    bio: 'Rosario 🇦🇷 · Coleccionista de clásicos',
    platforms: ['pc', 'switch'],
  },
  {
    username: 'sofi_rpg',
    name: 'Sofía Herrera',
    bio: 'Valparaíso 🇨🇱 · Perfil privado, pero acepto solicitudes 💜',
    platforms: ['playstation', 'pc'],
    private: true,
  },
  {
    username: 'andres_mobile',
    name: 'Andrés Castillo',
    bio: 'Guadalajara 🇲🇽 · Gacha y juegos de bolsillo',
    platforms: ['mobile'],
  },
  {
    username: 'paula_indie',
    name: 'Paula Vargas',
    bio: 'Cali 🇨🇴 · Joyitas indie que nadie conoce',
    platforms: ['pc', 'switch'],
  },
  {
    username: 'javi_strategy',
    name: 'Javier Morales',
    bio: 'Córdoba 🇦🇷 · Estrategia por turnos y 4X',
    platforms: ['pc'],
  },
]

const COMMENTS = [
  'Lo terminé en unas 40 horas y me quedé con ganas de más. De lo mejor que jugué este año.',
  'La banda sonora es una locura, la escucho hasta cuando no estoy jugando.',
  'Muy buen juego, pero en PC tuvo bastantes caídas de FPS al principio. Con los últimos parches anda bien.',
  '¿Alguien sabe si vale la pena en Switch o conviene esperar a una versión mejorada?',
  'El combate se siente increíble, cada pelea es un desafío distinto.',
  'Me costó engancharme las primeras horas, pero después no lo pude soltar.',
  'Lo jugué en cooperativo con amigos y fue de las mejores experiencias que tuve.',
  'Historia regular, pero la jugabilidad lo compensa todo.',
  'Para mí está sobrevalorado. Es lindo, pero se vuelve repetitivo a la mitad.',
  'La dirección de arte es preciosa. Cada escenario parece una pintura.',
  'Ojalá saquen más contenido, me quedé con el hype al máximo.',
  'Recomendadísimo si te gustan los desafíos. Paciencia y vas a disfrutarlo.',
  'El precio en la región es alto, esperen una oferta si pueden.',
  'Llevo más de 200 horas y sigo encontrando cosas nuevas.',
  'Los controles en móvil no son lo mejor, se disfruta mucho más con mando.',
  'La traducción al español latino está muy bien hecha, se agradece.',
  'Se lo recomendé a mi hermano que nunca juega y terminó enganchado.',
  'El final me dejó pensando varios días. Qué manera de cerrar la historia.',
  'Excelente para jugar en sesiones cortas antes de dormir.',
  'Las misiones secundarias están mejor escritas que muchas historias principales.',
  'Los servidores para Latinoamérica tienen buen ping, juego desde Chile sin problema.',
  'No es para todos, pero si conectas con su propuesta es una obra maestra.',
  'El multijugador es divertidísimo, aunque hay que ir con grupo.',
  'Volví a jugarlo después de años y sigue envejeciendo muy bien.',
  'Los jefes finales son de otro planeta. Sufrí pero valió la pena.',
  'Ideal para jugar en pareja, nos reímos muchísimo.',
  'La exploración es lo mejor: cada rincón tiene algo escondido.',
  '¿Tips para empezar? Estoy medio perdido en las primeras zonas.',
]
const SPOILERS = [
  'Cuidado: el giro del capítulo final con el mentor me rompió el corazón, nunca lo vi venir.',
  'Que el villano fuera el protagonista del primer juego es lo mejor que vi en años.',
]
const OFFENSIVE = 'Este juego es basura y cualquiera que lo defienda no sabe nada de videojuegos.'

const DAY = 86_400_000
const rand = (n: number) => Math.floor(Math.random() * n)
const pick = <T,>(items: T[]) => items[rand(items.length)]
const sample = <T,>(items: T[], n: number) => [...items].sort(() => Math.random() - 0.5).slice(0, n)
// Fechas pasadas (más de 1 h): no cuentan para los límites por hora.
const pastDate = (maxDays = 14) => new Date(Date.now() - 2 * 3_600_000 - rand(maxDays * DAY)).toISOString()

async function check<T>(promise: PromiseLike<{ data: T; error: { message: string } | null }>, what: string) {
  const { data, error } = await promise
  if (error) throw new Error(`${what}: ${error.message}`)
  return data as NonNullable<T>
}

async function demoUsers() {
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  return (data?.users ?? []).filter((u) => u.email?.endsWith(`@${DEMO_DOMAIN}`))
}

async function reset() {
  const users = await demoUsers()
  for (const user of users) await db.auth.admin.deleteUser(user.id)
  await check(db.rpc('refresh_trending_games'), 'trending')
  console.log(`Comunidad de prueba eliminada (${users.length} usuarios).`)
}

async function seed() {
  if ((await demoUsers()).length > 0) {
    console.log('La comunidad de prueba ya existe. Usa --reset para borrarla primero.')
    return
  }

  // Usuarios (ya verificados: no se envían emails).
  const ids: Record<string, string> = {}
  for (const u of USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: `${u.username}@${DEMO_DOMAIN}`,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { username: u.username, full_name: u.name },
    })
    if (error) throw new Error(`usuario ${u.username}: ${error.message}`)
    ids[u.username] = data.user.id
    await check(
      db
        .from('profiles')
        .update({
          bio: u.bio,
          platforms: u.platforms,
          is_private: u.private ?? false,
          role: u.role ?? 'user',
          avatar_url: `https://api.dicebear.com/9.x/thumbs/svg?seed=${u.username}`,
          onboarding_completed_at: new Date().toISOString(),
          created_at: pastDate(60),
        })
        .eq('id', data.user.id),
      `perfil ${u.username}`,
    )
  }
  const userIds = Object.values(ids)

  // Favoritos sobre los juegos más populares y mejor valorados.
  const { data: games } = await db
    .from('games')
    .select('id')
    .not('critic_score', 'is', null)
    .order('popularity', { ascending: false })
    .order('critic_score', { ascending: false })
    .limit(80)
  const gameIds = (games ?? []).map((g) => g.id)
  const favorites = userIds.flatMap((user_id) =>
    sample(gameIds, 6 + rand(10)).map((game_id) => ({ user_id, game_id, created_at: pastDate() })),
  )
  await check(db.from('favorites').insert(favorites), 'favoritos')

  // Comentarios sobre sus favoritos.
  const comments = favorites
    .filter(() => Math.random() < 0.45)
    .map((f) => ({ user_id: f.user_id, game_id: f.game_id, body: pick(COMMENTS), created_at: pastDate() }))
  SPOILERS.forEach((body, i) =>
    comments.push({ user_id: userIds[i + 2], game_id: gameIds[i], body, created_at: pastDate(5) }),
  )
  const inserted = await check(
    db
      .from('comments')
      .insert(comments.map((c) => ({ ...c, is_spoiler: SPOILERS.includes(c.body) })))
      .select('id, user_id'),
    'comentarios',
  )

  // Likes de otros usuarios.
  const likes = inserted.flatMap((c) =>
    sample(
      userIds.filter((id) => id !== c.user_id),
      rand(6),
    ).map((user_id) => ({ user_id, comment_id: c.id, created_at: pastDate() })),
  )
  await check(db.from('comment_likes').insert(likes), 'likes')

  // Follows (hacia el perfil privado quedan pendientes; se aprueban algunos).
  const follows = userIds.flatMap((follower_id) =>
    sample(
      userIds.filter((id) => id !== follower_id),
      3 + rand(4),
    ).map((following_id) => ({ follower_id, following_id, created_at: pastDate() })),
  )
  await check(db.from('follows').insert(follows), 'follows')
  const privateId = ids.sofi_rpg
  const pending = await check(
    db.from('follows').select('follower_id').eq('following_id', privateId).eq('status', 'pending'),
    'pendientes',
  )
  for (const row of pending.slice(0, Math.ceil(pending.length / 2))) {
    await check(
      db
        .from('follows')
        .update({ status: 'accepted' })
        .eq('follower_id', row.follower_id)
        .eq('following_id', privateId),
      'aprobar follow',
    )
  }

  // Un comentario ofensivo con 3 reportes: queda oculto y en la cola de moderación.
  const [offensive] = await check(
    db
      .from('comments')
      .insert({ user_id: ids.mateo_fps, game_id: gameIds[0], body: OFFENSIVE, created_at: pastDate(2) })
      .select('id'),
    'comentario ofensivo',
  )
  for (const reporter of ['vale_plays', 'tomi_rpg', 'cami_nintendo']) {
    await check(
      db.from('reports').insert({ reporter_id: ids[reporter], comment_id: offensive.id, reason: 'offensive' }),
      'reporte',
    )
  }

  await check(db.rpc('refresh_trending_games'), 'trending')

  console.log(`Comunidad de prueba creada:
  ${USERS.length} usuarios · ${favorites.length} favoritos · ${inserted.length + 1} comentarios · ${likes.length} likes · ${follows.length} follows
  1 comentario ofensivo reportado 3 veces (oculto, en la cola de moderación)

  Ingresa con cualquiera, por ejemplo:
    moderadora_ana@${DEMO_DOMAIN}  (moderadora)
    diego_gamer@${DEMO_DOMAIN}
  Contraseña: ${DEMO_PASSWORD}`)
}

if (process.argv.includes('--reset')) await reset()
else await seed()
