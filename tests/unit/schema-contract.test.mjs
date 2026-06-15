import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { importSchemaModule } from '../helpers/browser-module-loader.mjs';

const webRoot = path.resolve(import.meta.dirname, '..', '..', 'apps', 'web');

test('schema sanitizers produce stable Firestore payloads', async () => {
  const schema = await importSchemaModule();
  const task = schema.sanitizeTaskForFirestore({
    id: 'task-1',
    title: 'x'.repeat(700),
    date: '2026-06-15-extra',
    duration: 42.7,
    priority: 'unknown',
    status: 'unknown',
    tags: '#work #deep',
    backgroundImage: 'not-allowed',
  });

  assert.equal(task.title.length, 500);
  assert.equal(task.date, '2026-06-15');
  assert.equal(task.duration, 43);
  assert.equal(task.priority, 'medium');
  assert.equal(task.status, 'todo');
  assert.deepEqual(task.tags, ['work', 'deep']);
  assert.equal('backgroundImage' in task, false);

  const settings = schema.sanitizeSettingsForFirestore({
    dailyMissionLimit: 999,
    backgroundPreset: 'upload',
    backgroundImage: 'data:image/png;base64,large',
    unknown: true,
  });
  assert.equal(settings.dailyMissionLimit, 20);
  assert.equal(settings.backgroundPreset, 'none');
  assert.equal('backgroundImage' in settings, false);
  assert.equal('unknown' in settings, false);
});

test('migration and sync use the same Firestore collection contract', async () => {
  const [migration, sync] = await Promise.all([
    readFile(path.join(webRoot, 'src', 'core', 'migration.js'), 'utf8'),
    readFile(path.join(webRoot, 'src', 'core', 'sync-engine.js'), 'utf8'),
  ]);

  for (const collection of ['tasks', 'events', 'sessions']) {
    assert.match(migration, new RegExp(`['"]${collection}['"]`));
    assert.match(sync, new RegExp(`['"]users['"], uid, ['"]${collection}['"]`));
  }
  for (const singleton of ['settings', 'reviews']) {
    const contract = new RegExp(`['"]users['"], uid, ['"]${singleton}['"], ['"]main['"]`);
    assert.match(migration, contract);
    assert.match(sync, contract);
  }
});
