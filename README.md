# Timeline Focus Workspace

This repository contains two independent products:

| Project | Stack | Purpose |
| --- | --- | --- |
| `legacy-pwa` | Static HTML/CSS/JS, Firebase | Existing PWA interface and Firebase synchronization |
| `cloud-web` | Next.js, React, Supabase | New workspace-based product |

Open `timeline-focus.code-workspace` in VS Code to see both products as
separate workspace roots.

## Commands

```bash
npm run dev:legacy
npm run test:legacy
npm run dev:cloud
npm run test:cloud
```

Each folder also has its own `package.json`, README, deployment configuration,
dependencies, and project documentation.

## Deployment isolation

- `legacy-pwa` keeps the existing Vercel link for the legacy production site.
- `cloud-web` must be linked to a different Vercel project before deployment.
- Never link both folders to the same Vercel project or production domain.
