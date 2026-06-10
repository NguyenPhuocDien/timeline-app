create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_member_role') then
    create type public.workspace_member_role as enum ('owner', 'editor', 'viewer');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type public.task_status as enum ('backlog', 'todo', 'doing', 'done', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_priority') then
    create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_status') then
    create type public.event_status as enum ('scheduled', 'cancelled', 'completed');
  end if;

  if not exists (select 1 from pg_type where typname = 'task_block_kind') then
    create type public.task_block_kind as enum ('heading', 'paragraph', 'checklist', 'log', 'quote');
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  default_workspace_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  drop constraint if exists profiles_default_workspace_id_fkey;

alter table public.profiles
  add constraint profiles_default_workspace_id_fkey
  foreign key (default_workspace_id) references public.workspaces(id) on delete set null;

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.workspace_member_role not null default 'viewer',
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  color text not null default '#38bdf8',
  created_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id, name)
);

create table if not exists public.views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  kind text not null,
  config jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  description text,
  status public.event_status not null default 'scheduled',
  timezone text not null default 'UTC',
  start_at timestamptz not null,
  end_at timestamptz not null,
  recurrence_rule text,
  linked_task_id uuid,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_at > start_at)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  start_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  estimate_minutes integer not null default 0,
  actual_minutes integer not null default 0,
  energy integer not null default 3 check (energy between 1 and 5),
  event_id uuid references public.events(id) on delete set null,
  tags text[] not null default '{}'::text[],
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.events
  drop constraint if exists events_linked_task_id_fkey;

alter table public.events
  add constraint events_linked_task_id_fkey
  foreign key (linked_task_id) references public.tasks(id) on delete set null;

create table if not exists public.task_blocks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  kind public.task_block_kind not null,
  content text not null default '',
  position integer not null default 0,
  checked boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  planned_minutes integer not null default 25,
  actual_minutes integer not null default 0,
  break_minutes integer not null default 0,
  interruptions integer not null default 0,
  started_at timestamptz not null,
  ended_at timestamptz,
  device_label text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  daily_focus_target_minutes integer not null default 180,
  default_focus_minutes integer not null default 50,
  short_break_minutes integer not null default 5,
  long_break_minutes integer not null default 20,
  week_starts_on integer not null default 1 check (week_starts_on between 0 and 6),
  timezone text not null default 'UTC',
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_tasks_workspace_updated on public.tasks(workspace_id, updated_at desc);
create index if not exists idx_events_workspace_start on public.events(workspace_id, start_at asc);
create index if not exists idx_focus_sessions_workspace_started on public.focus_sessions(workspace_id, started_at desc);
create index if not exists idx_task_blocks_task_position on public.task_blocks(task_id, position asc);

create or replace function public.set_current_timestamp_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists workspaces_set_updated_at on public.workspaces;
create trigger workspaces_set_updated_at
before update on public.workspaces
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists task_blocks_set_updated_at on public.task_blocks;
create trigger task_blocks_set_updated_at
before update on public.task_blocks
for each row execute procedure public.set_current_timestamp_updated_at();

drop trigger if exists workspace_settings_set_updated_at on public.workspace_settings;
create trigger workspace_settings_set_updated_at
before update on public.workspace_settings
for each row execute procedure public.set_current_timestamp_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members member
    where member.workspace_id = target_workspace_id
      and member.user_id = auth.uid()
      and member.role = 'owner'
  );
$$;

create or replace function public.bootstrap_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_workspace_id uuid;
  default_name text;
  default_slug text;
begin
  default_name := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1), 'Personal Workspace');
  default_slug := lower(replace(regexp_replace(default_name, '[^a-zA-Z0-9]+', '-', 'g'), '--', '-')) || '-' || left(new.id::text, 8);

  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, default_name)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name;

  insert into public.workspaces (owner_id, name, slug, timezone)
  values (new.id, default_name || '''s Workspace', default_slug, 'Asia/Bangkok')
  returning id into new_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (new_workspace_id, new.id, 'owner');

  insert into public.workspace_settings (workspace_id, timezone)
  values (new_workspace_id, 'Asia/Bangkok')
  on conflict (workspace_id) do nothing;

  update public.profiles
  set default_workspace_id = new_workspace_id
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.bootstrap_personal_workspace();

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.labels enable row level security;
alter table public.views enable row level security;
alter table public.activity_logs enable row level security;
alter table public.tasks enable row level security;
alter table public.task_blocks enable row level security;
alter table public.events enable row level security;
alter table public.focus_sessions enable row level security;
alter table public.workspace_settings enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_member_select" on public.workspaces;
create policy "workspaces_member_select"
on public.workspaces for select
using (public.is_workspace_member(id));

drop policy if exists "workspaces_owner_update" on public.workspaces;
create policy "workspaces_owner_update"
on public.workspaces for update
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "workspace_members_member_select" on public.workspace_members;
create policy "workspace_members_member_select"
on public.workspace_members for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_members_owner_manage" on public.workspace_members;
create policy "workspace_members_owner_manage"
on public.workspace_members for all
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

drop policy if exists "labels_member_all" on public.labels;
create policy "labels_member_all"
on public.labels for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "views_member_all" on public.views;
create policy "views_member_all"
on public.views for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "activity_logs_member_select" on public.activity_logs;
create policy "activity_logs_member_select"
on public.activity_logs for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "activity_logs_member_insert" on public.activity_logs;
create policy "activity_logs_member_insert"
on public.activity_logs for insert
with check (public.is_workspace_member(workspace_id));

drop policy if exists "tasks_member_all" on public.tasks;
create policy "tasks_member_all"
on public.tasks for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "task_blocks_member_all" on public.task_blocks;
create policy "task_blocks_member_all"
on public.task_blocks for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "events_member_all" on public.events;
create policy "events_member_all"
on public.events for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "focus_sessions_member_all" on public.focus_sessions;
create policy "focus_sessions_member_all"
on public.focus_sessions for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

drop policy if exists "workspace_settings_member_all" on public.workspace_settings;
create policy "workspace_settings_member_all"
on public.workspace_settings for all
using (public.is_workspace_member(workspace_id))
with check (public.is_workspace_member(workspace_id));

comment on table public.tasks is 'Task records with lightweight tags, schedule metadata, and event linking.';
comment on table public.events is 'Calendar-grade event records with timezone and recurrence rule storage.';
comment on table public.focus_sessions is 'Pomodoro/focus execution history used for analytics and multi-device continuity.';
