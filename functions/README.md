# Cloud Functions — Google Calendar two-way sync

Backend bridge for syncing the app's events/tasks with Google Calendar.
See [../docs/GCAL_TWO_WAY_SETUP.md](../docs/GCAL_TWO_WAY_SETUP.md) for the design and Pha 0 setup.

## Layout
- `index.js` — function entry points (OAuth, Firestore triggers, webhook, cron).
- `lib/config.js` — region, scopes, calendar name, Firestore paths.
- `lib/oauth.js` — Google OAuth2 client + offline-access consent URL.
- `lib/crypto.js` — AES-256-GCM for the refresh token at rest.
- `lib/firestore.js` — Admin Firestore access (tokens/state/links).
- `lib/calendar.js` — ensure "Timeline Focus" calendar + app↔Google mapping.

This package is intentionally **outside the npm workspaces** and **outside `apps/web/`**
so the root `validate`/`build` pipeline never scans it. It deploys separately.

## Secrets (do NOT commit)
```
firebase functions:secrets:set GCAL_CLIENT_ID
firebase functions:secrets:set GCAL_CLIENT_SECRET
firebase functions:secrets:set GCAL_TOKEN_KEY   # openssl rand -base64 32
```

## Local / deploy
```
cd functions && npm install
npm run serve     # emulator
npm run deploy    # firebase deploy --only functions (requires Blaze)
```

> The deploy command uses `--config ../apps/web/firebase.json`. Confirm the
> `functions.source` path resolves correctly on the first real deploy (Pha 1).
