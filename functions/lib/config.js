'use strict';

/**
 * Shared constants for the Google Calendar two-way sync backend.
 *
 * Region note: pick a region close to the user (Vietnam) and keep it the SAME
 * across every function so the OAuth redirect URI and webhook URL are stable.
 * `asia-southeast1` (Singapore) is the closest low-latency option. If you change
 * this, you MUST update the Authorized redirect URI in the Google OAuth client.
 */
const REGION = 'asia-southeast1';

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
};

// OAuth state nonce lifetime (ms). The consent round-trip is short; expire fast.
const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

module.exports = {
  REGION,
  SCOPES,
  APP_CALENDAR_SUMMARY,
  TLF_PROP_KEY,
  PATHS,
  OAUTH_STATE_TTL_MS,
};
