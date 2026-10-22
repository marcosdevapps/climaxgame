-- ClimaxGame · esquema inicial del MVP
-- Modelo de datos, contadores, reglas de comunidad y políticas RLS.
-- Ver climaxgame-plan.md, sección 5.

-- ─────────────────────────────────────────────────────────────
-- Extensiones y utilidades
-- ─────────────────────────────────────────────────────────────

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- unaccent() es STABLE; este envoltorio IMMUTABLE permite usarlo en columnas generadas e índices.
create or replace function public.normalize_text(value text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select lower(extensions.unaccent('extensions.unaccent'::regdictionary, value))
$$;

-- ─────────────────────────────────────────────────────────────
-- Tipos
-- ─────────────────────────────────────────────────────────────

create type public.user_role as enum ('user', 'moderator', 'admin');
create type public.comment_status as enum ('visible', 'hidden', 'deleted');
create type public.follow_status as enum ('accepted', 'pending');
create type public.report_reason as enum ('spam', 'offensive', 'spoiler', 'other');
create type public.report_status as enum ('open', 'resolved');
create type public.media_type as enum ('screenshot', 'trailer');
create type public.company_role as enum ('developer', 'publisher');
create type public.notification_type as enum ('new_follower', 'follow_request', 'comment_liked', 'comment_moderated');
create type public.moderation_action_type as enum ('restore_comment', 'delete_comment', 'suspend_user', 'unsuspend_user');

-- ─────────────────────────────────────────────────────────────
-- Perfiles (1:1 con auth.users; el email vive solo en auth.users)
-- ─────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text check (char_length(display_name) between 1 and 50),
  avatar_url text,
  bio text check (char_length(bio) <= 160),
  is_private boolean not null default false,
  role public.user_role not null default 'user',
  platforms text[] not null default '{}'
    check (platforms <@ array['pc', 'playstation', 'xbox', 'switch', 'mobile']),
  onboarding_completed_at timestamptz,
  username_changed_at timestamptz,
  suspended_until timestamptz,
  favorites_count integer not null default 0,
  followers_count integer not null default 0,
  following_count integer not null default 0,
  comments_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Catálogo (escrito solo por el sync con service role)
-- ─────────────────────────────────────────────────────────────

create table public.games (
  id bigint generated always as identity primary key,
  igdb_id bigint not null unique,
  slug text not null unique,
  title text not null,
  summary_en text,
  summary_es text,
  release_date timestamptz,
  -- image_id de IGDB; la URL se arma con el tamaño que necesite cada vista.
  cover_image_id text,
  background_image_id text,
  critic_score numeric(5, 2),
  user_score_external numeric(5, 2),
  age_rating text,
  popularity double precision not null default 0,
  favorites_count integer not null default 0,
  comments_count integer not null default 0,
  title_normalized text generated always as (public.normalize_text(title)) stored,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.platforms (
  id bigint primary key, -- id de IGDB
  name text not null,
  slug text not null unique
);

create table public.genres (
  id bigint primary key, -- id de IGDB
  name text not null,
  slug text not null unique
);

create table public.companies (
  id bigint primary key, -- id de IGDB
  name text not null,
  slug text not null unique
);

create table public.game_platforms (
  game_id bigint not null references public.games (id) on delete cascade,
  platform_id bigint not null references public.platforms (id) on delete cascade,
  primary key (game_id, platform_id)
);

create table public.game_genres (
  game_id bigint not null references public.games (id) on delete cascade,
  genre_id bigint not null references public.genres (id) on delete cascade,
  primary key (game_id, genre_id)
);

create table public.game_companies (
  game_id bigint not null references public.games (id) on delete cascade,
  company_id bigint not null references public.companies (id) on delete cascade,
  role public.company_role not null,
  primary key (game_id, company_id, role)
);

create table public.game_media (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games (id) on delete cascade,
  type public.media_type not null,
  -- image_id de IGDB para capturas, video_id de YouTube para tráileres.
  external_id text not null,
  position smallint not null default 0,
  unique (game_id, type, external_id)
);

-- ─────────────────────────────────────────────────────────────
-- Actividad de usuarios
-- ─────────────────────────────────────────────────────────────

create table public.favorites (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

create table public.comments (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game_id bigint not null references public.games (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  is_spoiler boolean not null default false,
  status public.comment_status not null default 'visible',
  likes_count integer not null default 0,
  reports_count integer not null default 0,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

create table public.comment_likes (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  comment_id bigint not null references public.comments (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);

create table public.follows (
  follower_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  following_id uuid not null references public.profiles (id) on delete cascade,
  status public.follow_status not null default 'accepted',
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  comment_id bigint not null references public.comments (id) on delete cascade,
  reason public.report_reason not null,
  details text check (char_length(details) <= 500),
  status public.report_status not null default 'open',
  resolved_by uuid references public.profiles (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, comment_id)
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  actor_id uuid references public.profiles (id) on delete cascade,
  entity_id bigint,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.moderation_actions (
  id bigint generated always as identity primary key,
  moderator_id uuid references public.profiles (id) on delete set null,
  action public.moderation_action_type not null,
  target_user_id uuid references public.profiles (id) on delete set null,
  comment_id bigint references public.comments (id) on delete set null,
  reason text,
  suspended_until timestamptz,
  created_at timestamptz not null default now()
);

-- Palabras bloqueadas por el filtro automático (se compara sin tildes y en minúsculas).
create table public.banned_terms (
  term text primary key
);

-- ─────────────────────────────────────────────────────────────
-- Índices
-- ─────────────────────────────────────────────────────────────

create index games_release_date_idx on public.games (release_date);
create index games_popularity_idx on public.games (popularity desc);
create index games_title_trgm_idx on public.games using gin (title_normalized extensions.gin_trgm_ops);
create index game_platforms_platform_idx on public.game_platforms (platform_id);
create index game_genres_genre_idx on public.game_genres (genre_id);
create index game_companies_company_idx on public.game_companies (company_id);
create index game_media_game_idx on public.game_media (game_id, type, position);
create index favorites_user_created_idx on public.favorites (user_id, created_at desc);
create index favorites_game_idx on public.favorites (game_id);
create index comments_game_recent_idx on public.comments (game_id, created_at desc) where status = 'visible';
create index comments_game_relevant_idx on public.comments (game_id, likes_count desc) where status = 'visible';
create index comments_user_idx on public.comments (user_id, created_at desc);
create index comment_likes_comment_idx on public.comment_likes (comment_id);
create index comment_likes_user_created_idx on public.comment_likes (user_id, created_at);
create index follows_following_idx on public.follows (following_id);
create index blocks_blocked_idx on public.blocks (blocked_id);
create index reports_queue_idx on public.reports (status, created_at);
create index reports_comment_idx on public.reports (comment_id);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index moderation_actions_created_idx on public.moderation_actions (created_at desc);

-- ─────────────────────────────────────────────────────────────
-- Funciones auxiliares para RLS
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('moderator', 'admin')
  )
$$;

-- Usuario con sesión y sin suspensión vigente.
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and (suspended_until is null or suspended_until <= now())
  )
$$;

create or replace function public.is_blocked_between(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

-- ¿blocker bloqueó a target? (dirigido; el bloqueado no puede ver el perfil de quien lo bloqueó)
create or replace function public.has_blocked(blocker uuid, target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.blocks where blocker_id = blocker and blocked_id = target)
$$;

-- Favoritos y actividad de un perfil: visibles si es público, si es el dueño
-- o si el visitante es un seguidor aprobado. Nunca para usuarios bloqueados.
create or replace function public.can_view_profile_content(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    owner_id = (select auth.uid())
    or (
      not public.is_blocked_between(owner_id, (select auth.uid()))
      and (
        not (select is_private from public.profiles where id = owner_id)
        or exists (
          select 1 from public.follows
          where follower_id = (select auth.uid())
            and following_id = owner_id
            and status = 'accepted'
        )
      )
    )
$$;

-- ─────────────────────────────────────────────────────────────
-- Perfiles: alta automática y reglas de edición
-- ─────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested text := lower(new.raw_user_meta_data ->> 'username');
  chosen text;
begin
  if requested ~ '^[a-z0-9_]{3,20}$'
     and not exists (select 1 from public.profiles where username = requested) then
    chosen := requested;
  else
    -- Con Google no hay nombre de usuario: se asigna uno provisorio y se elige en el onboarding.
    chosen := 'user_' || substr(replace(new.id::text, '-', ''), 1, 12);
  end if;

  insert into public.profiles (id, username, display_name, avatar_url)
  values (
    new.id,
    chosen,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', chosen), 50),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.profiles_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.username is distinct from old.username then
    if new.username ~ '^user_[0-9a-f]{12}$' then
      raise exception 'Ese nombre de usuario está reservado'
        using errcode = 'P0001', hint = 'username_reserved';
    end if;
    -- Un cambio cada 30 días (A3). El nombre provisorio de Google se puede cambiar sin espera.
    if old.username_changed_at is not null
       and old.username_changed_at > now() - interval '30 days' then
      raise exception 'Solo puedes cambiar tu nombre de usuario una vez cada 30 días'
        using errcode = 'P0001', hint = 'username_cooldown';
    end if;
    if old.username !~ '^user_[0-9a-f]{12}$' then
      new.username_changed_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function public.profiles_before_update();

-- ─────────────────────────────────────────────────────────────
-- Reglas de comunidad (A3, C1–C3, S1)
-- ─────────────────────────────────────────────────────────────

-- Filtro de palabras bloqueadas y de enlaces en cuentas con menos de 7 días.
create or replace function public.check_comment_content(author_id uuid, body text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized text := public.normalize_text(body);
begin
  if exists (
    select 1 from public.banned_terms t
    where normalized ~ ('\m' || public.normalize_text(t.term) || '\M')
  ) then
    raise exception 'Tu comentario contiene palabras no permitidas'
      using errcode = 'P0001', hint = 'banned_term';
  end if;

  if body ~* '(https?://|www\.|[a-z0-9-]+\.(com|net|org|gg|io|ly|me|tv)\b)'
     and exists (
       select 1 from public.profiles
       where id = author_id and created_at > now() - interval '7 days'
     ) then
    raise exception 'Las cuentas con menos de 7 días no pueden publicar enlaces'
      using errcode = 'P0001', hint = 'links_not_allowed';
  end if;
end;
$$;

create or replace function public.comments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    select count(*) from public.comments
    where user_id = new.user_id and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Alcanzaste el límite de 10 comentarios por hora'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;

  perform public.check_comment_content(new.user_id, new.body);
  new.status := 'visible';
  new.likes_count := 0;
  new.reports_count := 0;
  new.edited_at := null;
  return new;
end;
$$;

create trigger comments_before_insert
  before insert on public.comments
  for each row execute function public.comments_before_insert();

create or replace function public.comments_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- El autor solo puede borrar (borrado lógico); restaurar u ocultar es cosa de moderación.
  -- pg_trigger_depth() > 1: lo cambia otro trigger (p. ej. el ocultado automático por reportes).
  if new.status is distinct from old.status
     and new.status <> 'deleted'
     and pg_trigger_depth() = 1
     and not public.is_moderator() then
    raise exception 'No tienes permiso para cambiar el estado del comentario'
      using errcode = '42501';
  end if;

  if new.body is distinct from old.body then
    perform public.check_comment_content(new.user_id, new.body);
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create trigger comments_before_update
  before update on public.comments
  for each row execute function public.comments_before_update();

create or replace function public.comment_likes_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.comments where id = new.comment_id and user_id = new.user_id) then
    raise exception 'No puedes dar like a tus propios comentarios'
      using errcode = 'P0001', hint = 'own_comment';
  end if;

  if (
    select count(*) from public.comment_likes
    where user_id = new.user_id and created_at > now() - interval '1 hour'
  ) >= 100 then
    raise exception 'Alcanzaste el límite de 100 likes por hora'
      using errcode = 'P0001', hint = 'rate_limited';
  end if;
  return new;
end;
$$;

create trigger comment_likes_before_insert
  before insert on public.comment_likes
  for each row execute function public.comment_likes_before_insert();

-- Si el perfil seguido es privado, el follow queda pendiente de aprobación.
create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'No puedes seguir a este usuario' using errcode = '42501';
  end if;

  new.status := case
    when (select is_private from public.profiles where id = new.following_id) then 'pending'
    else 'accepted'
  end::public.follow_status;
  return new;
end;
$$;

create trigger follows_before_insert
  before insert on public.follows
  for each row execute function public.follows_before_insert();

-- Al bloquear se cortan los follows en ambas direcciones.
create or replace function public.blocks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.follows
  where (follower_id = new.blocker_id and following_id = new.blocked_id)
     or (follower_id = new.blocked_id and following_id = new.blocker_id);
  return null;
end;
$$;

create trigger blocks_after_insert
  after insert on public.blocks
  for each row execute function public.blocks_after_insert();

create or replace function public.reports_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.comments where id = new.comment_id and user_id = new.reporter_id) then
    raise exception 'No puedes reportar tus propios comentarios'
      using errcode = 'P0001', hint = 'own_comment';
  end if;
  new.status := 'open';
  new.resolved_by := null;
  new.resolved_at := null;
  return new;
end;
$$;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_before_insert();

-- Al 3.er reporte abierto de usuarios distintos, el comentario se oculta hasta revisión (C3).
create or replace function public.reports_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  open_reports integer;
begin
  update public.comments set reports_count = reports_count + 1 where id = new.comment_id;

  select count(*) into open_reports
  from public.reports
  where comment_id = new.comment_id and status = 'open';

  if open_reports >= 3 then
    update public.comments set status = 'hidden'
    where id = new.comment_id and status = 'visible';
  end if;
  return null;
end;
$$;

create trigger reports_after_insert
  after insert on public.reports
  for each row execute function public.reports_after_insert();

-- ─────────────────────────────────────────────────────────────
-- Contadores desnormalizados y notificaciones
-- ─────────────────────────────────────────────────────────────

create or replace function public.favorites_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := case tg_op when 'INSERT' then 1 else -1 end;
  row_data public.favorites := case tg_op when 'INSERT' then new else old end;
begin
  update public.games set favorites_count = favorites_count + delta where id = row_data.game_id;
  update public.profiles set favorites_count = favorites_count + delta where id = row_data.user_id;
  return null;
end;
$$;

create trigger favorites_counters
  after insert or delete on public.favorites
  for each row execute function public.favorites_counters();

-- Solo cuentan los comentarios visibles.
create or replace function public.comments_counters()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  was_visible boolean := tg_op in ('UPDATE', 'DELETE') and old.status = 'visible';
  is_visible boolean := tg_op in ('INSERT', 'UPDATE') and new.status = 'visible';
  delta integer := is_visible::integer - was_visible::integer;
  target public.comments := case tg_op when 'DELETE' then old else new end;
begin
  if delta <> 0 then
    update public.games set comments_count = comments_count + delta where id = target.game_id;
    update public.profiles set comments_count = comments_count + delta where id = target.user_id;
  end if;
  return null;
end;
$$;

create trigger comments_counters
  after insert or update of status or delete on public.comments
  for each row execute function public.comments_counters();

create or replace function public.comment_likes_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_id uuid;
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = likes_count + 1
    where id = new.comment_id
    returning user_id into author_id;

    insert into public.notifications (user_id, type, actor_id, entity_id)
    values (author_id, 'comment_liked', new.user_id, new.comment_id);
  else
    update public.comments set likes_count = likes_count - 1 where id = old.comment_id;
  end if;
  return null;
end;
$$;

create trigger comment_likes_after_change
  after insert or delete on public.comment_likes
  for each row execute function public.comment_likes_after_change();

create or replace function public.follows_after_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'accepted' then
      update public.profiles set following_count = following_count + 1 where id = new.follower_id;
      update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
    end if;
    insert into public.notifications (user_id, type, actor_id)
    values (
      new.following_id,
      case new.status when 'accepted' then 'new_follower' else 'follow_request' end::public.notification_type,
      new.follower_id
    );
  elsif tg_op = 'UPDATE' then
    if old.status = 'pending' and new.status = 'accepted' then
      update public.profiles set following_count = following_count + 1 where id = new.follower_id;
      update public.profiles set followers_count = followers_count + 1 where id = new.following_id;
      insert into public.notifications (user_id, type, actor_id)
      values (new.following_id, 'new_follower', new.follower_id);
    end if;
  elsif old.status = 'accepted' then
    update public.profiles set following_count = following_count - 1 where id = old.follower_id;
    update public.profiles set followers_count = followers_count - 1 where id = old.following_id;
  end if;
  return null;
end;
$$;

create trigger follows_after_change
  after insert or update of status or delete on public.follows
  for each row execute function public.follows_after_change();

-- ─────────────────────────────────────────────────────────────
-- RPC
-- ─────────────────────────────────────────────────────────────

create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select lower(candidate) ~ '^[a-z0-9_]{3,20}$'
    and lower(candidate) !~ '^user_[0-9a-f]{12}$'
    and not exists (select 1 from public.profiles where username = lower(candidate))
$$;

-- Búsqueda tolerante a errores (D2): coincidencia parcial + similitud de trigramas.
create or replace function public.search_games(query text, max_results integer default 20)
returns setof public.games
language sql
stable
set search_path = ''
as $$
  with q as (
    select
      term,
      replace(replace(replace(term, '\', '\\'), '%', '\%'), '_', '\_') as pattern
    from (select public.normalize_text(btrim(query)) as term) t
  )
  select g.*
  from public.games g, q
  where char_length(q.term) >= 2
    and (
      g.title_normalized like '%' || q.pattern || '%'
      or extensions.word_similarity(q.term, g.title_normalized) > 0.4
    )
  order by
    (g.title_normalized like q.pattern || '%') desc,
    extensions.word_similarity(q.term, g.title_normalized) desc,
    g.popularity desc
  limit least(greatest(max_results, 1), 50)
$$;

-- Moderación (M1): restaurar o borrar un comentario reportado y avisar al autor.
create or replace function public.moderate_comment(target_comment_id bigint, decision text, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_id uuid;
begin
  if not public.is_moderator() then
    raise exception 'Solo moderadores' using errcode = '42501';
  end if;
  if decision not in ('restore', 'delete') then
    raise exception 'Decisión inválida: %', decision using errcode = '22023';
  end if;

  update public.comments
  set status = case decision when 'restore' then 'visible' else 'deleted' end::public.comment_status
  where id = target_comment_id
  returning user_id into author_id;

  if author_id is null then
    raise exception 'Comentario inexistente' using errcode = 'P0002';
  end if;

  update public.reports
  set status = 'resolved', resolved_by = (select auth.uid()), resolved_at = now()
  where comment_id = target_comment_id and status = 'open';

  insert into public.moderation_actions (moderator_id, action, target_user_id, comment_id, reason)
  values (
    (select auth.uid()),
    case decision when 'restore' then 'restore_comment' else 'delete_comment' end::public.moderation_action_type,
    author_id,
    target_comment_id,
    reason
  );

  if decision = 'delete' then
    insert into public.notifications (user_id, type, entity_id, data)
    values (author_id, 'comment_moderated', target_comment_id, jsonb_build_object('reason', reason));
  end if;
end;
$$;

-- Suspensión: días = null significa permanente; días = 0 levanta la suspensión.
create or replace function public.suspend_user(target_user_id uuid, days integer, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  until timestamptz := case
    when days is null then 'infinity'::timestamptz
    when days = 0 then null
    else now() + make_interval(days => days)
  end;
begin
  if not public.is_moderator() then
    raise exception 'Solo moderadores' using errcode = '42501';
  end if;
  if days < 0 then
    raise exception 'Días inválidos' using errcode = '22023';
  end if;
  if target_user_id = (select auth.uid()) then
    raise exception 'No puedes suspenderte a ti mismo' using errcode = '22023';
  end if;

  update public.profiles set suspended_until = until where id = target_user_id;

  insert into public.moderation_actions (moderator_id, action, target_user_id, reason, suspended_until)
  values (
    (select auth.uid()),
    case when until is null then 'unsuspend_user' else 'suspend_user' end::public.moderation_action_type,
    target_user_id,
    reason,
    until
  );
end;
$$;

-- ─────────────────────────────────────────────────────────────
-- Populares del momento: popularidad IGDB + actividad interna de 7 días
-- ─────────────────────────────────────────────────────────────

create materialized view public.trending_games as
with activity as (
  select game_id, count(*) as events
  from (
    select game_id from public.favorites where created_at > now() - interval '7 days'
    union all
    select game_id from public.comments where status = 'visible' and created_at > now() - interval '7 days'
  ) recent
  group by game_id
),
scored as (
  select
    g.id as game_id,
    coalesce(g.popularity / nullif(max(g.popularity) over (), 0), 0) as external_score,
    coalesce(a.events::double precision / nullif(max(a.events) over (), 0), 0) as internal_score
  from public.games g
  left join activity a on a.game_id = g.id
)
select game_id, external_score * 0.6 + internal_score * 0.4 as score
from scored
where external_score > 0 or internal_score > 0;

create unique index trending_games_game_idx on public.trending_games (game_id);
create index trending_games_score_idx on public.trending_games (score desc);

create or replace function public.refresh_trending_games()
returns void
language sql
security definer
set search_path = ''
as $$
  refresh materialized view concurrently public.trending_games;
$$;

-- ─────────────────────────────────────────────────────────────
-- Privilegios por columna
-- Supabase concede todo a anon/authenticated por defecto; se restringe
-- a lo que el cliente realmente puede escribir. Lo demás lo hacen
-- triggers o RPC con security definer.
-- ─────────────────────────────────────────────────────────────

revoke insert, update, delete, truncate, references, trigger on all tables in schema public from anon, authenticated;

grant update (username, display_name, avatar_url, bio, is_private, platforms, onboarding_completed_at)
  on public.profiles to authenticated;
grant insert on public.favorites to authenticated;
grant delete on public.favorites to authenticated;
grant insert (user_id, game_id, body, is_spoiler) on public.comments to authenticated;
grant update (body, is_spoiler, status) on public.comments to authenticated;
grant insert, delete on public.comment_likes to authenticated;
grant insert (follower_id, following_id) on public.follows to authenticated;
grant update (status) on public.follows to authenticated;
grant delete on public.follows to authenticated;
grant insert, delete on public.blocks to authenticated;
grant insert (reporter_id, comment_id, reason, details) on public.reports to authenticated;
grant update (read_at) on public.notifications to authenticated;

revoke select on public.banned_terms from anon, authenticated;
grant select on public.trending_games to anon, authenticated;

revoke execute on function public.refresh_trending_games() from public, anon, authenticated;
revoke execute on function public.moderate_comment(bigint, text, text) from public, anon;
revoke execute on function public.suspend_user(uuid, integer, text) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.platforms enable row level security;
alter table public.genres enable row level security;
alter table public.companies enable row level security;
alter table public.game_platforms enable row level security;
alter table public.game_genres enable row level security;
alter table public.game_companies enable row level security;
alter table public.game_media enable row level security;
alter table public.favorites enable row level security;
alter table public.comments enable row level security;
alter table public.comment_likes enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_actions enable row level security;
alter table public.banned_terms enable row level security;

-- Catálogo: lectura pública; escritura solo con service role (que ignora RLS).
create policy "catálogo público" on public.games for select to anon, authenticated using (true);
create policy "catálogo público" on public.platforms for select to anon, authenticated using (true);
create policy "catálogo público" on public.genres for select to anon, authenticated using (true);
create policy "catálogo público" on public.companies for select to anon, authenticated using (true);
create policy "catálogo público" on public.game_platforms for select to anon, authenticated using (true);
create policy "catálogo público" on public.game_genres for select to anon, authenticated using (true);
create policy "catálogo público" on public.game_companies for select to anon, authenticated using (true);
create policy "catálogo público" on public.game_media for select to anon, authenticated using (true);

-- Perfiles: públicos, salvo para quien fue bloqueado por el dueño.
create policy "perfiles visibles" on public.profiles for select to anon, authenticated
  using (not public.has_blocked(id, (select auth.uid())));
create policy "editar perfil propio" on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Favoritos
create policy "favoritos visibles según privacidad" on public.favorites for select to anon, authenticated
  using (public.can_view_profile_content(user_id));
create policy "agregar favorito propio" on public.favorites for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy "quitar favorito propio" on public.favorites for delete to authenticated
  using (user_id = (select auth.uid()));

-- Comentarios
create policy "comentarios visibles" on public.comments for select to anon, authenticated
  using (
    (status = 'visible' and not public.is_blocked_between(user_id, (select auth.uid())))
    or user_id = (select auth.uid())
    or public.is_moderator()
  );
create policy "comentar" on public.comments for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy "editar o borrar comentario propio" on public.comments for update to authenticated
  using (user_id = (select auth.uid()) and status <> 'deleted')
  with check (user_id = (select auth.uid()));

-- Likes: nadie ve quién dio like a qué; cada uno ve solo los suyos.
create policy "ver likes propios" on public.comment_likes for select to authenticated
  using (user_id = (select auth.uid()));
create policy "dar like" on public.comment_likes for insert to authenticated
  with check (user_id = (select auth.uid()) and public.is_active_user());
create policy "quitar like" on public.comment_likes for delete to authenticated
  using (user_id = (select auth.uid()));

-- Follows: listas públicas (no configurables en el MVP).
create policy "follows públicos" on public.follows for select to anon, authenticated
  using (true);
create policy "seguir" on public.follows for insert to authenticated
  with check (follower_id = (select auth.uid()) and public.is_active_user());
create policy "aceptar solicitud" on public.follows for update to authenticated
  using (following_id = (select auth.uid()))
  with check (following_id = (select auth.uid()) and status = 'accepted');
create policy "dejar de seguir o quitar seguidor" on public.follows for delete to authenticated
  using (follower_id = (select auth.uid()) or following_id = (select auth.uid()));

-- Bloqueos: privados del que bloquea.
create policy "ver bloqueos propios" on public.blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "bloquear" on public.blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "desbloquear" on public.blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Reportes
create policy "reportar" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()) and public.is_active_user());
create policy "ver reportes" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_moderator());

-- Notificaciones
create policy "ver notificaciones propias" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "marcar notificaciones leídas" on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Registro de moderación
create policy "moderadores ven el registro" on public.moderation_actions for select to authenticated
  using (public.is_moderator());

-- banned_terms: sin políticas → inaccesible para clientes.

-- ─────────────────────────────────────────────────────────────
-- Storage: avatares (A3: máx. 2 MB, JPG/PNG/WebP)
-- ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Cada usuario escribe solo dentro de avatars/<su uid>/…
create policy "subir avatar propio" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "reemplazar avatar propio" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "borrar avatar propio" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
