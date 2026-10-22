# ClimaxGame

Red social de videojuegos en español para Latinoamérica: catálogo de juegos, favoritos, comentarios y seguidores.

El plan de ejecución y el stack técnico están en [`docs/climaxgame-plan.md`](docs/climaxgame-plan.md).

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 + shadcn/ui · Supabase (Postgres + RLS, Auth, Storage) · Vercel · IGDB.

## Requisitos

- Node.js 24
- pnpm (se activa con `corepack enable`; la versión está fijada en `package.json`)
- Docker, solo si quieres levantar Supabase en local (`pnpm db:start`)

## Primeros pasos

```bash
corepack enable
pnpm install
cp .env.example .env.local   # completa las claves de Supabase
pnpm dev
```

Sin las variables de Supabase la app arranca igual (la sesión queda desactivada), útil para trabajar en la UI.

## Scripts

| Script                                         | Qué hace                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`                                     | Servidor de desarrollo                                                               |
| `pnpm build` / `pnpm start`                    | Build y servidor de producción                                                       |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | Calidad de código                                                                    |
| `pnpm test`                                    | Tests unitarios (Vitest)                                                             |
| `pnpm test:db`                                 | Aplica las migraciones sobre PGlite y prueba RLS, triggers y RPC. No necesita Docker |
| `pnpm db:start` / `pnpm db:reset`              | Supabase local (requiere Docker)                                                     |
| `pnpm db:push`                                 | Aplica las migraciones al proyecto vinculado                                         |
| `pnpm db:types`                                | Genera `lib/supabase/database.types.ts` desde el proyecto vinculado                  |

## Estructura

```
app/                  rutas (App Router)
  auth/callback/      destino de Google OAuth y enlaces de email
components/
  layout/             barra superior, navegación inferior, menú de usuario
  ui/                 componentes de shadcn/ui
lib/
  supabase/           clientes server / browser / admin
  igdb/               utilidades del catálogo
  format.ts           fechas dd/mm/aaaa, tiempo relativo, insignia de nota
  validators.ts       esquemas Zod (mismas reglas que la base)
supabase/
  migrations/         esquema versionado
  tests/              pruebas del esquema (pnpm test:db)
proxy.ts              refresco de sesión y rutas privadas
```

## Base de datos

El esquema completo del MVP está en `supabase/migrations/`. Toda la autorización vive en RLS. Además, la base aplica estas reglas de negocio, ya sea con triggers o con privilegios por columna:

- contadores desnormalizados;
- límites de 10 comentarios y 100 likes por hora;
- ocultado automático al 3.er reporte;
- perfiles privados con solicitudes de seguimiento;
- bloqueos;
- filtro de enlaces para cuentas nuevas.

Para vincular un proyecto de Supabase:

```bash
pnpm exec supabase login
pnpm exec supabase link --project-ref <ref>
pnpm db:push
pnpm db:types
```

Los clientes de `lib/supabase/` ya usan los tipos de `database.types.ts`. Cada vez que cambie el esquema, regenéralos con `pnpm db:types`.
