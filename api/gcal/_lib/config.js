'use strict';

/**
 * Shared constants for the Google Calendar two-way sync backend (Vercel /api).
 *
 * Files/dirs under /api prefixed with "_" are NOT turned into endpoints, so
 * this _lib folder is safe for shared code.
 */

// Write scope: lets the app create/update/delete events. Sensitive scope — keep
// the OAuth consent screen in Testing with explicit test users until verified.
const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];

// Dedicated Google calendar the app writes into (never the user's primary).
const APP_CALENDAR_SUMMARY = 'Timeline Focus';

// extendedProperties.private key stamped on every event the app creates, so the
// Google -> App pull can recognize (and skip) events that originated here.
const TLF_PROP_KEY = 'tlfId';

// Firestore document paths (per user). gcal_tokens/gcal_state are server-only
// (client denied by the default rules catch-all); gcal_links is client-readable.
const PATHS = {
  token: (uid) => `users/${uid}/gcal_tokens/main`,
  state: (uid) => `users/${uid}/gcal_state/main`,
  links: (uid) => `users/${uid}/gcal_links`,
  link: (uid, appId) => `users/${uid}/gcal_links/${appId}`,
  oauthState: (nonce) => `gcal_oauth_state/${nonce}`,
  // channelId -> uid lookup for the inbound webhook.
  channel: (channelId) => `gcal_channels/${channelId}`,
};

// OAuth state nonce lifetime (ms). The consent round-trip is short; expire fast.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

/** Public origin of the app, used to build the OAuth redirect + webhook URLs. */
function appBaseUrl(req) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL.replace(/\/$/, '');
  const proto = (req && req.headers['x-forwarded-proto']) || 'https';
  const host = req && (req.headers['x-forwarded-host'] || req.headers.host);
  return `${proto}://${host}`;
}

/** MUST exactly match an Authorized redirect URI on the OAuth client. */
function redirectUri(req) {
  return `${appBaseUrl(req)}/api/gcal/callback`;
}

module.exports = {
  SCOPES,
  APP_CALENDAR_SUMMARY,
  TLF_PROP_KEY,
  PATHS,
  OAUTH_STATE_TTL_MS,
  appBaseUrl,
  redirectUri,
};
