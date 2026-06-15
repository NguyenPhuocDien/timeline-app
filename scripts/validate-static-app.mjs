import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { init, parse } from 'es-module-lexer';
import {
  localAssetPath,
  pathExists,
  readJson,
  repoRoot,
  walkFiles,
  webRoot,
} from './static-app-utils.mjs';

const errors = [];
const warnings = [];
await init;

function fail(message) {
  errors.push(message);
}

async function requireFile(relativePath, source) {
  const normalized = localAssetPath(relativePath);
  if (!normalized) return;
  if (!(await pathExists(path.join(webRoot, normalized)))) {
    fail(`${source} references missing local asset: ${relativePath}`);
  }
}

const requiredAssets = [
  'index.html',
  'app.js',
  'style.css',
  'manifest.webmanifest',
  'sw.js',
  'vendor/dexie.min.js',
  'src/core/storage.js',
  'src/core/schema.js',
  'src/core/migration.js',
  'src/core/sync-engine.js',
  'src/ui/sync-indicator.js',
];

await Promise.all(requiredAssets.map((asset) => requireFile(asset, 'build')));

const htmlFiles = ['index.html', 'privacy.html', 'terms.html', 'contact.html'];
for (const htmlFile of htmlFiles) {
  const html = await readFile(path.join(webRoot, htmlFile), 'utf8');
  const references = [...html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)]
    .map((match) => match[1]);
  await Promise.all(references.map((reference) => requireFile(reference, htmlFile)));
}

const javascriptFiles = (await walkFiles(webRoot, {
  ignoredDirectories: new Set(['dist', 'node_modules', 'playwright-report', 'test-results']),
})).filter((file) => file.endsWith('.js') && !file.includes(`${path.sep}vendor${path.sep}`));

for (const javascriptFile of javascriptFiles) {
  const source = await readFile(javascriptFile, 'utf8');
  const [imports] = parse(source);
  const importSpecifiers = imports
    .filter((entry) => entry.n)
    .map((entry) => entry.n);

  for (const specifier of importSpecifiers) {
    if (!specifier.startsWith('.')) continue;
    const clean = specifier.split(/[?#]/, 1)[0];
    const target = path.resolve(path.dirname(javascriptFile), clean);
    if (!(await pathExists(target))) {
      fail(`${path.relative(webRoot, javascriptFile)} imports missing module: ${specifier}`);
    }
  }
}

const manifest = await readJson(path.join(webRoot, 'manifest.webmanifest'));
for (const key of ['name', 'short_name', 'start_url', 'display', 'icons']) {
  if (!(key in manifest)) fail(`manifest.webmanifest is missing "${key}"`);
}
await requireFile(manifest.start_url, 'manifest.webmanifest');
for (const icon of manifest.icons || []) {
  await requireFile(icon.src, 'manifest.webmanifest');
}
for (const shortcut of manifest.shortcuts || []) {
  await requireFile(shortcut.url, 'manifest.webmanifest');
  for (const icon of shortcut.icons || []) {
    await requireFile(icon.src, 'manifest.webmanifest shortcut');
  }
}

const swSource = await readFile(path.join(webRoot, 'sw.js'), 'utf8');
const precacheBlock = swSource.match(/const PRECACHE_URLS\s*=\s*\[([\s\S]*?)\];/);
if (!precacheBlock) {
  fail('sw.js does not define PRECACHE_URLS');
} else {
  const urls = [...precacheBlock[1].matchAll(/["']([^"']+)["']/g)].map((match) => match[1]);
  await Promise.all(urls.map((url) => requireFile(url === './' ? 'index.html' : url, 'sw.js PRECACHE_URLS')));
}

const cacheVersion = swSource.match(/const CACHE_VERSION\s*=\s*["']tlf-v(\d+)["']/)?.[1];
const appSource = await readFile(path.join(webRoot, 'app.js'), 'utf8');
const registeredVersion = appSource.match(/serviceWorker\s*\.\s*register\(\s*["'][^"']*sw\.js\?v=(\d+)/)?.[1];
if (!cacheVersion || !registeredVersion) {
  fail('Could not determine service worker cache and registration versions');
} else if (cacheVersion !== registeredVersion) {
  fail(`Service worker version mismatch: cache v${cacheVersion}, registration v${registeredVersion}`);
}

const firebaseConfig = await readJson(path.join(webRoot, 'firebase.json'));
if (firebaseConfig.firestore?.rules !== 'firestore.rules') {
  fail('firebase.json must point Firestore rules at firestore.rules');
}
if (!firebaseConfig.emulators?.firestore?.port) {
  fail('firebase.json must configure a Firestore emulator port');
}

const syncSource = await readFile(path.join(webRoot, 'src/core/sync-engine.js'), 'utf8');
const migrationSource = await readFile(path.join(webRoot, 'src/core/migration.js'), 'utf8');
for (const collection of ['tasks', 'events', 'sessions']) {
  if (!syncSource.includes(`'users', uid, '${collection}'`)) {
    fail(`sync-engine.js is missing the users/{uid}/${collection} collection contract`);
  }
  if (!migrationSource.includes(`'${collection}'`)) {
    fail(`migration.js is missing the ${collection} migration contract`);
  }
}
for (const singleton of ['settings', 'reviews']) {
  if (!syncSource.includes(`'users', uid, '${singleton}', 'main'`)) {
    fail(`sync-engine.js is missing the ${singleton}/main sync contract`);
  }
  if (!migrationSource.includes(`'users', uid, '${singleton}', 'main'`)) {
    fail(`migration.js is missing the ${singleton}/main migration contract`);
  }
}

const swVersions = [...swSource.matchAll(/['"]\.\/([^'"]+)\?v=(\d+)['"]/g)]
  .map((match) => `${match[1]}@${match[2]}`);
if (swVersions.some((entry) => !entry.endsWith(`@${cacheVersion}`))) {
  warnings.push(`Precache query versions are not all v${cacheVersion}: ${swVersions.join(', ')}`);
}

if (warnings.length) {
  console.warn(warnings.map((warning) => `Warning: ${warning}`).join('\n'));
}
if (errors.length) {
  console.error(errors.map((error) => `Error: ${error}`).join('\n'));
  process.exit(1);
}

console.log(`Static app validation OK (${path.relative(repoRoot, webRoot)}).`);
