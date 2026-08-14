-- Hajimeru optional cloud sync schema.
--
-- Supabase's managed storage encryption protects database files at rest. This
-- schema adds per-user authorization and sync semantics; it deliberately does
-- not pretend that RLS is application-layer or end-to-end encryption.

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_text text not null,
  task_category text,
  assessment jsonb not null default '{}'::jsonb,
  plan jsonb not null default '{}'::jsonb,
  timer_minutes smallint,
  status text not null default 'planned',
  started_at timestamptz,
  ended_at timestamptz,
  pre_aversion smallint,
  post_aversion smallint,
  actual_difficulty smallint,
  continue_intent boolean,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  constraint attempts_task_text_length check (
    char_length(btrim(task_text)) between 1 and 500
  ),
  constraint attempts_task_category_length check (
    task_category is null or char_length(task_category) <= 60
  ),
  constraint attempts_assessment_object check (
    jsonb_typeof(assessment) = 'object'
  ),
  constraint attempts_plan_object check (
    jsonb_typeof(plan) = 'object'
  ),
  constraint attempts_timer_minutes check (
    timer_minutes is null or timer_minutes in (1, 3, 5)
  ),
  constraint attempts_status check (
    status in (
      'planned',
      'started',
      'stopped_success',
      'continued',
      'stuck',
      'abandoned'
    )
  ),
  constraint attempts_pre_aversion check (
    pre_aversion is null or pre_aversion between 0 and 10
  ),
  constraint attempts_post_aversion check (
    post_aversion is null or post_aversion between 0 and 10
  ),
  constraint attempts_actual_difficulty check (
    actual_difficulty is null or actual_difficulty between 0 and 10
  ),
  constraint attempts_end_after_start check (
    ended_at is null or started_at is null or ended_at >= started_at
  ),
  constraint attempts_deleted_after_created check (
    deleted_at is null or deleted_at >= created_at
  )
);

create table public.daily_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state_date date not null,
  sleep_quality smallint,
  mood smallint,
  arousal smallint,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  constraint daily_states_one_per_day unique (user_id, state_date),
  constraint daily_states_sleep_quality check (
    sleep_quality is null or sleep_quality between 0 and 10
  ),
  constraint daily_states_mood check (
    mood is null or mood between 0 and 10
  ),
  constraint daily_states_arousal check (
    arousal is null or arousal between 0 and 10
  ),
  constraint daily_states_has_value check (
    sleep_quality is not null or mood is not null or arousal is not null
  ),
  constraint daily_states_deleted_after_created check (
    deleted_at is null or deleted_at >= created_at
  )
);

create table public.preferences (
  id uuid primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  notifications_enabled boolean not null default false,
  ai_consent boolean not null default false,
  sync_enabled boolean not null default true,
  accessibility jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  deleted_at timestamptz,
  constraint preferences_accessibility_object check (
    jsonb_typeof(accessibility) = 'object'
  ),
  constraint preferences_id_matches_owner check (id = user_id),
  constraint preferences_deleted_after_created check (
    deleted_at is null or deleted_at >= created_at
  )
);

create table public.tombstones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  deleted_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null default (clock_timestamp() + interval '30 days'),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  constraint tombstones_entity_type check (
    entity_type in ('attempts', 'daily_states', 'preferences')
  ),
  constraint tombstones_entity_unique unique (user_id, entity_type, entity_id),
  constraint tombstones_retention_window check (
    expires_at >= deleted_at + interval '30 days'
    and expires_at <= deleted_at + interval '30 days 1 second'
  )
);

comment on table public.attempts is
  'Optional per-user sync of task attempts. Sensitive text relies on the managed platform encryption-at-rest boundary.';
comment on table public.daily_states is
  'Optional per-user sync of daily self-observations; values are not diagnoses.';
comment on table public.preferences is
  'Optional per-user sync preferences and explicit consent flags.';
comment on table public.tombstones is
  'Deletion markers retained for exactly 30 days so offline clients do not resurrect removed records.';

create index attempts_user_updated_idx
  on public.attempts (user_id, updated_at desc);
create index daily_states_user_updated_idx
  on public.daily_states (user_id, updated_at desc);
create index preferences_user_updated_idx
  on public.preferences (user_id, updated_at desc);
create index tombstones_user_updated_idx
  on public.tombstones (user_id, updated_at desc);
create index tombstones_expiry_idx
  on public.tombstones (expires_at);

-- Last-write-wins is based on the timestamp supplied by the syncing client.
-- A stale upsert is accepted but resolves to the old row. Equal timestamps are
-- deterministic: deletion wins an equal-time live write, then a bytewise-
-- greater serialized row wins remaining ties, so clients converge without
-- silently changing timestamps.
create or replace function public.resolve_updated_at_lww()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.updated_at < old.updated_at then
    return old;
  end if;

  if new.updated_at = old.updated_at then
    if old.deleted_at is not null and new.deleted_at is null then
      return old;
    end if;
    if new.deleted_at is not null and old.deleted_at is null then
      return new;
    end if;
    if row_to_json(new)::text <= row_to_json(old)::text then
      return old;
    end if;
  end if;

  return new;
end;
$$;

create trigger attempts_resolve_updated_at_lww
before update on public.attempts
for each row execute function public.resolve_updated_at_lww();

create trigger daily_states_resolve_updated_at_lww
before update on public.daily_states
for each row execute function public.resolve_updated_at_lww();

create trigger preferences_resolve_updated_at_lww
before update on public.preferences
for each row execute function public.resolve_updated_at_lww();

create trigger tombstones_resolve_updated_at_lww
before update on public.tombstones
for each row execute function public.resolve_updated_at_lww();

-- These guards prevent clients from taking ownership of a row during update.
-- They also ensure the tombstone expiry remains derived from deleted_at.
create or replace function public.preserve_sync_owner()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if new.user_id <> old.user_id then
    raise exception using
      errcode = '42501',
      message = 'user_id is immutable';
  end if;
  return new;
end;
$$;

create or replace function public.normalize_tombstone()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.expires_at := new.deleted_at + interval '30 days';
  return new;
end;
$$;

create trigger attempts_preserve_sync_owner
before update on public.attempts
for each row execute function public.preserve_sync_owner();

create trigger daily_states_preserve_sync_owner
before update on public.daily_states
for each row execute function public.preserve_sync_owner();

create trigger preferences_preserve_sync_owner
before update on public.preferences
for each row execute function public.preserve_sync_owner();

create trigger tombstones_preserve_sync_owner
before update on public.tombstones
for each row execute function public.preserve_sync_owner();

create trigger tombstones_normalize_retention
before insert or update of deleted_at, expires_at on public.tombstones
for each row execute function public.normalize_tombstone();

-- Both recommended soft deletes and physical deletes produce a tombstone.
-- The function is SECURITY DEFINER only so an ordinary authenticated delete can
-- insert its matching marker after RLS has authorized the source row.
create or replace function public.capture_sync_tombstone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_id uuid;
  source_id uuid;
  removed_at timestamptz;
begin
  if current_setting('hajimeru.skip_tombstones', true) = 'on' then
    return null;
  end if;

  if tg_op = 'DELETE' then
    owner_id := old.user_id;
    source_id := old.id;
    removed_at := clock_timestamp();
  elsif old.deleted_at is null and new.deleted_at is not null then
    owner_id := new.user_id;
    source_id := new.id;
    removed_at := new.deleted_at;
  else
    return null;
  end if;

  insert into public.tombstones (
    user_id,
    entity_type,
    entity_id,
    deleted_at,
    expires_at,
    updated_at
  ) values (
    owner_id,
    tg_table_name,
    source_id,
    removed_at,
    removed_at + interval '30 days',
    removed_at
  )
  on conflict (user_id, entity_type, entity_id)
  do update set
    deleted_at = excluded.deleted_at,
    expires_at = excluded.expires_at,
    updated_at = excluded.updated_at;

  return null;
end;
$$;

-- An explicitly newer live write revives the record and retires an older
-- marker. Equal timestamps keep the deletion, matching the LWW tie policy.
create or replace function public.clear_obsolete_tombstone()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.deleted_at is null then
    delete from public.tombstones
    where user_id = new.user_id
      and entity_type = tg_table_name
      and entity_id = new.id
      and updated_at < new.updated_at;
  end if;
  return null;
end;
$$;

create trigger attempts_capture_soft_delete
after update of deleted_at on public.attempts
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute function public.capture_sync_tombstone();

create trigger attempts_capture_physical_delete
after delete on public.attempts
for each row execute function public.capture_sync_tombstone();

create trigger attempts_clear_obsolete_tombstone
after insert or update on public.attempts
for each row
when (new.deleted_at is null)
execute function public.clear_obsolete_tombstone();

create trigger daily_states_capture_soft_delete
after update of deleted_at on public.daily_states
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute function public.capture_sync_tombstone();

create trigger daily_states_capture_physical_delete
after delete on public.daily_states
for each row execute function public.capture_sync_tombstone();

create trigger daily_states_clear_obsolete_tombstone
after insert or update on public.daily_states
for each row
when (new.deleted_at is null)
execute function public.clear_obsolete_tombstone();

create trigger preferences_capture_soft_delete
after update of deleted_at on public.preferences
for each row
when (old.deleted_at is null and new.deleted_at is not null)
execute function public.capture_sync_tombstone();

create trigger preferences_capture_physical_delete
after delete on public.preferences
for each row execute function public.capture_sync_tombstone();

create trigger preferences_clear_obsolete_tombstone
after insert or update on public.preferences
for each row
when (new.deleted_at is null)
execute function public.clear_obsolete_tombstone();

-- Call from a trusted scheduled job. It is intentionally unavailable to app
-- clients so users cannot remove another device's deletion marker early.
create or replace function public.purge_expired_tombstones()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  removed_count integer;
begin
  delete from public.tombstones where expires_at <= clock_timestamp();
  get diagnostics removed_count = row_count;
  return removed_count;
end;
$$;

-- Explicit privacy action: unlike ordinary record deletion, this immediately
-- removes all synced payloads and the tombstones generated by their triggers.
-- It accepts no user identifier and derives ownership only from the JWT.
create or replace function public.delete_my_synced_data()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  request_user_id uuid := (select auth.uid());
begin
  if request_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'authentication required';
  end if;

  -- Prevent base-table delete triggers from recreating markers during this
  -- explicit privacy wipe. Ordinary application deletes never set this flag.
  perform set_config('hajimeru.skip_tombstones', 'on', true);

  delete from public.attempts where user_id = request_user_id;
  delete from public.daily_states where user_id = request_user_id;
  delete from public.preferences where user_id = request_user_id;
  delete from public.tombstones where user_id = request_user_id;
end;
$$;

revoke all on function public.resolve_updated_at_lww() from public, anon, authenticated;
revoke all on function public.preserve_sync_owner() from public, anon, authenticated;
revoke all on function public.normalize_tombstone() from public, anon, authenticated;
revoke all on function public.capture_sync_tombstone() from public, anon, authenticated;
revoke all on function public.clear_obsolete_tombstone() from public, anon, authenticated;
revoke all on function public.purge_expired_tombstones() from public, anon, authenticated;
revoke all on function public.delete_my_synced_data() from public, anon;
grant execute on function public.purge_expired_tombstones() to service_role;
grant execute on function public.delete_my_synced_data() to authenticated;

revoke all on table public.attempts from public, anon;
revoke all on table public.daily_states from public, anon;
revoke all on table public.preferences from public, anon;
revoke all on table public.tombstones from public, anon;

alter table public.attempts enable row level security;
alter table public.daily_states enable row level security;
alter table public.preferences enable row level security;
alter table public.tombstones enable row level security;

grant select, insert, update, delete on public.attempts to authenticated;
grant select, insert, update, delete on public.daily_states to authenticated;
grant select, insert, update, delete on public.preferences to authenticated;
grant select, insert, update, delete on public.tombstones to authenticated;

create policy attempts_select_own
on public.attempts for select to authenticated
using ((select auth.uid()) = user_id);

create policy attempts_insert_own
on public.attempts for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy attempts_update_own
on public.attempts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy attempts_delete_own
on public.attempts for delete to authenticated
using ((select auth.uid()) = user_id);

create policy daily_states_select_own
on public.daily_states for select to authenticated
using ((select auth.uid()) = user_id);

create policy daily_states_insert_own
on public.daily_states for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy daily_states_update_own
on public.daily_states for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy daily_states_delete_own
on public.daily_states for delete to authenticated
using ((select auth.uid()) = user_id);

create policy preferences_select_own
on public.preferences for select to authenticated
using ((select auth.uid()) = user_id);

create policy preferences_insert_own
on public.preferences for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy preferences_update_own
on public.preferences for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy preferences_delete_own
on public.preferences for delete to authenticated
using ((select auth.uid()) = user_id);

create policy tombstones_select_own
on public.tombstones for select to authenticated
using ((select auth.uid()) = user_id);

create policy tombstones_insert_own
on public.tombstones for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy tombstones_update_own
on public.tombstones for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy tombstones_delete_own_after_expiry
on public.tombstones for delete to authenticated
using (
  (select auth.uid()) = user_id
  and expires_at <= clock_timestamp()
);
