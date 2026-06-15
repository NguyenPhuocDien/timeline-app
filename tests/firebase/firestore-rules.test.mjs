import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { after, afterEach, before, test } from 'node:test';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { importMigrationModule, importSchemaModule } from '../helpers/browser-module-loader.mjs';

const projectId = 'demo-timeline-focus';
const webRoot = path.resolve(import.meta.dirname, '..', '..', 'apps', 'web');
let testEnvironment;

function emulatorAddress() {
  const [host = '127.0.0.1', rawPort = '8080'] =
    (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').split(':');
  return { host, port: Number(rawPort) };
}

function validTask(overrides = {}) {
  return {
    id: 'task-1',
    title: 'Rules test',
    date: '2026-06-15',
    duration: 45,
    priority: 'high',
    status: 'todo',
    tags: ['ci'],
    mission: false,
    ...overrides,
  };
}

before(async () => {
  const rules = await readFile(path.join(webRoot, 'firestore.rules'), 'utf8');
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: {
      ...emulatorAddress(),
      rules,
    },
  });
});

afterEach(async () => {
  await testEnvironment.clearFirestore();
});

after(async () => {
  await testEnvironment.cleanup();
});

test('requires authentication and enforces per-user ownership', async () => {
  const anonymousDb = testEnvironment.unauthenticatedContext().firestore();
  const ownerDb = testEnvironment.authenticatedContext('alice').firestore();
  const otherDb = testEnvironment.authenticatedContext('bob').firestore();
  const taskPath = 'users/alice/tasks/task-1';

  await assertFails(setDoc(doc(anonymousDb, taskPath), validTask()));
  await assertSucceeds(setDoc(doc(ownerDb, taskPath), validTask()));
  await assertSucceeds(getDoc(doc(ownerDb, taskPath)));
  await assertFails(getDoc(doc(otherDb, taskPath)));
  await assertFails(setDoc(doc(otherDb, taskPath), validTask({ title: 'Cross-user write' })));
});

test('rejects invalid entity shapes and unknown collections', async () => {
  const db = testEnvironment.authenticatedContext('alice').firestore();

  await assertFails(setDoc(
    doc(db, 'users/alice/tasks/invalid'),
    validTask({ duration: 1441 })
  ));
  await assertFails(setDoc(
    doc(db, 'users/alice/tasks/unknown-field'),
    validTask({ unexpected: true })
  ));
  await assertFails(setDoc(
    doc(db, 'users/alice/private/secret'),
    { value: true }
  ));
});

test('enforces singleton settings and reviews documents', async () => {
  const db = testEnvironment.authenticatedContext('alice').firestore();

  await assertSucceeds(setDoc(doc(db, 'users/alice/settings/main'), {
    theme: 'dark',
    notifications: false,
  }));
  await assertFails(setDoc(doc(db, 'users/alice/settings/other'), {
    theme: 'dark',
    notifications: false,
  }));
  await assertFails(setDoc(doc(db, 'users/alice/settings/main'), {
    backgroundImage: 'data:image/png;base64,large',
  }));
  await assertSucceeds(setDoc(doc(db, 'users/alice/reviews/main'), {
    data: { '2026-06-15': { note: 'done' } },
  }));
  await assertFails(deleteDoc(doc(
    testEnvironment.authenticatedContext('bob').firestore(),
    'users/alice/reviews/main'
  )));
  await assertSucceeds(deleteDoc(doc(db, 'users/alice/reviews/main')));
});

test('accepts sanitized sync payloads for every supported scope', async () => {
  const schema = await importSchemaModule();
  const db = testEnvironment.authenticatedContext('alice').firestore();
  const now = new Date().toISOString();

  const task = schema.sanitizeTaskForFirestore({
    id: 'task-sync',
    title: 'Sync task',
    date: '2026-06-15',
    duration: 30.4,
    tags: '#sync',
    createdAt: now,
  });
  const event = schema.sanitizeEventForFirestore({
    id: 'event-sync',
    title: 'Sync event',
    date: '2026-06-15',
    recurring: false,
  });
  const session = schema.sanitizeSessionForFirestore({
    id: 'session-sync',
    taskId: 'task-sync',
    date: '2026-06-15',
    minutes: 30.9,
  });
  const settings = schema.sanitizeSettingsForFirestore({
    theme: 'dark',
    dailyMissionLimit: 5,
    notifications: true,
    backgroundImage: 'data:image/png;base64,local-only',
  });
  const reviews = schema.sanitizeReviewsForFirestore({
    '2026-06-15': { score: 4 },
  });

  await assertSucceeds(setDoc(doc(db, 'users/alice/tasks/task-sync'), task));
  await assertSucceeds(setDoc(doc(db, 'users/alice/events/event-sync'), event));
  await assertSucceeds(setDoc(doc(db, 'users/alice/sessions/session-sync'), session));
  await assertSucceeds(setDoc(doc(db, 'users/alice/settings/main'), settings));
  await assertSucceeds(setDoc(doc(db, 'users/alice/reviews/main'), { data: reviews }));
});

test('migrates a legacy user document to schema v2 through security rules', async () => {
  const legacyDb = {
    tasks: [{
      id: 'legacy-task',
      title: 'Legacy task',
      date: '2026-06-15',
      duration: 25.2,
      priority: 'high',
      status: 'todo',
      tags: '#legacy',
    }],
    events: [{
      id: 'legacy-event',
      title: 'Legacy event',
      date: '2026-06-15',
      type: 'solar',
      recurring: true,
    }],
    sessions: [{
      id: 'legacy-session',
      taskId: 'legacy-task',
      date: '2026-06-15',
      minutes: 25,
    }],
    settings: {
      theme: 'dark',
      backgroundImage: 'data:image/png;base64,local-only',
    },
    reviews: {
      '2026-06-15': { score: 5 },
    },
  };

  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users/alice'), { db: legacyDb });
  });

  const { runMigrationIfNeeded } = await importMigrationModule();
  const ownerDb = testEnvironment.authenticatedContext('alice').firestore();
  const result = await runMigrationIfNeeded(ownerDb, 'alice');

  assert.equal(result.migrated, true);
  assert.equal(result.taskCount, 1);
  assert.equal(result.eventCount, 1);
  assert.equal(result.sessionCount, 1);
  assert.equal(result.reviewCount, 1);

  const [user, taskDoc, eventDoc, sessionDoc, settingsDoc, reviewsDoc] = await Promise.all([
    getDoc(doc(ownerDb, 'users/alice')),
    getDoc(doc(ownerDb, 'users/alice/tasks/legacy-task')),
    getDoc(doc(ownerDb, 'users/alice/events/legacy-event')),
    getDoc(doc(ownerDb, 'users/alice/sessions/legacy-session')),
    getDoc(doc(ownerDb, 'users/alice/settings/main')),
    getDoc(doc(ownerDb, 'users/alice/reviews/main')),
  ]);

  assert.equal(user.data().migrationVersion, 2);
  assert.deepEqual(taskDoc.data().tags, ['legacy']);
  assert.equal(eventDoc.data().recurring, true);
  assert.equal(sessionDoc.data().minutes, 25);
  assert.equal('backgroundImage' in settingsDoc.data(), false);
  assert.equal(reviewsDoc.data().data['2026-06-15'].score, 5);

  const secondRun = await runMigrationIfNeeded(ownerDb, 'alice');
  assert.equal(secondRun.skipped, true);
  assert.equal(secondRun.migrated, false);
});
