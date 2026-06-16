'use strict';

/**
 * Admin Firestore access for the sync backend. Admin SDK bypasses security
 * rules, so token/state docs stay private to the server even though they live
 * under the user's document tree.
 */
const admin = require('firebase-admin');
const { PATHS } = require('./config');

if (!admin.apps.length) admin.initializeApp();

function db() {
  return admin.firestore();
}

// ── OAuth refresh token (encrypted) ─────────────────────────────────────────
async function saveToken(uid, record) {
  await db().doc(PATHS.token(uid)).set(
    { ...record, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function getToken(uid) {
  const snap = await db().doc(PATHS.token(uid)).get();
  return snap.exists ? snap.data() : null;
}

// ── Per-user sync state (calendarId, syncToken, watch channel) ──────────────
async function saveState(uid, patch) {
  await db().doc(PATHS.state(uid)).set(
    { ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function getState(uid) {
  const snap = await db().doc(PATHS.state(uid)).get();
  return snap.exists ? snap.data() : null;
}

// ── App <-> Google id mapping ────────────────────────────────────────────────
async function saveLink(uid, appId, link) {
  await db().doc(PATHS.link(uid, appId)).set(
    { ...link, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

async function getLink(uid, appId) {
  const snap = await db().doc(PATHS.link(uid, appId)).get();
  return snap.exists ? snap.data() : null;
}

async function deleteLink(uid, appId) {
  await db().doc(PATHS.link(uid, appId)).delete();
}

// ── Short-lived OAuth state nonce (maps nonce -> uid during consent) ─────────
async function putOauthState(nonce, uid) {
  await db().doc(PATHS.oauthState(nonce)).set({
    uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
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
  saveToken,
  getToken,
  saveState,
  getState,
  saveLink,
  getLink,
  deleteLink,
  putOauthState,
  takeOauthState,
};
