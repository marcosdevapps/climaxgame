# ClimaxGame

Red social de videojuegos en español para Latinoamérica: catálogo de juegos, favoritos, comentarios y seguidores.

El plan de ejecución y el stack técnico están en [`docs/climaxgame-plan.md`](docs/climaxgame-plan.md).

## Qué incluye

| Área           | Funcionalidades                                                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Descubrir      | Home con hero, "Populares ahora", "Recién lanzados" y "Próximamente" (con cuenta regresiva); páginas "Ver todos"; búsqueda en vivo tolerante a errores                       |
| Ficha de juego | Notas de crítica y usuarios, plataformas, sinopsis, géneros, desarrollador, distribuidora, clasificación ESRB/PEGI, tráileres, capturas, relacionados, JSON-LD               |
| Cuentas        | Registro con Google o email, onboarding (usuario, plataformas, 3 favoritos, personas sugeridas), ajustes con avatar, perfil privado, bloqueos y borrado de cuenta            |
| Favoritos      | Un clic desde tarjetas y fichas, contador por juego; si un visitante lo intenta, se completa solo después del registro                                                       |
| Comunidad      | Comentarios (editar, borrar, spoilers), likes, orden por relevancia o fecha, reportes con motivo                                                                             |
| Moderación     | Ocultado automático al 3.er reporte, cola de moderación, restaurar/borrar con aviso al autor, suspensiones, registro de acciones                                             |
| Social         | Perfiles públicos o privados con solicitudes, juegos en común, seguidores/siguiendo, feed de tu red con scroll infinito, notificaciones, "amigos que lo tienen en favoritos" |

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 + shadcn/ui · Supabase (Postgres + RLS, Auth, Storage) · Vercel · IGDB.

## Requisitos

- Node.js 24
- pnpm (se activa con `corepack enable`; la versión está fijada en `package.json`)
- Un proyecto de Supabase y una app de Twitch (gratis, para la API de IGDB)

## Correr en local

```bash
corepack enable
pnpm install
cp .env.example .env.local   # completa Supabase (incluida SUPABASE_SECRET_KEY) y Twitch
pnpm catalog:seed            # carga ~750 juegos reales desde IGDB
pnpm community:seed          # opcional: comunidad de prueba
pnpm dev
```

### Comunidad de prueba

`pnpm community:seed` crea 12 usuarios ya verificados, con favoritos, comentarios, likes, follows, un perfil privado y un comentario reportado que queda en la cola de moderación. `pnpm community:reset` la borra.

| Usuario                           | Para probar                   |
| --------------------------------- | ----------------------------- |
| `moderadora_ana@demo.example.com` | Panel de moderación           |
| `diego_gamer@demo.example.com`    | Usuario con red de seguidores |
| `sofi_rpg@demo.example.com`       | Perfil privado y solicitudes  |

Contraseña de todos: `ClimaxDemo2026!`

## Scripts

| Script                                         | Qué hace                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                                     | Servidor de desarrollo                                                               |
| `pnpm build` / `pnpm start`                    | Build y servidor de producción                                                       |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Calidad de código                                                                    |
| `pnpm test`                                    | Tests unitarios (Vitest)                                                             |
| `pnpm test:db`                                 | Aplica las migraciones sobre PGlite y prueba RLS, triggers y RPC. No necesita Docker |
| `pnpm catalog:seed` / `pnpm catalog:sync`      | Carga inicial / sincronización del catálogo desde IGDB                               |
| `pnpm community:seed` / `pnpm community:reset` | Crea / borra la comunidad de prueba                                                  |
| `pnpm db:push` · `pnpm db:types`               | Migraciones y tipos del proyecto de Supabase vinculado                               |

## Estructura

```
app/
  page.tsx                 home
  juego/[slug]/            ficha de juego
  u/[username]/            perfil
  buscar/ · explorar/      descubrimiento
  actividad/               feed y notificaciones
  ajustes/ · onboarding/   cuenta
  moderacion/              panel de moderación
  api/cron/sync-catalog/   sync programado (Vercel Cron)
components/                UI por dominio (game, comments, profile, feed, …) y ui/ de shadcn
lib/
  catalog/                 cliente de IGDB y sync
  data/                    consultas del servidor (catálogo cacheado, social, comentarios, feed)
  supabase/                clientes server / browser / admin / público
supabase/
  migrations/              esquema versionado
  tests/                   pruebas del esquema (pnpm test:db)
scripts/                   carga del catálogo y comunidad de prueba
proxy.ts                   refresco de sesión y rutas privadas
```

## Base de datos

El esquema completo está en `supabase/migrations/`. Toda la autorización vive en RLS. Además, la base aplica estas reglas de negocio, ya sea con triggers o con privilegios por columna:

- contadores desnormalizados;
- límites de 10 comentarios y 100 likes por hora;
- ocultado automático al 3.er reporte;
- perfiles privados con solicitudes;
- bloqueos;
- filtro de enlaces para cuentas nuevas.

Cada vez que cambie el esquema, regenera los tipos con `pnpm db:types`.

## Pendiente para producción

- Configurar en Supabase las URLs de Auth y el proveedor de Google.
- Configurar Resend como SMTP: requiere dominio propio.
- Agregar `SUPABASE_SECRET_KEY`, `TWITCH_*` y `CRON_SECRET` en Vercel.
- Pasar a los planes Pro de Vercel y Supabase antes del lanzamiento público.
- Las sinopsis se muestran en inglés: la traducción con Claude queda para cuando haya una API key.
