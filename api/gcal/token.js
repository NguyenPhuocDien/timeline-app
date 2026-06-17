'use strict';

/**
 * GET /api/gcal/token
 * Auth: Firebase ID token (Authorization: Bearer <idToken>).
 *
 * Trả { access_token, expires_in } — access token Google TƯƠI, được server mint
 * từ refresh token đã lưu (mã hoá). Nhờ vậy client hiển thị lịch Google mà KHÔNG
 * cần popup OAuth lại mỗi ~1h: user kết nối Google một lần (luồng /auth-url +
 * /callback), từ đó server luôn cấp được token mới.
 *
 * 409 not-connected   → chưa kết nối Google (chưa có refresh token).
 * 409 reauth-needed   → refresh token bị thu hồi/hết hiệu lực → cần kết nối lại.
 */
const { requireUser } = require('./_lib/auth');
const store = require('./_lib/store');
const cryptoBox = require('./_lib/crypto');
const oauth = require('./_lib/oauth');
const { redirectUri } = require('./_lib/config');

module.exports = async (req, res) => {
  const uid = await requireUser(req);
  if (!uid) return res.status(401).json({ error: 'unauthenticated' });

  const tokenDoc = await store.getToken(uid);
  if (!tokenDoc || !tokenDoc.refreshEnc) return res.status(409).json({ error: 'not-connected' });

  let refreshToken;
  try {
    refreshToken = cryptoBox.decrypt(tokenDoc.refreshEnc, process.env.GCAL_TOKEN_KEY);
  } catch (err) {
    console.error('[gcal/token] decrypt', err);
    return res.status(500).json({ error: 'token-decrypt-failed' });
  }

  try {
    const authed = oauth.clientWithRefreshToken(redirectUri(req), refreshToken);
    const { token } = await authed.getAccessToken(); // tự refresh bằng refresh token
    if (!token) return res.status(409).json({ error: 'reauth-needed' });
    const expiryDate = authed.credentials && authed.credentials.expiry_date;
    const expiresIn = expiryDate
      ? Math.max(60, Math.floor((expiryDate - Date.now()) / 1000))
      : 3600;
    return res.status(200).json({ access_token: token, expires_in: expiresIn });
  } catch (err) {
    console.error('[gcal/token]', err);
    const code = err && (err.code || (err.response && err.response.status));
    if (code === 401 || code === 403 || code === 400) return res.status(409).json({ error: 'reauth-needed' });
    return res.status(500).json({ error: 'token-failed' });
  }
};
