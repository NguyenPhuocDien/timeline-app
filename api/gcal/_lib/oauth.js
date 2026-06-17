'use strict';

/**
 * Google OAuth2 helpers (server-side, offline access for a refresh token).
 *
 * Env vars required at runtime (Vercel project settings):
 *   GCAL_CLIENT_ID, GCAL_CLIENT_SECRET, GCAL_TOKEN_KEY, FIREBASE_SERVICE_ACCOUNT
 */
const { google } = require('googleapis');
const { SCOPES } = require('./config');

function makeOAuthClient({ clientId, clientSecret, redirectUri }) {
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** Build a client from env, primed for the given redirect URI. */
function clientFromEnv(redirectUri) {
  return makeOAuthClient({
    clientId: process.env.GCAL_CLIENT_ID,
    clientSecret: process.env.GCAL_CLIENT_SECRET,
    redirectUri,
  });
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
  return tokens;
}

/** Build a client already primed with a stored refresh token. */
function clientWithRefreshToken(redirectUri, refreshToken) {
  const client = clientFromEnv(redirectUri);
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

module.exports = {
  makeOAuthClient,
  clientFromEnv,
  buildConsentUrl,
  exchangeCode,
  clientWithRefreshToken,
};
