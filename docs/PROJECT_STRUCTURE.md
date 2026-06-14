# Project Structure

## Current Decision

Timeline Focus is now organized as a lightweight monorepo:

```text
timeline-app/
  apps/
    web/                 # Deployable static Firebase PWA
  docs/
    archive/             # Historical audits, rollout notes, deployment docs
    prototypes/          # Archived demos and visual explorations
  packages/              # Future shared code, intentionally empty for now
  tests/
    e2e/                 # Cross-app Playwright tests
  tools/                 # Local-only debugging and maintenance scripts
  .github/workflows/
    ci.yml
  package.json
  turbo.json
  vercel.json
```

The web app is still a static PWA. The structure is ready for a future Next.js migration, but this step avoids changing framework and folder layout at the same time.

## Why This Shape

- `apps/` contains deployable products.
- `packages/` is reserved for shared code only.
- `docs/` is repository-level knowledge, not runtime app code. Historical migration notes live in `docs/archive`.
- `docs/prototypes/` keeps design/demo references outside the deployable app root.
- `tests/e2e/` validates user flows across app boundaries.
- `tools/` is for local-only scripts that should never ship with the PWA.
- The root `package.json` owns workspaces and top-level commands.

## References

- Turborepo recommends following workspace conventions and separating applications from shared packages: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
- Turborepo internal packages are intended for code shared within the workspace: https://turborepo.dev/docs/core-concepts/internal-packages
- Next.js documents `src/app` as the App Router location for a future migration: https://nextjs.org/docs/app/getting-started/project-structure
- npm workspaces provide the package-manager layer for local packages in one repo: https://docs.npmjs.com/cli/v8/using-npm/workspaces

## Next Extraction Targets

1. Move pure date/time helpers from `apps/web/app.js` into `packages/utils` only after a bundler is introduced.
2. Move UI primitives into `packages/ui` during a React/Next.js migration.
3. Add `apps/docs` with Nextra or Docusaurus if docs become a deployable product.
4. Add `services/api` only when backend code exists independently from Firebase/Firestore client sync.
