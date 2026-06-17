'use strict';

/**
 * POST /api/gcal/push   (Pha 2 — SCAFFOLD)
 * Requires Firebase auth. Body: { kind: 'event'|'task', op: 'upsert'|'delete', item }.
 * Pushes one app item to the user's "Timeline Focus" calendar and records the
 * app<->Google id mapping. Called by the app right after it writes to Firestore
 * (Vercel has no Firestore triggers, so the client initiates the push).
 */
const { requireUser } = require('./_lib/auth');

module.exports = async (req, res) => {
  const uid = await requireUser(req);
  if (!uid) return res.status(401).json({ error: 'unauthenticated' });

  // TODO Pha 2:
  //   1. Load + decrypt refresh token (store.getToken); 401 if not connected.
  //   2. Build authed client; read calendarId from store.getState.
  //   3. op 'upsert': isSyncable? -> create or patch Google event (toGoogleEvent),
  //      save link {gcalId, etag} in gcal_links. op 'delete': events.delete + drop link.
  //   4. Guard against echo loops via the gcal_links mapping.
  return res.status(501).json({ error: 'not-implemented', phase: 2 });
};
