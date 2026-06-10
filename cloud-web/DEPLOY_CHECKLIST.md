# Beta Deploy Checklist

## Required before live

- Create or link a dedicated Vercel project
- Set its Vercel root directory to `cloud-web`
- Add Vercel env vars:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
- Run `supabase/migrations/20260609_000001_workspace_foundation.sql`
- Run `supabase/migrations/20260610_000002_auth_rls_fix.sql`
  - Use Supabase SQL Editor, or link the project and run `supabase db push`
- Enable Supabase Magic Link
- Enable Google OAuth if needed
- Add the Vercel production domain to Supabase Auth redirect URLs

## Verify before launch

- `npm run lint`
- `npm run build`
- `npm run test:smoke`
- Open `/api/health`
- Sign in with magic link
- Reach `/app`
- Create one task
- Create one event
- Save one focus session
- Confirm a `viewer` workspace member can read but cannot create/update/delete tasks
- Confirm an `editor` can create/update/delete tasks/events/focus sessions but cannot manage members
- Confirm an `owner` cannot demote or delete the last workspace owner

## Acceptable beta limitations

- Demo mode is shown when Supabase env is missing
- Workspace dashboard currently loads a limited recent set of records
- Event recurrence UI is not finished yet
- Notion-like task blocks are not wired into the workspace UI yet
