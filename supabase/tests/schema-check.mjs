// Prueba el esquema (RLS, triggers, RPC) sin Docker: aplica todas las migraciones
// sobre PGlite (Postgres 17 en WASM) con un stub mínimo de Supabase
// (roles anon/authenticated/service_role, auth.uid(), storage).
// Uso: pnpm test:db
import { PGlite } from '@electric-sql/pglite'
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm'
import { unaccent } from '@electric-sql/pglite/contrib/unaccent'
import { readdirSync, readFileSync } from 'node:fs'

const migrationsDir = new URL('../migrations/', import.meta.url)
const db = new PGlite({ extensions: { pg_trgm, unaccent } })

const prelude = `
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create schema auth;
create schema extensions;
create schema storage;
grant usage on schema public, extensions, auth, storage to anon, authenticated, service_role;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant execute on function auth.uid() to anon, authenticated, service_role;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id bigserial primary key, bucket_id text, name text);
alter table storage.objects enable row level security;
grant all on storage.objects to anon, authenticated, service_role;
grant all on storage.objects_id_seq to anon, authenticated, service_role;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`

const U = {
  alice: '00000000-0000-0000-0000-00000000000a',
  bob: '00000000-0000-0000-0000-00000000000b',
  carol: '00000000-0000-0000-0000-00000000000c',
  dave: '00000000-0000-0000-0000-00000000000d',
  mod: '00000000-0000-0000-0000-0000000000ee',
  google: '00000000-0000-0000-0000-0000000000ff',
}

let failures = 0
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`)
  if (!cond) failures++
}

async function as(user, fn) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${user ?? ''}', false);`)
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
  try {
    return await fn()
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`)
  }
}
const q = async (sql, params) => (await db.query(sql, params)).rows
async function fails(fn, pattern) {
  try {
    await fn()
    return false
  } catch (e) {
    if (pattern && !String(e.message).match(pattern)) {
      console.log('      error inesperado:', e.message)
      return false
    }
    return true
  }
}

await db.exec(prelude)
for (const file of readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()) {
  await db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'))
  console.log(`Migración aplicada: ${file}`)
}
console.log()

// Altas de usuarios (como hace Supabase Auth)
await db.exec(`
insert into auth.users (id, email, raw_user_meta_data) values
 ('${U.alice}', 'a@x.com', '{"username":"Alice_GG"}'),
 ('${U.bob}', 'b@x.com', '{"username":"bob"}'),
 ('${U.carol}', 'c@x.com', '{"username":"carol"}'),
 ('${U.dave}', 'd@x.com', '{"username":"dave"}'),
 ('${U.mod}', 'm@x.com', '{"username":"modera"}'),
 ('${U.google}', 'g@x.com', '{"full_name":"Gina Google","avatar_url":"https://x/a.png"}');
update public.profiles set role = 'moderator' where id = '${U.mod}';
insert into public.games (igdb_id, slug, title, popularity, release_date) values
 (1, 'the-legend-of-zelda-breath-of-the-wild', 'The Legend of Zelda: Breath of the Wild', 90, now() - interval '5 years'),
 (2, 'pokemon-legends-z-a', 'Pokémon Legends: Z-A', 80, now() - interval '10 days'),
 (3, 'hollow-knight-silksong', 'Hollow Knight: Silksong', 70, now() + interval '20 days');
insert into public.banned_terms values ('idiota');
`)

const profiles = await q(`select id, username, display_name from public.profiles order by username`)
ok(profiles.find((p) => p.id === U.alice)?.username === 'alice_gg', 'username del registro en minúsculas')
ok(/^user_[0-9a-f]{12}$/.test(profiles.find((p) => p.id === U.google)?.username), 'Google recibe username provisorio')
ok(profiles.find((p) => p.id === U.google)?.display_name === 'Gina Google', 'display_name desde Google')

// Usernames
ok((await q(`select public.is_username_available('bob') as v`))[0].v === false, 'username ocupado no disponible')
ok(
  (await q(`select public.is_username_available('user_0123456789ab') as v`))[0].v === false,
  'patrón provisorio reservado',
)
await as(U.google, () => q(`update public.profiles set username = 'gina' where id = auth.uid()`))
ok(
  (await q(`select username_changed_at from public.profiles where id = '${U.google}'`))[0].username_changed_at === null,
  'salir del username provisorio no consume los 30 días',
)
await as(U.google, () => q(`update public.profiles set username = 'gina2' where id = auth.uid()`))
ok(
  await fails(
    () => as(U.google, () => q(`update public.profiles set username = 'gina3' where id = auth.uid()`)),
    /30 días/,
  ),
  'segundo cambio en 30 días rechazado',
)
ok(
  await fails(
    () => as(U.alice, () => q(`update public.profiles set role = 'admin' where id = auth.uid()`)),
    /permission denied/,
  ),
  'no puede auto-asignarse rol',
)
ok(
  await fails(
    () => as(U.alice, () => q(`update public.profiles set followers_count = 999 where id = auth.uid()`)),
    /permission denied/,
  ),
  'no puede tocar contadores',
)
const bobUpd = await as(U.alice, () => q(`update public.profiles set bio = 'hack' where id = '${U.bob}' returning id`))
ok(bobUpd.length === 0, 'no puede editar perfil ajeno')

// Favoritos
await as(U.alice, () => q(`insert into public.favorites (game_id) values (1), (2)`))
ok(
  (await q(`select favorites_count from public.games where id = 1`))[0].favorites_count === 1,
  'contador de favoritos del juego',
)
ok(
  (await q(`select favorites_count from public.profiles where id = '${U.alice}'`))[0].favorites_count === 2,
  'contador de favoritos del perfil',
)
ok(
  await fails(() => as(U.bob, () => q(`insert into public.favorites (user_id, game_id) values ('${U.alice}', 3)`))),
  'no puede agregar favoritos a otro',
)
ok((await as(null, () => q(`select * from public.favorites`))).length === 2, 'visitante ve favoritos de perfil público')

// Comentarios
const [c1] = await as(U.alice, () =>
  q(`insert into public.comments (game_id, body) values (1, 'Obra maestra') returning id`),
)
ok((await q(`select comments_count from public.games where id = 1`))[0].comments_count === 1, 'contador de comentarios')
ok(
  await fails(() => as(U.alice, () => q(`insert into public.comments (game_id, body) values (1, '   ')`))),
  'comentario vacío rechazado',
)
ok(
  await fails(
    () => as(U.bob, () => q(`insert into public.comments (game_id, body) values (1, 'eres un IDIOTA')`)),
    /no permitidas/,
  ),
  'filtro de palabras (sin importar mayúsculas)',
)
ok(
  await fails(
    () => as(U.bob, () => q(`insert into public.comments (game_id, body) values (1, 'mira https://spam.com')`)),
    /enlaces/,
  ),
  'cuenta nueva no publica enlaces',
)
await as(U.alice, () => q(`update public.comments set body = 'Obra maestra absoluta' where id = $1`, [c1.id]))
ok(
  (await q(`select edited_at from public.comments where id = $1`, [c1.id]))[0].edited_at !== null,
  'editar marca edited_at',
)
ok(
  await fails(() =>
    as(U.bob, async () => {
      const r = await q(`update public.comments set body = 'x' where id = $1 returning id`, [c1.id])
      if (r.length === 0) throw new Error('sin filas')
    }),
  ),
  'no puede editar comentario ajeno',
)

// Likes
await as(U.bob, () => q(`insert into public.comment_likes (comment_id) values ($1)`, [c1.id]))
ok(
  (await q(`select likes_count from public.comments where id = $1`, [c1.id]))[0].likes_count === 1,
  'contador de likes',
)
ok(
  await fails(
    () => as(U.alice, () => q(`insert into public.comment_likes (comment_id) values ($1)`, [c1.id])),
    /propios/,
  ),
  'no like a comentario propio',
)
ok(
  await fails(() => as(U.bob, () => q(`insert into public.comment_likes (comment_id) values ($1)`, [c1.id]))),
  'un like por usuario',
)
ok((await as(U.carol, () => q(`select * from public.comment_likes`))).length === 0, 'nadie ve likes ajenos')
ok(
  (
    await q(
      `select count(*)::int as n from public.notifications where user_id = '${U.alice}' and type = 'comment_liked'`,
    )
  )[0].n === 1,
  'notificación de like',
)

// Reportes y moderación
const [c2] = await as(U.alice, () =>
  q(`insert into public.comments (game_id, body, is_spoiler) values (2, 'El final es...', true) returning id`),
)
for (const u of [U.bob, U.carol])
  await as(u, () => q(`insert into public.reports (comment_id, reason) values ($1, 'spoiler')`, [c2.id]))
ok(
  (await q(`select status from public.comments where id = $1`, [c2.id]))[0].status === 'visible',
  '2 reportes: sigue visible',
)
await as(U.dave, () => q(`insert into public.reports (comment_id, reason) values ($1, 'spoiler')`, [c2.id]))
ok(
  (await q(`select status from public.comments where id = $1`, [c2.id]))[0].status === 'hidden',
  '3.er reporte lo oculta',
)
ok((await q(`select comments_count from public.games where id = 2`))[0].comments_count === 0, 'oculto no cuenta')
ok(
  (await as(null, () => q(`select * from public.comments where id = $1`, [c2.id]))).length === 0,
  'visitante no ve oculto',
)
ok(
  (await as(U.alice, () => q(`select * from public.comments where id = $1`, [c2.id]))).length === 1,
  'autor ve su comentario oculto',
)
ok(
  await fails(
    () => as(U.alice, () => q(`update public.comments set status = 'visible' where id = $1`, [c2.id])),
    /permiso/,
  ),
  'autor no puede des-ocultar',
)
ok(
  await fails(
    () => as(U.alice, () => q(`insert into public.reports (comment_id, reason) values ($1, 'spam')`, [c1.id])),
    /propios/,
  ),
  'no reportar comentario propio',
)
ok((await as(U.bob, () => q(`select * from public.reports`))).length === 1, 'usuario ve solo sus reportes')
ok((await as(U.mod, () => q(`select * from public.reports`))).length === 3, 'moderador ve la cola')
ok(
  await fails(
    () => as(U.bob, () => q(`select public.moderate_comment($1, 'delete', 'spoiler')`, [c2.id])),
    /moderadores/,
  ),
  'usuario no puede moderar',
)
await as(U.mod, () => q(`select public.moderate_comment($1, 'delete', 'Spoiler sin etiqueta')`, [c2.id]))
ok((await q(`select status from public.comments where id = $1`, [c2.id]))[0].status === 'deleted', 'moderador borra')
ok(
  (await q(`select count(*)::int as n from public.reports where comment_id = $1 and status = 'resolved'`, [c2.id]))[0]
    .n === 3,
  'reportes resueltos',
)
ok(
  (
    await q(
      `select data->>'reason' as r from public.notifications where user_id = '${U.alice}' and type = 'comment_moderated'`,
    )
  )[0]?.r === 'Spoiler sin etiqueta',
  'autor notificado con motivo',
)
ok((await q(`select count(*)::int as n from public.moderation_actions`))[0].n === 1, 'acción registrada')
await as(U.mod, () => q(`select public.suspend_user($1, 7, 'spam')`, [U.dave]))
ok(
  await fails(() => as(U.dave, () => q(`insert into public.comments (game_id, body) values (1, 'hola')`))),
  'suspendido no comenta',
)
ok(
  await fails(() => as(U.dave, () => q(`insert into public.favorites (game_id) values (1)`))),
  'suspendido no agrega favoritos',
)
await as(U.mod, () => q(`select public.suspend_user($1, 0, 'apelación')`, [U.dave]))
await as(U.dave, () => q(`insert into public.favorites (game_id) values (3)`))
ok(true, 'levantar suspensión restaura escritura')

// Rate limit de comentarios
await as(U.carol, async () => {
  for (let i = 0; i < 10; i++)
    await q(`insert into public.comments (game_id, body) values (3, $1)`, [`comentario ${i}`])
})
ok(
  await fails(
    () => as(U.carol, () => q(`insert into public.comments (game_id, body) values (3, 'uno más')`)),
    /10 comentarios/,
  ),
  'límite de 10 comentarios por hora',
)

// Follows, privacidad y bloqueos
await as(U.bob, () => q(`insert into public.follows (following_id) values ($1)`, [U.alice]))
ok(
  (await q(`select followers_count from public.profiles where id = '${U.alice}'`))[0].followers_count === 1,
  'seguir a perfil público suma',
)
ok(
  await fails(() => as(U.bob, () => q(`insert into public.follows (following_id) values ($1)`, [U.bob]))),
  'no seguirse a sí mismo',
)
await as(U.alice, () => q(`update public.profiles set is_private = true where id = auth.uid()`))
ok(
  (await as(U.carol, () => q(`select * from public.favorites where user_id = $1`, [U.alice]))).length === 0,
  'perfil privado oculta favoritos a no seguidores',
)
ok(
  (await as(U.bob, () => q(`select * from public.favorites where user_id = $1`, [U.alice]))).length === 2,
  'seguidor aprobado ve favoritos',
)
await as(U.carol, () => q(`insert into public.follows (following_id) values ($1)`, [U.alice]))
ok(
  (await q(`select status from public.follows where follower_id = '${U.carol}'`))[0].status === 'pending',
  'follow a privado queda pendiente',
)
ok(
  (await q(`select followers_count from public.profiles where id = '${U.alice}'`))[0].followers_count === 1,
  'pendiente no suma',
)
ok(
  await fails(() =>
    as(U.carol, async () => {
      const r = await q(`update public.follows set status = 'accepted' where follower_id = auth.uid() returning *`)
      if (r.length === 0) throw new Error('sin filas')
    }),
  ),
  'solicitante no se auto-aprueba',
)
await as(U.alice, () =>
  q(`update public.follows set status = 'accepted' where follower_id = $1 and following_id = auth.uid()`, [U.carol]),
)
ok(
  (await q(`select followers_count from public.profiles where id = '${U.alice}'`))[0].followers_count === 2,
  'aprobar suma seguidor',
)
await as(U.alice, () => q(`insert into public.blocks (blocked_id) values ($1)`, [U.bob]))
ok(
  (
    await q(
      `select count(*)::int as n from public.follows where follower_id = '${U.bob}' and following_id = '${U.alice}'`,
    )
  )[0].n === 0,
  'bloquear elimina follows',
)
ok(
  (await q(`select followers_count from public.profiles where id = '${U.alice}'`))[0].followers_count === 1,
  'contador ajustado tras bloqueo',
)
ok(
  (await as(U.bob, () => q(`select * from public.profiles where id = $1`, [U.alice]))).length === 0,
  'bloqueado no ve el perfil',
)
ok(
  (await as(U.bob, () => q(`select * from public.comments where user_id = $1`, [U.alice]))).length === 0,
  'bloqueado no ve comentarios',
)
ok(
  (await as(U.alice, () => q(`select * from public.profiles where id = $1`, [U.bob]))).length === 1,
  'quien bloquea sigue viendo al bloqueado',
)
ok((await as(U.bob, () => q(`select * from public.blocks`))).length === 0, 'bloqueos son privados')
ok(
  await fails(() => as(U.bob, () => q(`insert into public.follows (following_id) values ($1)`, [U.alice]))),
  'bloqueado no puede seguir',
)

// Privilegios peligrosos y datos privados
ok(await fails(() => as(U.bob, () => q(`truncate public.comments`))), 'truncate denegado')
ok(await fails(() => as(null, () => q(`select * from public.banned_terms`))), 'banned_terms inaccesible')
ok(
  await fails(() => as(U.bob, () => q(`insert into public.games (igdb_id, slug, title) values (9, 'x', 'x')`))),
  'cliente no escribe catálogo',
)
ok(await fails(() => as(null, () => q(`select * from auth.users`))), 'email no accesible para anon')
ok(
  (await as(U.bob, () => q(`select * from public.notifications`))).every((n) => n.user_id === U.bob),
  'solo notificaciones propias',
)

// Funciones internas fuera de la Data API
ok(
  (
    await q(`select count(*)::int as n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname in ('is_moderator', 'has_blocked', 'can_view_profile_content')`)
  )[0].n === 0,
  'auxiliares de RLS en esquema private',
)
ok(
  await fails(() => as(U.bob, () => q(`select private.check_comment_content($1, 'hola')`, [U.bob]))),
  'cliente no ejecuta check_comment_content',
)

// Búsqueda
const s1 = await as(null, () => q(`select title from public.search_games('zelda')`))
ok(s1[0]?.title.startsWith('The Legend of Zelda'), 'búsqueda por palabra')
const s2 = await as(null, () => q(`select title from public.search_games('pokemon')`))
ok(s2[0]?.title === 'Pokémon Legends: Z-A', 'búsqueda sin tildes')
const s3 = await as(null, () => q(`select title from public.search_games('silksogn')`))
ok(s3[0]?.title === 'Hollow Knight: Silksong', 'tolera errores de tipeo')
ok((await as(null, () => q(`select * from public.search_games('z')`))).length === 0, 'mínimo 2 caracteres')
ok((await as(null, () => q(`select * from public.search_games('%')`))).length === 0, 'comodines escapados')

// Trending
await q(`select public.refresh_trending_games()`)
const t = await as(null, () => q(`select game_id, score from public.trending_games order by score desc`))
ok(t.length === 3 && Number(t[0].game_id) === 3, 'trending: la actividad interna reciente sube al juego 3')
ok(await fails(() => as(U.bob, () => q(`select public.refresh_trending_games()`))), 'cliente no refresca trending')

// Storage
await as(U.bob, () =>
  q(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${U.bob}/avatar.webp`]),
)
ok(
  await fails(() =>
    as(U.bob, () =>
      q(`insert into storage.objects (bucket_id, name) values ('avatars', $1)`, [`${U.alice}/avatar.webp`]),
    ),
  ),
  'no sube avatar en carpeta ajena',
)

// Borrado de cuenta en cascada
await q(`delete from auth.users where id = '${U.carol}'`)
ok(
  (await q(`select count(*)::int as n from public.comments where user_id = '${U.carol}'`))[0].n === 0,
  'borrar cuenta elimina sus datos',
)
ok(
  (await q(`select followers_count from public.profiles where id = '${U.alice}'`))[0].followers_count === 0,
  'contadores ajustados al borrar cuenta',
)

console.log(`\n${failures === 0 ? 'Todo OK' : `${failures} fallas`}`)
process.exit(failures === 0 ? 0 : 1)
