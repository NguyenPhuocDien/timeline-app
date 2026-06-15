import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { repoRoot, walkFiles } from './static-app-utils.mjs';

const ignoredDirectories = new Set([
  '.git',
  '.turbo',
  '.vercel',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const files = (await walkFiles(repoRoot, { ignoredDirectories }))
  .filter((file) => ['.js', '.mjs', '.cjs'].includes(path.extname(file)))
  .sort();

const failures = [];
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    failures.push(`${path.relative(repoRoot, file)}\n${result.stderr || result.stdout}`);
  }
}

if (failures.length) {
  console.error(`JavaScript syntax validation failed:\n\n${failures.join('\n\n')}`);
  process.exit(1);
}

console.log(`JavaScript syntax OK (${files.length} files).`);
