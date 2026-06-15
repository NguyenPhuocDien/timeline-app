import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const webRoot = path.resolve(import.meta.dirname, '..', '..', 'apps', 'web');

export async function importSchemaModule() {
  const source = await readFile(path.join(webRoot, 'src', 'core', 'schema.js'), 'utf8');
  const dataUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
  return import(dataUrl);
}

export async function importMigrationModule() {
  const temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), 'timeline-migration-'));
  const schemaSource = await readFile(path.join(webRoot, 'src', 'core', 'schema.js'), 'utf8');
  const migrationSource = await readFile(path.join(webRoot, 'src', 'core', 'migration.js'), 'utf8');
  const nodeCompatibleMigration = migrationSource.replace(
    'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js',
    import.meta.resolve('firebase/firestore')
  );

  await writeFile(path.join(temporaryDirectory, 'schema.js'), schemaSource, 'utf8');
  await writeFile(path.join(temporaryDirectory, 'migration.mjs'), nodeCompatibleMigration, 'utf8');
  await writeFile(path.join(temporaryDirectory, 'package.json'), '{"type":"module"}\n', 'utf8');

  return import(pathToFileURL(path.join(temporaryDirectory, 'migration.mjs')).href);
}
