# Packages

Shared, non-deployable code belongs here.

Suggested future packages:

- `ui`: reusable React components and design tokens after the web app moves to React/Next.js.
- `utils`: date helpers, formatters, constants, and type guards.
- `config`: shared ESLint, TypeScript, Prettier, and Tailwind configuration.
- `types`: shared TypeScript types, Zod schemas, and API contracts.

Keep package extraction demand-driven. Do not move browser-loaded files from `apps/web/src` into packages until the app has a bundler or import-map strategy.
