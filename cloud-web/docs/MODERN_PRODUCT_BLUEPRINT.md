# Modern Product Blueprint

## Free-first stack

- Frontend: Next.js 16, React 19, TypeScript, Tailwind 4
- Auth + DB: Supabase Auth + Postgres + Row Level Security
- Hosting: Vercel free tier
- Observability later: Sentry free tier

## Product rules

- One user can sign in on many devices and still land in the same workspace.
- Workspace is the source of truth, not browser local storage.
- Tasks, events, and focus sessions are separate entities.
- Analytics is derived from focus session records, not guessed from task status.

## Data model direction

- `profiles`
- `workspaces`
- `workspace_members`
- `tasks`
- `task_blocks`
- `events`
- `focus_sessions`
- `labels`
- `views`
- `activity_logs`
- `workspace_settings`

## Migration path from the legacy app

1. Keep legacy `users/{uid}/...` data readable during the transition.
2. Create a default workspace for each authenticated user.
3. Copy:
   - `users/{uid}/tasks` -> `workspaces/{workspaceId}/tasks`
   - `users/{uid}/events` -> `workspaces/{workspaceId}/events`
   - `users/{uid}/sessions` -> `workspaces/{workspaceId}/focus_sessions`
4. Preserve a rollback snapshot before switching the source of truth.
5. Only after validation, retire legacy read paths.

## What is already scaffolded

- New Next.js app shell in `cloud-web`
- Marketing landing page
- Login route with magic-link and Google OAuth entry points
- Workspace dashboard shell
- Supabase SSR helpers
- Initial Postgres schema with RLS and personal workspace bootstrap trigger

## Immediate next build steps

1. Wire a real Supabase project through `.env.local`
2. Run the SQL migration
3. Build actual CRUD for tasks, events, and focus sessions
4. Write migration scripts from legacy browser JSON/Firebase data into Postgres
5. Replace demo workspace data with live queries everywhere
