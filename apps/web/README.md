# Timeline Focus Legacy PWA

Firebase edition of Timeline Focus. This is the static PWA with Google login,
Firestore synchronization, offline local storage, and the currently deployed
legacy interface.

This app lives in the monorepo at `apps/web`. Shared docs are in
`../../docs`, and Playwright e2e tests are in `../../tests/e2e`.

Only production runtime assets should live in this folder. Historical pages,
prototypes, and one-off debug scripts belong in `../../docs` or `../../tools`
so static hosting stays clean.

## Local run

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:4173`.

## Test

```bash
npm run test:e2e
```

## Deploy

Use this folder as the Vercel project root. Its `vercel.json` keeps the
Firebase authentication rewrites and security headers required by the PWA.
