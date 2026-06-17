# Đồng bộ 2 chiều Google Calendar — Thiết kế & Setup

> Nâng cấp từ sync 1 chiều read-only (v23) lên **2 chiều thật**.
> Quyết định 2026-06-17. Trạng thái: **Pha 0 (hạ tầng)**.

## Quyết định đã chốt
- **Backend:** Vercel serverless functions tại `/api/gcal` (KHÔNG dùng Firebase Cloud Functions → không cần Blaze). Firebase Admin SDK chạy trong function bằng service account để truy cập Firestore/Auth.
- **Đồng bộ:** app `events` + `tasks` có ngày/giờ ↔ Google. Task chưa có giờ → không đẩy.
- **Lịch đích:** một calendar Google riêng tên **"Timeline Focus"** (không ghi vào primary).

## Kiến trúc
```
App (PWA) ──ghi──► Firestore ──gọi──► /api/gcal/push (Vercel) ──► Google Calendar   [App → Google]
Google Calendar ──webhook──► /api/gcal/webhook (Vercel) ──► Firestore ──onSnapshot──► App   [Google → App]
```
- **Vercel không có Firestore trigger** → sau khi ghi Firestore, app **chủ động gọi** `/api/gcal/push`. Cần hàng đợi/đối soát cho trường hợp ghi offline.
- OAuth phía server (`access_type=offline`) → refresh token, mã hoá AES-256-GCM lưu Firestore (`gcal_tokens`, chỉ server đọc qua Admin SDK).
- Chống loop: mỗi event Google do app tạo gắn `extendedProperties.private.tlfId`; mapping lưu ở `gcal_links` (client đọc được để đối soát, chỉ server ghi).

## Firestore collections mới
| Collection | Nội dung | Ai đọc/ghi |
|---|---|---|
| `users/{uid}/gcal_tokens/main` | refresh token (mã hoá), scope, ngày cấp | **chỉ server** (rules: deny client) |
| `users/{uid}/gcal_links/{appId}` | map appId ↔ gcalEventId, etag, calendarId, hướng cập nhật cuối | server ghi, client đọc |
| `users/{uid}/gcal_state/main` | syncToken, channelId, channelExpiry, calendarId của "Timeline Focus" | chỉ server |

## Lộ trình
- [ ] **Pha 0 — Hạ tầng** (cần USER làm trong Console — xem checklist dưới) ← ĐANG CHỜ
- [x] **Pha 1 — OAuth server:** `auth-url.js` + `callback.js` lấy/mã hoá/lưu refresh token + tạo lịch "Timeline Focus". (Chạy được sau Pha 0.)
- [x] **Pha 2 — App → Google:** `push.js` — app gọi sau khi ghi Firestore; insert/patch/delete lên lịch "Timeline Focus" + lưu mapping `gcal_links` (etag chống loop). *Vercel không có Firestore trigger nên app chủ động gọi.*
- [x] **Pha 3 — Google → App:** `watch.js` (đăng ký push channel + seed syncToken) · `webhook.js` (incremental `syncToken` → ghi Firestore) · `renew.js` (cron gia hạn channel, `vercel.json` crons 03:00 UTC).
  - **Phạm vi an toàn:** webhook CHỈ phản chiếu event do app tạo (có `tlfId`) khi user sửa/xoá trên Google. Event tạo trực tiếp trong lịch "Timeline Focus" (không `tlfId`) bị bỏ qua — tránh đoán sai task/event. Mở rộng sau nếu cần.

> **Còn lại để chạy thật (sau Pha 0):** (a) wire client `app.js` gọi `/api/gcal/push` sau mỗi lần ghi task/event + nút "Kết nối Google Calendar (server)" gọi `/api/gcal/auth-url` & `/api/gcal/watch`; (b) test end-to-end với tài khoản thật. Backend đã sẵn sàng, chưa kích hoạt ở client để khỏi ảnh hưởng app đang chạy.

---

## ✅ CHECKLIST PHA 0 — việc của bạn (chỉ bạn làm được)

1. **Tạo OAuth 2.0 Client ID (loại Web application)**
   - Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
   - **Authorized redirect URI:** `https://<domain-app>/api/gcal/callback`
     (ví dụ `https://timeline-app-one-beta.vercel.app/api/gcal/callback`).
   - Lưu lại **Client ID** + **Client secret** → đừng commit.

2. **Thêm scope ghi vào OAuth consent screen**
   - APIs & Services → OAuth consent screen → Edit → Scopes → thêm
     `https://www.googleapis.com/auth/calendar.events`
   - Giữ consent ở **Testing**; đảm bảo tài khoản Google bạn dùng nằm trong **Test users**.

3. **Nạp 4 biến môi trường vào Vercel** (Project → Settings → Environment Variables):
   - `GCAL_CLIENT_ID` — Client ID ở bước 1
   - `GCAL_CLIENT_SECRET` — Client secret ở bước 1
   - `GCAL_TOKEN_KEY` — khoá mã hoá refresh token, sinh bằng `openssl rand -base64 32`
   - `FIREBASE_SERVICE_ACCOUNT` — JSON service account (raw hoặc base64) của project `timeline-app-9a872`
   - (tuỳ chọn) `APP_BASE_URL` — origin cố định nếu không muốn suy ra từ header request.
   - (tuỳ chọn) `CRON_SECRET` — bảo vệ endpoint `/api/gcal/renew`; nếu đặt, Vercel Cron tự gửi `Authorization: Bearer <CRON_SECRET>`.

4. **Xác nhận với tôi khi xong.** Secret không dán vào chat — chỉ cần báo đã nạp xong trên Vercel.

> Backend `/api/gcal` đã có sẵn (auth-url, callback, OAuth, mã hoá token, ensure calendar). Sau khi Pha 0 xong là chạy được luồng kết nối (Pha 1).
