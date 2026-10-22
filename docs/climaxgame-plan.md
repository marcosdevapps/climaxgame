# ClimaxGame — Plan de ejecución y stack técnico

22/10/2026 · Basado en *ClimaxGame — Plan de trabajo* (Google Drive › Clude Plan Demo)

Este documento convierte el plan de producto en un plan técnico ejecutable: qué tecnologías se usan y en qué versión, cómo se organiza el código y la base de datos, cómo se alimenta el catálogo y qué se construye en cada sprint. El *qué* y el *por qué* de producto (público, alcance MoSCoW, historias de usuario, UX) están en el documento fuente; aquí se referencian por su ID (A1, D2, J1…).

---

## 1. Resumen

| Aspecto | Definición |
| --- | --- |
| Producto | Red social de videojuegos en español para LatAm (MX, CO, AR, CL) |
| Ciclo núcleo | Descubrir un juego → guardarlo en favoritos → opinar → seguir a alguien |
| Duración del MVP | 14 semanas = 7 sprints de 2 semanas (+ semana 0 de preparación) |
| Equipo supuesto | 1 desarrollador full-stack a tiempo completo + apoyo puntual de diseño |
| Stack | Next.js 16 + Supabase + Vercel, catálogo desde IGDB |
| Metas a 90 días | 1.000 registros · 40 % con 3+ favoritos en la 1.ª semana · 300 comentarios/semana · 30 % sigue a 1+ persona · retención 30 días del 20 % |

---

## 2. Stack técnico

| Capa | Tecnología (versión) | Por qué |
| --- | --- | --- |
| Lenguaje y runtime | TypeScript 5 (modo estricto), Node.js 22 LTS, pnpm | Un solo lenguaje en front, back y scripts; tipos de la BD generados automáticamente |
| Framework web | **Next.js 16.2** (App Router, React 19, Turbopack) | Render en servidor para SEO de fichas y perfiles; páginas y API en un mismo proyecto; `cacheComponents` para cachear fichas y home |
| UI | **Tailwind CSS v4** + **shadcn/ui** (Radix) + lucide-react | Tema oscuro por defecto, componentes accesibles (modales, pestañas, menús) sin diseñar desde cero |
| Formularios y validación | Zod + react-hook-form | El mismo esquema Zod valida en el cliente y en las Server Actions |
| Mutaciones | Server Actions + `useOptimistic` | Favorito, like y seguir cambian en pantalla al instante (J2, C2, S1) sin una capa de API aparte |
| Base de datos | **Supabase Postgres** + extensiones `pg_trgm`, `unaccent`, `pg_cron`, `pg_net` | Las relaciones sociales encajan en SQL; RLS para autorización por fila; búsqueda sin servicio extra |
| Autenticación | Supabase Auth (email + contraseña, Google OAuth) con `@supabase/ssr` | Sesión en cookies compatible con render en servidor; verificación y recuperación incluidas |
| Archivos | Supabase Storage (bucket `avatars`) | Avatares de hasta 2 MB (A3); las portadas se sirven desde el CDN de IGDB |
| Catálogo | **IGDB API v4** (OAuth client credentials de Twitch, consultas Apicalypse); **RAWG** como plan B | Fichas completas, fechas por plataforma, ESRB, capturas y tráileres. Ambos proveedores detrás de una interfaz `CatalogProvider` |
| Traducción de sinopsis | Claude Haiku 5.5 (`claude-haiku-5-5`) vía Anthropic SDK | Traduce `summary_en` → `summary_es` en español neutro, una sola vez por juego |
| Hosting | Vercel (Fluid Compute) | Deploy en cada push, preview por PR, CDN; funciones en la misma región que Supabase |
| Tareas programadas | Route Handler `/api/cron/sync-catalog` protegido con `CRON_SECRET` | Disparado por Vercel Cron (cada 6 h, plan Pro) o por Supabase `pg_cron` + `pg_net` mientras se esté en plan gratuito |
| Email transaccional | Resend como SMTP de Supabase Auth | Verificación de cuenta y recuperación de contraseña con dominio propio |
| Analítica | PostHog | Embudos, cohortes y eventos (sección 9) |
| Errores y rendimiento | Sentry · Vercel Speed Insights | Alertas de errores en producción; LCP real de usuarios móviles |
| Calidad | ESLint, Prettier, Vitest, Playwright, pgTAP (`supabase test db`), GitHub Actions | Tests de lógica, de flujos completos y de cada política RLS en CI |

> **Ojo con los planes gratuitos.** El plan Hobby de Vercel es solo para uso personal no comercial y sus cron jobs tienen frecuencia limitada: se puede desarrollar y hacer la beta en Hobby, pero hay que pasar a **Vercel Pro antes del lanzamiento público**. Supabase Free pausa proyectos inactivos y no tiene backups diarios: pasar a **Supabase Pro** para producción.

---

## 3. Arquitectura

### 3.1 Vista general

```
                         ┌──────────────────────────────────────────────┐
  Navegador (móvil)      │ Vercel · Next.js 16                          │
  ───────────────────►   │  proxy.ts ── refresca sesión (getClaims)     │
  HTML (RSC), acciones   │  Server Components ── páginas cacheadas      │
                         │  Server Actions ── favoritos, comentarios…   │
                         │  /api/cron/sync-catalog ── sincroniza IGDB   │
                         └───────────────┬───────────────┬──────────────┘
                                         │               │ (solo el cron)
                                         ▼               ▼
                         ┌───────────────────────┐   ┌─────────────────┐
                         │ Supabase              │   │ IGDB (Twitch)   │
                         │  Postgres + RLS       │   │ Claude Haiku    │
                         │  Auth · Storage       │   │ (traducción)    │
                         │  pg_cron (opcional)   │   └─────────────────┘
                         └───────────────────────┘
```

- El navegador **nunca** llama a IGDB (no lo permite y además expondría credenciales). Solo el servicio de catálogo habla con IGDB y Claude; las páginas leen siempre de Supabase.
- Supabase y las funciones de Vercel van en la misma región para reducir latencia: **São Paulo** (`sa-east-1` / `gru1`) por defecto; reevaluar con el tráfico real de la beta (si México pesa más, `us-east-1` / `iad1`).
- Una futura app móvil (Expo) podría reutilizar la misma base de datos, Auth y políticas RLS.

### 3.2 Estrategia de render y caché

Se activa `cacheComponents: true` en `next.config.ts`. Lo público se cachea; lo que depende del usuario se renderiza dinámico dentro de `<Suspense>`, así la página llega rápido y lo personal se completa después.

| Ruta | Render | Invalidación |
| --- | --- | --- |
| `/` (home) | Hero + carruseles con `"use cache"`, `cacheLife('hours')`, `cacheTag('home')`; bloque "Actividad de tu red" dinámico | `revalidateTag('home')` al final de cada sync |
| `/juego/[slug]` | Datos del juego cacheados con `cacheTag('game:<id>')`; botón de favorito, "amigos que lo tienen" y comentarios dinámicos | `revalidateTag('game:<id>')` cuando el sync cambia el juego |
| `/explorar/[seccion]` ("Ver todos") | Cacheado por sección y página | `revalidateTag('home')` |
| `/buscar` | Dinámico (RPC `search_games`) | — |
| `/u/[username]` | Dinámico (depende de privacidad, bloqueos y si el visitante sigue al usuario) | — |
| `/actividad` (feed) | Dinámico, paginación por cursor | — |
| `/moderacion` | Dinámico, solo rol `moderator`/`admin` | — |

### 3.3 Autenticación y la "acción pendiente"

- `proxy.ts` crea un `createServerClient` por request (cookies `getAll`/`setAll`) y llama a `supabase.auth.getClaims()` al inicio para refrescar la sesión. Las respuestas que escriben cookies llevan `Cache-Control: private, no-store` (lo agrega la librería).
- El proxy solo refresca la sesión y redirige rutas privadas; **la autorización real vive en RLS**.
- Regla de oro del documento: el visitante lee todo y el registro aparece al participar. Cuando un visitante pulsa favorito / like / seguir / comentar, la acción se guarda en `sessionStorage` (más un parámetro `next` con la URL actual), se abre el modal de registro y, tras el login u OAuth, el cliente reejecuta la acción y muestra el aviso ("Agregado a tus favoritos") — Flujo 1.

### 3.4 Imágenes, SEO y localización

- **Imágenes:** portadas y capturas desde `images.igdb.com` en formato `.webp` (`t_cover_big`, `t_screenshot_med`, `t_1080p` para el hero) mediante `next/image` con `remotePatterns`; lazy-load por defecto y `priority` solo en el hero.
- **SEO:** `generateMetadata` por ficha y perfil, JSON-LD `VideoGame` en la ficha, `sitemap.ts` dividido en lotes (`generateSitemaps`), `robots.ts`, Open Graph con la portada. URLs legibles: `/juego/[slug]`, `/u/[username]`.
- **Localización:** textos en español neutro con tuteo, centralizados en `lib/i18n/es.ts` (deja la puerta abierta a portugués). Fechas `dd/mm/aaaa` con `Intl.DateTimeFormat('es', { timeZone })` en la zona horaria del navegador; las fechas de lanzamiento se guardan en UTC.

---

## 4. Estructura del repositorio

```
climaxgame/
├── app/
│   ├── (public)/
│   │   ├── page.tsx                  # home
│   │   ├── juego/[slug]/page.tsx     # ficha de juego
│   │   ├── u/[username]/page.tsx     # perfil
│   │   ├── buscar/page.tsx
│   │   ├── explorar/[seccion]/page.tsx
│   │   └── legal/{terminos,privacidad}/page.tsx
│   ├── (app)/                        # requiere sesión
│   │   ├── onboarding/page.tsx
│   │   ├── actividad/page.tsx
│   │   └── ajustes/page.tsx          # editar perfil, privacidad, bloqueos, borrar cuenta
│   ├── moderacion/page.tsx
│   ├── auth/callback/route.ts        # OAuth y confirmación de email
│   ├── api/cron/sync-catalog/route.ts
│   ├── sitemap.ts · robots.ts · layout.tsx
├── components/
│   ├── ui/                           # shadcn/ui
│   ├── game/                         # GameCard, GameCarousel, FavoriteButton, ScoreBadge
│   ├── comment/                      # CommentCard, CommentForm, ReportDialog
│   ├── profile/                      # FollowButton, ProfileHeader, CommonGames
│   └── layout/                       # TopBar, BottomNav, AuthModal
├── lib/
│   ├── supabase/{server,client,admin}.ts
│   ├── catalog/{provider.ts,igdb.ts,rawg.ts,sync.ts}
│   ├── translate.ts
│   ├── actions/                      # Server Actions por dominio
│   ├── validators/                   # esquemas Zod
│   ├── analytics.ts · i18n/es.ts
├── supabase/
│   ├── migrations/                   # SQL versionado
│   ├── seed.sql
│   └── tests/                        # pgTAP: una prueba por política RLS
├── scripts/seed-catalog.ts           # carga inicial de juegos
├── e2e/                              # Playwright: flujos 1–3
├── proxy.ts
├── next.config.ts
└── vercel.json                       # crons
```

---

## 5. Base de datos

### 5.1 Ajustes al modelo del documento fuente

- `users` pasa a ser **`profiles`**, en relación 1:1 con `auth.users` (creado por trigger al registrarse). El **email queda solo en `auth.users`**, nunca en tablas públicas.
- `profiles` suma `suspended_until`, `username_changed_at` (regla de 30 días de A3), `platforms text[]` (onboarding) y contadores.
- Nueva tabla **`moderation_actions`** (id, moderator_id, target_type, target_id, action, reason, created_at) para el registro que pide M1.
- `notifications` se crea en el MVP pero solo se usa para avisar al autor de un comentario moderado (Flujo 3). La campana completa es *Should* (ver sección 12).
- El resto de tablas queda como en el documento: `games`, `platforms`, `genres`, `companies`, `game_platforms`, `game_genres`, `game_companies` (rol), `game_media`, `favorites`, `comments`, `comment_likes`, `follows`, `blocks`, `reports`.

### 5.2 Contadores, búsqueda e índices

- **Contadores desnormalizados** mantenidos por triggers: `games.favorites_count`, `games.comments_count`, `profiles.followers_count / following_count / favorites_count`, `comments.likes_count / reports_count`.
- **Búsqueda (D2):** columna generada `games.search_tsv` (`to_tsvector('simple', unaccent(title))`) con índice GIN, más índice GIN `gin_trgm_ops` sobre `title` para tolerar errores de tipeo. Una RPC `search_games(q text, limit int)` combina coincidencia de texto y similitud trigram, ordenada por relevancia y popularidad. Se usa desde 2 caracteres.
- **Índices clave:** `games(release_date)`, `games(popularity desc)`, `comments(game_id, created_at desc)`, `comments(game_id, likes_count desc)`, `favorites(user_id, created_at desc)`, `follows(following_id)`, `reports(status, created_at)`.
- **"Populares del momento":** vista materializada `trending_games` = popularidad IGDB normalizada + (favoritos + comentarios de los últimos 7 días), refrescada al final de cada sync.

### 5.3 Políticas RLS

| Tabla | Lectura | Escritura |
| --- | --- | --- |
| `games` y catálogo | Pública | Solo service role (cron) |
| `profiles` | Pública (datos de perfil, nunca email), salvo si el visitante está bloqueado | El propio usuario; `role` y `suspended_until` solo moderadores |
| `favorites` | Pública si el perfil es público; si es privado, solo el dueño y seguidores con follow `aceptado` | El dueño |
| `comments` | `status = 'visible'` y sin bloqueo entre autor y lector; el autor ve los suyos ocultos; moderadores ven todo | Crear: usuario no suspendido. Editar/borrar: el autor (borrado lógico) |
| `comment_likes` | Nadie ve quién dio like (solo el contador) | El dueño; no a comentarios propios |
| `follows` | Pública | `follower_id = auth.uid()`; aceptar o rechazar solicitudes: el seguido |
| `blocks` | Solo el que bloquea | Solo el que bloquea |
| `reports` | Moderadores | Cualquier usuario autenticado, uno por comentario |
| `notifications` | El destinatario | Solo triggers / service role |
| `moderation_actions` | Moderadores | Moderadores |

### 5.4 Reglas de negocio en la base de datos

Estas reglas se aplican con triggers o constraints para que valgan venga la escritura de donde venga:

- Límites: 10 comentarios por hora y 100 likes por hora por usuario (trigger que cuenta en ventana de 1 h).
- Comentario de 1 a 1.000 caracteres (`check`); `edited_at` se fija al editar ("editado", C1).
- No se puede dar like a un comentario propio ni seguirse a uno mismo (`check follower_id <> following_id`).
- Al **3.er reporte de usuarios distintos**, el comentario pasa a `status = 'oculto'` automáticamente (C3).
- Si el perfil seguido es privado, el follow nace como `pendiente`.
- Las cuentas con menos de 7 días no pueden publicar enlaces; filtro de palabras ofensivas sobre una tabla `banned_terms`.
- Al bloquear, se eliminan los follows en ambas direcciones.
- El cambio de nombre de usuario se permite una vez cada 30 días.

### 5.5 Flujo de migraciones

- Esquema versionado en `supabase/migrations` con Supabase CLI; desarrollo local con `supabase start`.
- Tipos de TypeScript con `supabase gen types typescript` en cada cambio de esquema (verificado en CI).
- `supabase db push` a producción solo desde CI al hacer merge a `main`. Opcional: branch de Supabase por PR.

---

## 6. Pipeline del catálogo (IGDB)

1. **Credenciales:** app en el portal de desarrolladores de Twitch → `client_id` + `client_secret`. Token de client credentials guardado y renovado antes de expirar (dura ~60 días).
2. **Limitador:** cola con máximo 4 peticiones por segundo y hasta 4 en paralelo; reintento con backoff ante 429/5xx. Hasta 500 resultados por petición.
3. **Consultas en cada sync (cada 6 h):**
   - Recién lanzados: `first_release_date` dentro de los últimos 30 días.
   - Próximos lanzamientos: `first_release_date` futuro, ordenados por fecha.
   - Populares: endpoint `popularity_primitives` → IDs de juegos → detalles.
4. **Upsert** por `igdb_id` en `games` y relaciones: plataformas, géneros, compañías (desarrollador/distribuidora), `game_media` (capturas y tráileres de YouTube), clasificación ESRB cuando exista, `critic_score` (`aggregated_rating`) y `user_score_external` (`rating`). Se actualiza `synced_at`.
5. **Traducción:** si `summary_es` es nulo o cambió `summary_en`, se envía a Claude Haiku 5.5 con instrucciones de español neutro latinoamericano, sin regionalismos y conservando nombres propios. Se procesa en lotes y en un paso aparte para no bloquear el sync.
6. **Bajo demanda:** si alguien abre `/juego/[slug]` de un juego que no está en la base, el servidor lo busca en IGDB una vez, lo guarda y lo muestra (ficha sin sinopsis traducida hasta el siguiente lote).
7. **Cierre:** refrescar `trending_games` y llamar a `revalidateTag('home')` y a `revalidateTag('game:<id>')` de los juegos que cambiaron.
8. **Carga inicial:** `scripts/seed-catalog.ts` importa ~2.000 juegos (populares de todos los tiempos + los últimos 2 años) para que la búsqueda y el onboarding tengan contenido desde el día 1.
9. **Atribución:** "Datos de IGDB" visible en fichas y footer, como piden las condiciones de uso.

La interfaz `CatalogProvider` (`getRecent`, `getUpcoming`, `getPopular`, `getById`, `search`) permite cambiar a RAWG sin tocar el resto del código si IGDB no aprueba el uso comercial.

---

## 7. Plan de ejecución por sprint

Cada sprint termina con algo desplegado en producción (o en preview para la beta) y probado. Los criterios de salida son los del documento fuente.

### Semana 0 — Preparación (antes del sprint 1)

- [ ] Crear la app en el portal de desarrolladores de Twitch y probar consultas a IGDB
- [ ] Escribir a IGDB/Twitch sobre el acuerdo de uso comercial
- [ ] Registrar dominio y cuentas de redes con el nombre ClimaxGame
- [ ] Crear cuentas: GitHub, Vercel, Supabase, PostHog, Sentry, Resend, Anthropic
- [ ] Listar comunidades gamer de LatAm por país (Discord, Reddit, Facebook) para la beta
- [ ] Empezar el reclutamiento del grupo beta (30–50 jugadores)

### Sprint 1 · Semanas 1–2 · Descubrimiento y diseño

| | |
| --- | --- |
| Diseño | Wireframes y prototipo en Figma de home, ficha, perfil, registro y onboarding; sistema visual (colores, tipografía, tarjeta de juego, insignia de nota, estados vacíos, carga y error) |
| Técnico (en paralelo) | Repo con Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui; proyecto Supabase y entorno local; deploy "hola mundo" en Vercel; CI (lint, typecheck, tests); Sentry y PostHog instalados; primera migración con el modelo de datos completo y tipos generados |
| Historias | — (base para todas) |
| Salida | **Prototipo probado con 5 jugadores**; modelo de datos validado |

### Sprint 2 · Semanas 3–4 · Base técnica y catálogo

| | |
| --- | --- |
| Tareas | `CatalogProvider` + cliente IGDB con limitador; sync programado + traducción; seed de ~2.000 juegos; layout (barra superior, barra inferior en móvil); `GameCard` y `ScoreBadge`; home con hero y tres carruseles + "Ver todos"; ficha completa con pestañas Resumen / Multimedia; búsqueda con resultados mientras se escribe; caché y `revalidateTag`; `generateMetadata` |
| Historias | D1, D2, J1 |
| Salida | **Home y fichas cargan en menos de 2,5 s (LCP) en móvil** (Lighthouse con perfil móvil + Speed Insights) |

### Sprint 3 · Semanas 5–6 · Cuentas y favoritos

| | |
| --- | --- |
| Tareas | Supabase Auth con email (verificación, recuperación vía Resend) y Google; `AuthModal`; `proxy.ts`; trigger que crea `profiles`; elección de nombre de usuario; onboarding (plataformas, 12 populares, sugerencias de usuarios); edición de perfil con avatar en Storage; `FavoriteButton` optimista con contador; acción pendiente post-login (Flujo 1); RLS + pgTAP de `profiles` y `favorites` |
| Historias | A1, A2, A3, J2 |
| Salida | **Un usuario nuevo se registra y guarda 3 juegos sin ayuda** (prueba con usuarios + test E2E del Flujo 1) |

### Sprint 4 · Semanas 7–8 · Comentarios, likes y moderación

| | |
| --- | --- |
| Tareas | Pestaña Comunidad: `CommentForm`, `CommentCard`, editar/borrar, etiqueta de spoiler con difuminado; likes optimistas; orden "Más relevantes" / "Más recientes"; `ReportDialog` con motivo obligatorio; triggers de límites, filtro de enlaces y palabras, auto-ocultar al 3.er reporte; panel `/moderacion` (cola, restaurar, borrar, suspender 7 días o permanente, registro en `moderation_actions`); notificación al autor; RLS + pgTAP |
| Historias | C1, C2, C3, M1 |
| Salida | **Flujo de reporte probado de punta a punta** (test E2E del Flujo 3) |

### Sprint 5 · Semanas 9–10 · Seguir, perfiles y feed

| | |
| --- | --- |
| Tareas | `FollowButton` (Seguir / Siguiendo / Dejar de seguir) en perfiles y comentarios; perfil público con pestañas Favoritos / Comentarios / Seguidores / Siguiendo y orden de favoritos; franja "Juegos en común"; "Amigos que lo tienen en favoritos" en la ficha; perfil privado con solicitudes; bloqueo de usuarios; borrado de cuenta con todos sus datos; feed cronológico `/actividad` con paginación infinita y bloque en la home (*Should*) |
| Historias | S1, S2, S3 (*Should*) |
| Salida | **Todas las historias Must aceptadas** (test E2E del Flujo 2 + revisión contra criterios de aceptación) |

### Sprint 6 · Semanas 11–12 · Beta cerrada

| | |
| --- | --- |
| Tareas | Abrir la beta a 30–50 jugadores de al menos 4 países; sembrar 200–300 comentarios; sitemap, robots, JSON-LD y Open Graph; términos, política de privacidad y consentimiento; eventos de PostHog completos; revisión de seguridad (RLS, service role, headers); corrección de errores; asignar moderadores |
| Salida | **Cero errores críticos abiertos; retención de la beta medida** |

### Sprint 7 · Semanas 13–14 · Pulido y lanzamiento público

| | |
| --- | --- |
| Tareas | Cerrar lo pendiente de la beta; pasada de rendimiento y accesibilidad; migrar a Vercel Pro y Supabase Pro; cron cada 6 h en Vercel; alertas en Sentry; Google Search Console; dashboards de métricas; lanzamiento en comunidades de Discord, Reddit y Facebook y con creadores de contenido de la región |
| Salida | **Lanzamiento público** con monitoreo activo |

### Después del lanzamiento (fase 2)

Notificaciones completas (campana), filtros por plataforma y género, respuestas a comentarios, nota propia del usuario y listas personalizadas, priorizadas según las métricas del primer mes.

### Trazabilidad de historias

| Historia | Sprint | Historia | Sprint |
| --- | --- | --- | --- |
| A1 Registro | 3 | C1 Comentar | 4 |
| A2 Onboarding | 3 | C2 Likes | 4 |
| A3 Editar perfil | 3 | C3 Reportar | 4 |
| D1 Home | 2 | S1 Seguir | 5 |
| D2 Búsqueda | 2 | S2 Perfil de otros | 5 |
| J1 Ficha | 2 | S3 Feed (*Should*) | 5 |
| J2 Favoritos | 3 | M1 Moderación | 4 |

---

## 8. Calidad y definición de "terminado"

Una historia está terminada cuando:

- Cumple todos sus criterios de aceptación del documento fuente.
- Tiene tests: Vitest para lógica (validadores, formato de fechas, cálculo de popularidad), pgTAP para cada política RLS y trigger que toca, Playwright si forma parte de los Flujos 1–3.
- Pasa CI: lint, typecheck, tests, build y tipos de Supabase al día.
- Se revisó en el preview deploy del PR en un teléfono Android de gama media (o emulación equivalente).
- Respeta el presupuesto de rendimiento: **LCP ≤ 2,5 s, CLS ≤ 0,1** en home y ficha (Lighthouse CI).
- Cumple accesibilidad básica (WCAG AA): contraste en tema oscuro, foco visible, etiquetas en botones con ícono.
- Diseña sus estados vacíos, de carga (esqueletos) y de error con reintento.

---

## 9. Instrumentación desde el día 1

| Evento (PostHog) | Métrica que alimenta |
| --- | --- |
| `signup_modal_shown` (con `trigger`: favorito/comentario/like/seguir) · `signup_completed` (con `method`) | Conversión visitante → registro |
| `onboarding_completed` (juegos elegidos, omitido sí/no) · `favorite_added` | % con 3+ favoritos en la primera semana |
| `game_viewed` · `comment_created` · `comment_liked` | Comentarios por juego visitado; comentarios por semana |
| `user_followed` · `profile_viewed` | Seguimientos por usuario activo; % que sigue a 1+ persona |
| `search_performed` (con `results_count`) | Calidad de la búsqueda; búsquedas sin resultados |
| Cohortes por fecha de registro | Retención a 7 y 30 días |

Además: LCP real con Vercel Speed Insights y tráfico orgánico a fichas con Google Search Console. Las métricas de favoritos, comentarios y follows se validan también con consultas SQL a la base.

---

## 10. Seguridad, privacidad y cumplimiento

- **RLS como única fuente de autorización**, probada con pgTAP; la service role key solo existe en el servidor (cron y acciones de moderación) y nunca en el cliente.
- Variables de entorno separadas para local, preview y producción; secretos solo en Vercel/Supabase.
- Validación con Zod en todas las Server Actions; texto plano en comentarios (sin HTML) para evitar XSS.
- Headers de seguridad y CSP básica en `next.config.ts`.
- Reglas de privacidad del documento: perfil público por defecto, opción de perfil privado, email nunca visible, likes anónimos, bloqueo de usuarios.
- Borrado de cuenta completo (cascada sobre todas las tablas + avatar en Storage).
- Leyes de datos personales: Colombia (Ley 1581), México (ley federal de protección de datos personales), Argentina (Ley 25.326), Chile (Ley 19.628). Se aplica la más exigente: consentimiento explícito al registrarse, política de privacidad clara, derecho de acceso y borrado.

---

## 11. Entornos y costos estimados

| Entorno | Uso |
| --- | --- |
| Local | `supabase start` + `pnpm dev`; datos de seed |
| Preview | Deploy de Vercel por PR; Supabase de staging (o branch por PR) |
| Producción | Rama `main`; migraciones aplicadas desde CI |

| Servicio | Desarrollo y beta | Lanzamiento |
| --- | --- | --- |
| Vercel | Hobby (gratis) | Pro (~USD 20/mes por miembro) |
| Supabase | Free | Pro (~USD 25/mes) por backups diarios y sin pausas |
| PostHog · Sentry · Resend | Planes gratuitos | Gratuitos mientras alcance el volumen del MVP |
| Claude Haiku 5.5 | Bajo: una traducción por juego; estimar con el seed de 2.000 juegos | Igual, proporcional a juegos nuevos |
| IGDB | Gratis (no comercial) | Según el acuerdo comercial con Twitch |
| Dominio | ~USD 10–20/año | — |

*Precios aproximados: confirmarlos en cada servicio antes de contratar.*

---

## 12. Riesgos técnicos y decisiones abiertas

| Tema | Riesgo / decisión | Plan |
| --- | --- | --- |
| Licencia de IGDB | El uso comercial requiere acuerdo de partner | Escribir en la semana 0; guardar todo en base propia; `CatalogProvider` permite cambiar a RAWG (confirmar también sus condiciones comerciales) |
| Región | São Paulo vs. US East | Empezar en São Paulo; revisar latencia y distribución de tráfico al cierre de la beta |
| Frecuencia del sync | Cada 6 h necesita Vercel Pro | Durante desarrollo y beta, `pg_cron` + `pg_net` en Supabase llaman al endpoint |
| Notificaciones | El documento fuente es inconsistente: el Flujo 3 avisa al autor de un comentario moderado, pero las notificaciones son *Should* | Crear la tabla `notifications` en el MVP y usarla solo para moderación (aviso simple en el perfil); la campana completa queda en fase 2 |
| Sitio vacío al lanzar | El mayor riesgo del producto | Seed de catálogo, 200–300 comentarios sembrados en la beta, moderadores y comunidad desde el primer día |
| Calidad de las traducciones | Una sinopsis mal traducida daña la ficha | Revisar una muestra de 50 traducciones en el sprint 2 y ajustar el prompt; mostrar el original si falla |
| Alcance que crece | Foros, mensajes o listas antes de tiempo | MoSCoW cerrado; todo lo nuevo va a fase 2 |
