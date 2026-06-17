'use strict';

/**
 * Admin Firestore + Auth access for the sync backend.
 *
 * Vercel functions are stateless, so the Firebase Admin SDK is initialized from
 * a service account JSON in the FIREBASE_SERVICE_ACCOUNT env var (raw JSON or
 * base64). Admin bypasses security rules, so token/state docs stay private even
 * though they live under the user's document tree.
 */
const admin = require('firebase-admin');
const { PATHS } = require('./config');

function initAdmin() {
  if (admin.apps.length) return;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set.');
  let json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }
  admin.initializeApp({ credential: admin.credential.cert(json) });
}

function db() {
  initAdmin();
  return admin.firestore();
}

function auth() {
  initAdmin();
  return admin.auth();
}

const stamp = () => admin.firestore.FieldValue.serverTimestamp();

// ── OAuth refresh token (encrypted) ─────────────────────────────────────────
async function saveToken(uid, record) {
  await db().doc(PATHS.token(uid)).set({ ...record, updatedAt: stamp() }, { merge: true });
}
async function getToken(uid) {
  const snap = await db().doc(PATHS.token(uid)).get();
  return snap.exists ? snap.data() : null;
}

// ── Per-user sync state (calendarId, syncToken, watch channel) ──────────────
async function saveState(uid, patch) {
  await db().doc(PATHS.state(uid)).set({ ...patch, updatedAt: stamp() }, { merge: true });
}
async function getState(uid) {
  const snap = await db().doc(PATHS.state(uid)).get();
  return snap.exists ? snap.data() : null;
}

// ── App <-> Google id mapping ────────────────────────────────────────────────
async function saveLink(uid, appId, link) {
  await db().doc(PATHS.link(uid, appId)).set({ ...link, updatedAt: stamp() }, { merge: true });
}
async function getLink(uid, appId) {
  const snap = await db().doc(PATHS.link(uid, appId)).get();
  return snap.exists ? snap.data() : null;
}
async function deleteLink(uid, appId) {
  await db().doc(PATHS.link(uid, appId)).delete();
}

// ── Webhook channel -> uid lookup ────────────────────────────────────────────
async function saveChannel(channelId, record) {
  await db().doc(PATHS.channel(channelId)).set({ ...record, updatedAt: stamp() }, { merge: true });
}
async function getChannel(channelId) {
  const snap = await db().doc(PATHS.channel(channelId)).get();
  return snap.exists ? snap.data() : null;
}

// ── Short-lived OAuth state nonce (maps nonce -> uid during consent) ─────────
async function putOauthState(nonce, uid) {
  await db().doc(PATHS.oauthState(nonce)).set({ uid, createdAt: stamp() });
}
async function takeOauthState(nonce) {
  const ref = db().doc(PATHS.oauthState(nonce));
  const snap = await ref.get();
  if (!snap.exists) return null;
  await ref.delete(); // single-use
  return snap.data();
}

module.exports = {
  admin,
  db,
  auth,
  saveToken,
  getToken,
  saveState,
  getState,
  saveLink,
  getLink,
  deleteLink,
  saveChannel,
  getChannel,
  putOauthState,
  takeOauthState,
};
