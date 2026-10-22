-- ClimaxGame · ajustes tras los avisos del linter de Supabase
-- 1. Las funciones auxiliares de RLS pasan a un esquema "private" que la Data API no expone.
--    Las políticas siguen funcionando: referencian las funciones por OID.
-- 2. Las funciones de trigger dejan de ser ejecutables por clientes (los triggers no lo necesitan).
-- 3. Índices para claves foráneas usadas en borrados en cascada.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

alter function public.is_moderator() set schema private;
alter function public.is_active_user() set schema private;
alter function public.is_blocked_between(uuid, uuid) set schema private;
alter function public.has_blocked(uuid, uuid) set schema private;
alter function public.can_view_profile_content(uuid) set schema private;
alter function public.check_comment_content(uuid, text) set schema private;

-- check_comment_content solo la usan los triggers (security definer).
revoke execute on function private.check_comment_content(uuid, text) from public, anon, authenticated;

-- Los cuerpos de funciones SQL/plpgsql resuelven nombres al ejecutarse:
-- se actualizan las que llamaban a las funciones movidas.

create or replace function private.can_view_profile_content(owner_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    owner_id = (select auth.uid())
    or (
      not private.is_blocked_between(owner_id, (select auth.uid()))
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

  perform private.check_comment_content(new.user_id, new.body);
  new.status := 'visible';
  new.likes_count := 0;
  new.reports_count := 0;
  new.edited_at := null;
  return new;
end;
$$;

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
     and not private.is_moderator() then
    raise exception 'No tienes permiso para cambiar el estado del comentario'
      using errcode = '42501';
  end if;

  if new.body is distinct from old.body then
    perform private.check_comment_content(new.user_id, new.body);
    new.edited_at := now();
  end if;
  return new;
end;
$$;

create or replace function public.follows_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_blocked_between(new.follower_id, new.following_id) then
    raise exception 'No puedes seguir a este usuario' using errcode = '42501';
  end if;

  new.status := case
    when (select is_private from public.profiles where id = new.following_id) then 'pending'
    else 'accepted'
  end::public.follow_status;
  return new;
end;
$$;

create or replace function public.moderate_comment(target_comment_id bigint, decision text, reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  author_id uuid;
begin
  if not private.is_moderator() then
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
  if not private.is_moderator() then
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

-- Funciones de trigger: nadie necesita llamarlas por RPC.
revoke execute on function public.profiles_before_update() from public, anon, authenticated;
revoke execute on function public.comments_before_insert() from public, anon, authenticated;
revoke execute on function public.comments_before_update() from public, anon, authenticated;
revoke execute on function public.comment_likes_before_insert() from public, anon, authenticated;
revoke execute on function public.follows_before_insert() from public, anon, authenticated;
revoke execute on function public.blocks_after_insert() from public, anon, authenticated;
revoke execute on function public.reports_before_insert() from public, anon, authenticated;
revoke execute on function public.reports_after_insert() from public, anon, authenticated;
revoke execute on function public.favorites_counters() from public, anon, authenticated;
revoke execute on function public.comments_counters() from public, anon, authenticated;
revoke execute on function public.comment_likes_after_change() from public, anon, authenticated;
revoke execute on function public.follows_after_change() from public, anon, authenticated;

-- Claves foráneas sin índice (borrado de cuentas en cascada).
create index notifications_actor_idx on public.notifications (actor_id);
create index reports_resolved_by_idx on public.reports (resolved_by);
create index moderation_actions_moderator_idx on public.moderation_actions (moderator_id);
create index moderation_actions_target_user_idx on public.moderation_actions (target_user_id);
create index moderation_actions_comment_idx on public.moderation_actions (comment_id);
