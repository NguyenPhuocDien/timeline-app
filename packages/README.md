# Packages

Shared, non-deployable code belongs here.

Currently empty — extraction is demand-driven. The shipping product is the
vanilla-JS PWA in `apps/web` (browser-loaded ES modules, no bundler). Do not
move files out of `apps/web/src` into a package until the app actually adopts a
bundler or import-map strategy; until then a shared package can't be imported by
the browser at runtime.

Candidate packages once a build step exists:

- `utils`: date helpers, formatters, constants, type guards.
- `config`: shared ESLint / Prettier configuration.
