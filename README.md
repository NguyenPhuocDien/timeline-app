# Timeline App

Timeline Focus is organized as a lightweight monorepo.

| Project | Stack | Purpose |
| --- | --- | --- |
| `apps/web` | Static HTML/CSS/JS, Firebase | Existing PWA interface and Firebase synchronization |
| `docs/archive` | Markdown | Historical audit, rollout, and deployment notes |
| `docs/prototypes` | Static prototypes | Archived design/demo references, not deployed |
| `tests/e2e` | Playwright | End-to-end tests for the web app |
| `packages` | Workspace packages | Future shared code |
| `tools` | Node scripts | Local debugging and maintenance utilities |

Open `timeline-focus.code-workspace` in VS Code to see the monorepo and web app roots.

## Commands

```bash
npm install
npm run dev
npm run test:e2e
```

## Structure

```text
apps/web          Deployable Firebase PWA
docs/archive      Project documentation migrated from the old app folder
docs/prototypes   Archived prototypes and visual references
packages          Shared packages when extraction becomes useful
tests/e2e         Playwright e2e tests
tools             Local-only scripts
```

See `docs/PROJECT_STRUCTURE.md` for the architecture rationale and references.
