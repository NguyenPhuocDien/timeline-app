import { cp, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { repoRoot, webRoot } from './static-app-utils.mjs';

const validation = spawnSync(process.execPath, ['scripts/validate-static-app.mjs'], {
  cwd: repoRoot,
  encoding: 'utf8',
  stdio: 'inherit',
});
if (validation.status !== 0) process.exit(validation.status || 1);

const outputRoot = path.join(webRoot, 'dist');
await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const rootFiles = [
  'app.js',
  'contact.html',
  'icon.svg',
  'index.html',
  'manifest.webmanifest',
  'privacy.html',
  'style.css',
  'sw.js',
  'terms.html',
];
const directories = ['img', 'src', 'vendor'];

for (const file of rootFiles) {
  await cp(path.join(webRoot, file), path.join(outputRoot, file));
}
for (const directory of directories) {
  await cp(path.join(webRoot, directory), path.join(outputRoot, directory), {
    recursive: true,
  });
}

const topLevel = await readdir(outputRoot);
console.log(`Static build created apps/web/dist (${topLevel.length} top-level entries).`);
