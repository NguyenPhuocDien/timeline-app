# Đồng bộ 2 chiều Google Calendar — Thiết kế & Setup

> Nâng cấp từ sync 1 chiều read-only (v23) lên **2 chiều thật**.
> Quyết định 2026-06-17. Trạng thái: **Pha 0 (hạ tầng)**.

## Quyết định đã chốt
- **Backend:** Firebase Cloud Functions (project `timeline-app-9a872`).
- **Đồng bộ:** app `events` + `tasks` có ngày/giờ ↔ Google. Task chưa có giờ → không đẩy.
- **Lịch đích:** một calendar Google riêng tên **"Timeline Focus"** (không ghi vào primary).

## Kiến trúc
```
App (PWA) ──đọc/ghi──► Firestore ──Firestore trigger──► Cloud Function ──► Google Calendar   [App → Google]
Google Calendar ──webhook──► Cloud Function ──► Firestore ──onSnapshot──► App                [Google → App]
```
- App **không gọi thẳng** Google API nữa — chỉ làm việc với Firestore. Backend là cầu nối.
- OAuth phía server (`access_type=offline`) → refresh token, mã hoá lưu Firestore.
- Chống loop: mỗi event Google do app tạo gắn `extendedProperties.private.tlfId`; mapping lưu ở `gcal_links`.

## Firestore collections mới
| Collection | Nội dung | Ai đọc/ghi |
|---|---|---|
| `users/{uid}/gcal_tokens/main` | refresh token (mã hoá), scope, ngày cấp | **chỉ server** (rules: deny client) |
| `users/{uid}/gcal_links/{appId}` | map appId ↔ gcalEventId, etag, calendarId, hướng cập nhật cuối | server ghi, client đọc |
| `users/{uid}/gcal_state/main` | syncToken, channelId, channelExpiry, calendarId của "Timeline Focus" | chỉ server |

## Lộ trình
- [ ] **Pha 0 — Hạ tầng** (cần USER làm trong Console — xem checklist dưới)
- [ ] **Pha 1 — OAuth server:** flow lấy + lưu refresh token; nút "Kết nối Google Calendar" mới (hết reconnect mỗi giờ)
- [ ] **Pha 2 — App → Google:** Firestore trigger đẩy create/update/delete lên lịch "Timeline Focus" + lưu mapping
- [ ] **Pha 3 — Google → App:** webhook + incremental `syncToken` ghi về Firestore; cron gia hạn channel; chống loop

---

## ✅ CHECKLIST PHA 0 — việc của bạn (chỉ bạn làm được)

1. **Bật Blaze (pay-as-you-go)**
   - Firebase Console → project `timeline-app-9a872` → ⚙️ → Usage and billing → Modify plan → **Blaze**.
   - Gắn thẻ. Free tier rất rộng → dùng cá nhân gần như 0đ. (Có thể đặt **budget alert** để yên tâm.)

2. **Tạo OAuth 2.0 Client ID (loại Web application)**
   - Google Cloud Console → APIs & Services → Credentials → Create credentials → OAuth client ID → **Web application**.
   - **Authorized redirect URI:** sẽ là URL Cloud Function OAuth callback — mình sẽ cung cấp URL chính xác ở đầu Pha 1 (dạng `https://<region>-timeline-app-9a872.cloudfunctions.net/gcalOauthCallback`). Tạm tạo client trước, dán redirect URI sau.
   - Lưu lại **Client ID** + **Client secret** → đừng commit; sẽ nạp qua Firebase secret.

3. **Thêm scope ghi vào OAuth consent screen**
   - APIs & Services → OAuth consent screen → Edit → Scopes → thêm
     `https://www.googleapis.com/auth/calendar.events`
   - Giữ consent ở **Testing**; đảm bảo tài khoản Google bạn dùng nằm trong **Test users**.

4. **Xác nhận với tôi khi xong** + gửi **Client ID** (Client secret sẽ nạp bằng `firebase functions:secrets:set`, không dán vào chat).

> Sau khi Pha 0 xong, tôi khởi tạo `functions/`, dựng OAuth callback, và đưa bạn redirect URI để dán vào client.
