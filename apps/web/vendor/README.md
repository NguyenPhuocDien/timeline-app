# Vendor Assets

This folder contains browser runtime dependencies that the static PWA loads without a bundler.

- `dexie.min.js`: IndexedDB wrapper imported by `src/core/storage.js` and pre-cached by `sw.js`.

Do not archive or delete these files until the web app moves to a bundler-managed dependency flow.
