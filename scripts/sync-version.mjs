/**
 * sync-version.mjs — single source of truth for the app's cache-busting version.
 *
 * The release version lives in ONE place: the `appVersion` field in root package.json.
 * This script stamps that number into every place the running app reads it:
 *   - apps/web/index.html : every `?v=<N>` query string on local <script> tags
 *   - apps/web/app.js     : the `./sw.js?v=<N>` service-worker registration
 *   - apps/web/sw.js      : the `CACHE_VERSION = 'tlf-v<N>'` constant
 *
 * Usage:
 *   node scripts/sync-version.mjs           # rewrite files to match package.json appVersion
 *   node scripts/sync-version.mjs --check   # exit 1 if any file is out of sync (CI guard)
 *
 * To cut a release: bump `appVersion` in package.json, run `npm run version:sync`, commit.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot, webRoot, readJson } from './static-app-utils.mjs';

const checkOnly = process.argv.includes('--check');

const pkg = await readJson(path.join(repoRoot, 'package.json'));
const version = pkg.appVersion;
if (!Number.isInteger(version) || version <= 0) {
  console.error(`sync-version: "appVersion" in package.json must be a positive integer (got ${JSON.stringify(version)}).`);
  process.exit(1);
}

/** Each target: file + a list of [regex, replacement] rewrite rules. */
const targets = [
  {
    file: path.join(webRoot, 'index.html'),
    rules: [[/\?v=\d+/g, `?v=${version}`]],
  },
  {
    file: path.join(webRoot, 'app.js'),
    rules: [[/sw\.js\?v=\d+/g, `sw.js?v=${version}`]],
  },
  {
    file: path.join(webRoot, 'sw.js'),
    rules: [[/tlf-v\d+/g, `tlf-v${version}`]],
  },
];

let outOfSync = false;
let rewritten = 0;

for (const { file, rules } of targets) {
  const original = await readFile(file, 'utf8');
  let updated = original;
  for (const [pattern, replacement] of rules) {
    updated = updated.replace(pattern, replacement);
  }
  const rel = path.relative(repoRoot, file);
  if (updated === original) continue;

  if (checkOnly) {
    outOfSync = true;
    console.error(`sync-version: ${rel} is NOT in sync with appVersion=${version}.`);
  } else {
    await writeFile(file, updated);
    rewritten += 1;
    console.log(`sync-version: stamped v${version} into ${rel}.`);
  }
}

if (checkOnly) {
  if (outOfSync) {
    console.error('sync-version: run `npm run version:sync` to fix.');
    process.exit(1);
  }
  console.log(`sync-version: all files in sync at v${version}.`);
} else {
  console.log(`sync-version: done (${rewritten} file(s) updated, version v${version}).`);
}
