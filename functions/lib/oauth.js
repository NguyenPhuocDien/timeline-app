'use strict';

/**
 * Google OAuth2 helpers (server-side, offline access for a refresh token).
 *
 * Secrets required at runtime (set with `firebase functions:secrets:set`):
 *   GCAL_CLIENT_ID, GCAL_CLIENT_SECRET, GCAL_TOKEN_KEY
 */
const { google } = require('googleapis');
const { SCOPES } = require('./config');

/**
 * The callback URL must EXACTLY match an Authorized redirect URI on the OAuth
 * client. With 2nd-gen functions in REGION, it looks like:
 *   https://<REGION>-<projectId>.cloudfunctions.net/gcalOauthCallback
 * We pass it in explicitly so there is one source of truth.
 */
function makeOAuthClient({ clientId, clientSecret, redirectUri }) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function buildConsentUrl(oauthClient, state) {
  return oauthClient.generateAuthUrl({
    access_type: 'offline', // ask for a refresh token
    prompt: 'consent', // force refresh-token issuance even on re-consent
    include_granted_scopes: true,
    scope: SCOPES,
    state,
  });
}

/** Exchange the authorization code for tokens (includes refresh_token). */
async function exchangeCode(oauthClient, code) {
  const { tokens } = await oauthClient.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, scope, ... }
}

/** Build a client already primed with a stored refresh token. */
function clientWithRefreshToken(base, refreshToken) {
  base.setCredentials({ refresh_token: refreshToken });
  return base;
}

module.exports = {
  makeOAuthClient,
  buildConsentUrl,
  exchangeCode,
  clientWithRefreshToken,
};
