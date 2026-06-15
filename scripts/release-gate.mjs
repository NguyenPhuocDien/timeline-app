import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { repoRoot } from './static-app-utils.mjs';

const dist = path.join(repoRoot, 'apps', 'web', 'dist');
const required = ['index.html', 'app.js', 'sw.js', 'manifest.webmanifest'];
for (const file of required) {
  await access(path.join(dist, file));
}

const packageLock = JSON.parse(await readFile(path.join(repoRoot, 'package-lock.json'), 'utf8'));
if (packageLock.lockfileVersion !== 3) {
  throw new Error(`Unsupported package-lock version: ${packageLock.lockfileVersion}`);
}

const hasFirebaseCredentials = Boolean(
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_TOKEN
);
const deployRequested = process.env.DEPLOY_PRODUCTION === 'true';

if (deployRequested && !hasFirebaseCredentials) {
  throw new Error('Production release requested, but Firebase credentials are unavailable.');
}

if (deployRequested) {
  console.log('Release gate passed. Credentials are present; deployment remains a separate manual action.');
} else {
  console.log('Release gate passed. Production deployment was not requested; no deploy command was run.');
}
