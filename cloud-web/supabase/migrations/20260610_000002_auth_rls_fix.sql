create or replace function public.workspace_role(target_workspace_id uuid)
returns public.workspace_member_role
language sql
stable
security definer
set search_path = public
as $$
  select member.role
  from public.workspace_members member
  where member.workspace_id = target_workspace_id
    and member.user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.workspace_role(target_workspace_id) is not null;
$$;

create or replace function public.can_edit_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_role(target_workspace_id) in ('owner', 'editor'), false);
$$;

create or replace function public.can_read_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_member(target_workspace_id);
$$;

create or replace function public.can_manage_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_workspace_owner(target_workspace_id);
$$;

create or replace function public.is_workspace_owner(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.workspace_role(target_workspace_id) = 'owner', false);
$$;

create or replace function public.validate_workspace_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_table_name = 'tasks' and new.event_id is not null then
    if not exists (
      select 1
      from public.events event
      where event.id = new.event_id
        and event.workspace_id = new.workspace_id
    ) then
      raise exception 'Task event_id must reference an event in the same workspace.';
    end if;
  end if;

  if tg_table_name = 'events' and new.linked_task_id is not null then
    if not exists (
      select 1
      from public.tasks task
      where task.id = new.linked_task_id
        and task.workspace_id = new.workspace_id
    ) then
      raise exception 'Event linked_task_id must reference a task in the same workspace.';
    end if;
  end if;

  if tg_table_name = 'focus_sessions' and new.task_id is not null then
    if not exists (
      select 1
      from public.tasks task
      where task.id = new.task_id
        and task.workspace_id = new.workspace_id
    ) then
      raise exception 'Focus session task_id must reference a task in the same workspace.';
    end if;
  end if;

  if tg_table_name = 'task_blocks' then
    if not exists (
      select 1
      from public.tasks task
      where task.id = new.task_id
        and task.workspace_id = new.workspace_id
    ) then
      raise exception 'Task block task_id must reference a task in the same workspace.';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_last_workspace_owner_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' and old.role = 'owner' then
    if not exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = old.workspace_id
        and member.user_id <> old.user_id
        and member.role = 'owner'
    ) then
      raise exception 'Workspace must keep at least one owner.';
    end if;
  end if;

  if tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner' then
    if not exists (
      select 1
      from public.workspace_members member
      where member.workspace_id = old.workspace_id
        and member.user_id <> old.user_id
        and member.role = 'owner'
    ) then
      raise exception 'Workspace must keep at least one owner.';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_workspace_id_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.workspace_id <> new.workspace_id then
    raise exception 'Moving records between workspaces is not supported.';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_validate_workspace_links on public.tasks;
create trigger tasks_validate_workspace_links
before insert or update of workspace_id, event_id on public.tasks
for each row execute function public.validate_workspace_links();

drop trigger if exists events_validate_workspace_links on public.events;
create trigger events_validate_workspace_links
before insert or update of workspace_id, linked_task_id on public.events
for each row execute function public.validate_workspace_links();

drop trigger if exists focus_sessions_validate_workspace_links on public.focus_sessions;
create trigger focus_sessions_validate_workspace_links
before insert or update of workspace_id, task_id on public.focus_sessions
for each row execute function public.validate_workspace_links();

drop trigger if exists task_blocks_validate_workspace_links on public.task_blocks;
create trigger task_blocks_validate_workspace_links
before insert or update of workspace_id, task_id on public.task_blocks
for each row execute function public.validate_workspace_links();

drop trigger if exists tasks_prevent_workspace_id_change on public.tasks;
create trigger tasks_prevent_workspace_id_change
before update of workspace_id on public.tasks
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists events_prevent_workspace_id_change on public.events;
create trigger events_prevent_workspace_id_change
before update of workspace_id on public.events
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists focus_sessions_prevent_workspace_id_change on public.focus_sessions;
create trigger focus_sessions_prevent_workspace_id_change
before update of workspace_id on public.focus_sessions
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists task_blocks_prevent_workspace_id_change on public.task_blocks;
create trigger task_blocks_prevent_workspace_id_change
before update of workspace_id on public.task_blocks
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists labels_prevent_workspace_id_change on public.labels;
create trigger labels_prevent_workspace_id_change
before update of workspace_id on public.labels
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists views_prevent_workspace_id_change on public.views;
create trigger views_prevent_workspace_id_change
before update of workspace_id on public.views
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists activity_logs_prevent_workspace_id_change on public.activity_logs;
create trigger activity_logs_prevent_workspace_id_change
before update of workspace_id on public.activity_logs
for each row execute function public.prevent_workspace_id_change();

drop trigger if exists workspace_members_keep_owner on public.workspace_members;
create trigger workspace_members_keep_owner
before update of role or delete on public.workspace_members
for each row execute function public.prevent_last_workspace_owner_removal();

drop policy if exists "workspaces_owner_update" on public.workspaces;
create policy "workspaces_owner_update"
on public.workspaces for update
using (public.is_workspace_owner(id))
with check (public.is_workspace_owner(id));

drop policy if exists "workspace_members_owner_manage" on public.workspace_members;
drop policy if exists "workspace_members_owner_insert" on public.workspace_members;
drop policy if exists "workspace_members_owner_update" on public.workspace_members;
drop policy if exists "workspace_members_owner_delete" on public.workspace_members;

create policy "workspace_members_owner_insert"
on public.workspace_members for insert
with check (public.is_workspace_owner(workspace_id));

create policy "workspace_members_owner_update"
on public.workspace_members for update
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy "workspace_members_owner_delete"
on public.workspace_members for delete
using (public.is_workspace_owner(workspace_id));

drop policy if exists "labels_member_all" on public.labels;
drop policy if exists "labels_member_select" on public.labels;
drop policy if exists "labels_editor_insert" on public.labels;
drop policy if exists "labels_editor_update" on public.labels;
drop policy if exists "labels_editor_delete" on public.labels;

create policy "labels_member_select"
on public.labels for select
using (public.is_workspace_member(workspace_id));

create policy "labels_editor_insert"
on public.labels for insert
with check (public.can_edit_workspace(workspace_id));

create policy "labels_editor_update"
on public.labels for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "labels_editor_delete"
on public.labels for delete
using (public.can_edit_workspace(workspace_id));

drop policy if exists "views_member_all" on public.views;
drop policy if exists "views_member_select" on public.views;
drop policy if exists "views_editor_insert" on public.views;
drop policy if exists "views_editor_update" on public.views;
drop policy if exists "views_editor_delete" on public.views;

create policy "views_member_select"
on public.views for select
using (public.is_workspace_member(workspace_id));

create policy "views_editor_insert"
on public.views for insert
with check (public.can_edit_workspace(workspace_id));

create policy "views_editor_update"
on public.views for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "views_editor_delete"
on public.views for delete
using (public.can_edit_workspace(workspace_id));

drop policy if exists "activity_logs_member_insert" on public.activity_logs;
drop policy if exists "activity_logs_editor_insert" on public.activity_logs;
create policy "activity_logs_editor_insert"
on public.activity_logs for insert
with check (public.can_edit_workspace(workspace_id));

drop policy if exists "tasks_member_all" on public.tasks;
drop policy if exists "tasks_member_select" on public.tasks;
drop policy if exists "tasks_editor_insert" on public.tasks;
drop policy if exists "tasks_editor_update" on public.tasks;
drop policy if exists "tasks_editor_delete" on public.tasks;

create policy "tasks_member_select"
on public.tasks for select
using (public.is_workspace_member(workspace_id));

create policy "tasks_editor_insert"
on public.tasks for insert
with check (public.can_edit_workspace(workspace_id));

create policy "tasks_editor_update"
on public.tasks for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "tasks_editor_delete"
on public.tasks for delete
using (public.can_edit_workspace(workspace_id));

drop policy if exists "task_blocks_member_all" on public.task_blocks;
drop policy if exists "task_blocks_member_select" on public.task_blocks;
drop policy if exists "task_blocks_editor_insert" on public.task_blocks;
drop policy if exists "task_blocks_editor_update" on public.task_blocks;
drop policy if exists "task_blocks_editor_delete" on public.task_blocks;

create policy "task_blocks_member_select"
on public.task_blocks for select
using (public.is_workspace_member(workspace_id));

create policy "task_blocks_editor_insert"
on public.task_blocks for insert
with check (public.can_edit_workspace(workspace_id));

create policy "task_blocks_editor_update"
on public.task_blocks for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "task_blocks_editor_delete"
on public.task_blocks for delete
using (public.can_edit_workspace(workspace_id));

drop policy if exists "events_member_all" on public.events;
drop policy if exists "events_member_select" on public.events;
drop policy if exists "events_editor_insert" on public.events;
drop policy if exists "events_editor_update" on public.events;
drop policy if exists "events_editor_delete" on public.events;

create policy "events_member_select"
on public.events for select
using (public.is_workspace_member(workspace_id));

create policy "events_editor_insert"
on public.events for insert
with check (public.can_edit_workspace(workspace_id));

create policy "events_editor_update"
on public.events for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "events_editor_delete"
on public.events for delete
using (public.can_edit_workspace(workspace_id));

drop policy if exists "focus_sessions_member_all" on public.focus_sessions;
drop policy if exists "focus_sessions_member_select" on public.focus_sessions;
drop policy if exists "focus_sessions_editor_insert" on public.focus_sessions;
drop policy if exists "focus_sessions_editor_update" on public.focus_sessions;
drop policy if exists "focus_sessions_editor_delete" on public.focus_sessions;

create policy "focus_sessions_member_select"
on public.focus_sessions for select
using (public.is_workspace_member(workspace_id));

create policy "focus_sessions_editor_insert"
on public.focus_sessions for insert
with check (public.can_edit_workspace(workspace_id));

create policy "focus_sessions_editor_update"
on public.focus_sessions for update
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

create policy "focus_sessions_editor_delete"
on public.focus_sessions for delete
using (public.can_edit_workspace(workspace_id));

drop policy if exists "workspace_settings_member_all" on public.workspace_settings;
drop policy if exists "workspace_settings_member_select" on public.workspace_settings;
drop policy if exists "workspace_settings_editor_insert" on public.workspace_settings;
drop policy if exists "workspace_settings_editor_update" on public.workspace_settings;
drop policy if exists "workspace_settings_editor_delete" on public.workspace_settings;
drop policy if exists "workspace_settings_owner_insert" on public.workspace_settings;
drop policy if exists "workspace_settings_owner_update" on public.workspace_settings;
drop policy if exists "workspace_settings_owner_delete" on public.workspace_settings;

create policy "workspace_settings_member_select"
on public.workspace_settings for select
using (public.is_workspace_member(workspace_id));

create policy "workspace_settings_owner_insert"
on public.workspace_settings for insert
with check (public.is_workspace_owner(workspace_id));

create policy "workspace_settings_owner_update"
on public.workspace_settings for update
using (public.is_workspace_owner(workspace_id))
with check (public.is_workspace_owner(workspace_id));

create policy "workspace_settings_owner_delete"
on public.workspace_settings for delete
using (public.is_workspace_owner(workspace_id));
