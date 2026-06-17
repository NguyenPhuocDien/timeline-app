'use strict';

/**
 * Verify the caller's Firebase ID token (sent as `Authorization: Bearer <idToken>`)
 * and return their uid, or null when missing/invalid.
 */
const store = require('./store');

async function requireUser(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    const decoded = await store.auth().verifyIdToken(match[1]);
    return decoded.uid || null;
  } catch {
    return null;
  }
}

module.exports = { requireUser };
