'use strict';

/**
 * AES-256-GCM encryption for the Google refresh token at rest in Firestore.
 *
 * Key comes from the GCAL_TOKEN_KEY env var: 32 bytes as base64 or hex.
 * Generate one with:  openssl rand -base64 32
 *
 * Ciphertext layout (base64): iv(12) | authTag(16) | encrypted.
 */
const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function loadKey(rawKey) {
  if (!rawKey) throw new Error('GCAL_TOKEN_KEY is not set.');
  let buf = Buffer.from(rawKey, 'base64');
  if (buf.length !== 32) buf = Buffer.from(rawKey, 'hex');
  if (buf.length !== 32) {
    throw new Error('GCAL_TOKEN_KEY must decode to 32 bytes (use: openssl rand -base64 32).');
  }
  return buf;
}

function encrypt(plaintext, rawKey) {
  const key = loadKey(rawKey);
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function decrypt(payloadB64, rawKey) {
  const key = loadKey(rawKey);
  const buf = Buffer.from(payloadB64, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
