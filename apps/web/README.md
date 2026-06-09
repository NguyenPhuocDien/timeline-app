# Timeline Focus Cloud

Modern product foundation for the new public version of Timeline Focus.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind 4
- Supabase Auth + Postgres + RLS

## Main product idea 

This version is no longer modeled as a local todo app. It is a cloud-first workspace product:

- one account
- one default workspace
- multiple devices sharing the same source of truth
- structured tasks, calendar events, and focus sessions

## Run locally

1. Copy `.env.example` to `.env.local`
2. Fill Supabase credentials
3. Run the SQL in `supabase/migrations/20260609_000001_workspace_foundation.sql`
4. Enable Magic Link and optionally Google in Supabase Auth providers
5. Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Important routes

- `/` marketing homepage
- `/login` magic-link and Google sign-in entry
- `/app` redirect to the signed-in user's default workspace
- `/w/demo-workspace` demo shell without live auth
- `/w/[workspaceId]` workspace dashboard

## Database bootstrap

Run the SQL migration in:

```bash
supabase/migrations/20260609_000001_workspace_foundation.sql
```

This migration creates:

- profiles
- workspaces
- workspace_members
- tasks
- task_blocks
- events
- focus_sessions
- labels
- views
- activity_logs
- workspace_settings

It also installs a trigger that creates a personal workspace automatically for each new authenticated user.

## First live task flow

- Create task directly from `/w/[workspaceId]`
- Mark task as `doing` or `done`
- Archive task without hard delete
- Every mutation writes an activity log row

## Legacy migration command

```bash
npm run migrate:legacy-json -- --file ../../legacy-export.json --user-id <supabase-user-uuid> --dry-run
```

Then run again without `--dry-run` when the summary looks correct.
