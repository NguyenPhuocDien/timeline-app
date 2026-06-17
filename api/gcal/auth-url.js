'use strict';

/**
 * GET /api/gcal/auth-url
 * Requires Firebase auth (Authorization: Bearer <idToken>).
 * Returns { url } — a Google consent URL carrying a single-use state nonce
 * bound to the caller's uid. The app opens it in a popup.
 */
const crypto = require('crypto');
const { requireUser } = require('./_lib/auth');
const store = require('./_lib/store');
const oauth = require('./_lib/oauth');
const { redirectUri } = require('./_lib/config');

module.exports = async (req, res) => {
  try {
    const uid = await requireUser(req);
    if (!uid) return res.status(401).json({ error: 'unauthenticated' });

    const nonce = crypto.randomBytes(16).toString('hex');
    await store.putOauthState(nonce, uid);

    const client = oauth.clientFromEnv(redirectUri(req));
    return res.status(200).json({ url: oauth.buildConsentUrl(client, nonce) });
  } catch (err) {
    console.error('[gcal/auth-url]', err);
    return res.status(500).json({ error: 'internal' });
  }
};
