# Timeline Focus Cloud Web

Next.js/Supabase edition of Timeline Focus.

This is an independent product from the Firebase PWA in `../legacy-pwa`.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript 5
- Tailwind 4
- Supabase Auth + Postgres + RLS

## Local run

1. Copy `.env.example` to `.env.local`
2. Fill the Supabase values
3. Run the SQL migrations in order:
   - `supabase/migrations/20260609_000001_workspace_foundation.sql`
   - `supabase/migrations/20260610_000002_auth_rls_fix.sql`
4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Important routes

- `/` marketing homepage
- `/login` login page
- `/app` redirect to the signed-in user's default workspace
- `/w/demo-workspace` demo shell without live auth
- `/w/[workspaceId]` workspace dashboard
- `/api/health` runtime health endpoint

## Deploy

- Vercel root directory: `cloud-web`
- Production config: `cloud-web/vercel.json`
- Required environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

Without Supabase env, the app still builds but falls back to demo workspace mode.

## Supabase migrations

Run migrations in Supabase SQL Editor, or link the project with Supabase CLI and run:

```bash
supabase db push
```

The production hardening migration is `supabase/migrations/20260610_000002_auth_rls_fix.sql`. It locks viewer/editor/owner permissions and prevents cross-workspace record links.

Before opening the app to multiple users, verify `/api/health` returns
`database: "ok"` and run `npm run test:smoke` against this project's
production URL.
