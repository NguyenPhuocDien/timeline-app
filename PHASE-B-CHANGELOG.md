# 📋 PHASE B CHANGELOG

> Diff giữa Phase A (8/6) và Phase B (9/6).
> Đọc file này để hiểu **chính xác** những gì đã thay đổi.

---

## TL;DR

Phase A viết dựa trên SUY ĐOÁN (chỉ có `index.html`). Phase B đọc `app.js` thật và phát hiện:

1. **6 file Phase A có bug** (tên field sai) → đã fix
2. **2 file mới** (`sw.js`, `sentry.js`) — Phase A chưa có
3. **5 file docs** đã cập nhật để khớp Phase B

**Nếu anh đã deploy Phase A** → ROLLBACK ngay và deploy Phase B thay thế.

---

## 🔴 Bug fix Phase A — đã sửa ở Phase B

### 1. `src/core/schema.js`

| Field | Phase A SAI | App.js thật | Tác động |
|---|---|---|---|
| Collection name | `focusSessions` | **`sessions`** | Mất focus history khi migrate |
| (quên hẳn) | — | **`reviews`** map | Mất review data |
| `task.tags` | string `"#a #b"` | **array `['a', 'b']`** | Tags bị convert sai |
| `task.isMission` | dùng `isMission` | **`task.mission`** | Rules reject task hợp lệ |
| `event.recurring` | `'yes'`/`'no'` | **boolean** | Rules reject event |
| Timestamp | Firestore `Timestamp` | **ISO string** | Conflict resolution lỗi |

Phase B đã rewrite hoàn toàn `schema.js` để khớp app.js thật. Có thêm sanitizer mới: `sanitizeSessionForFirestore`, `sanitizeReviewsForFirestore`.

### 2. `src/core/migration.js`

Đã đổi:
- Migrate collection `focusSessions/` → **`sessions/`**
- Thêm migrate `reviews` → **`reviews/main`** doc (object map)
- Đổi field tracking: `_v1ItemCount` tính cả sessions
- Return type thêm `reviewCount`, `sessionCount`

### 3. `src/core/sync-engine.js`

Đã đổi:
- Subscribe collection `focusSessions` → **`sessions`**
- Thêm subscribe doc **`reviews/main`** (object map)
- `initialSyncDone` flag — KHÔNG push trước khi initial sync xong (tránh push data outdated)
- `isAlive()` helper — check soft delete đúng cách (app.js dùng `status === 'deleted'`, KHÔNG phải `deletedAt`)
- Hook Sentry: `window.Sentry.captureException(err)` cho lỗi sync
- Hook Sentry: `setUser({ id: uid })` KHÔNG kèm email

### 4. `firestore.rules`

Đã đổi:
- Rule cho `focusSessions/` → **`sessions/`**
- Thêm rule cho **`reviews/`** (chỉ doc `main`)
- `isValidTask`: chấp nhận `mission` (boolean), `done`, `flow` (map), `tags` (list)
- `isValidEvent`: `recurring is bool` (không phải string)
- `isValidSession` thay cho `isValidFocusSession`
- Field whitelist root user doc thêm `_rolledBackAt`, `_migrationStartedAt`, `_v1ItemCount`

### 5. `firestore.indexes.json`

- Đổi `collectionGroup: focusSessions` → **`sessions`**
- Thêm index `sessions` theo `taskId + date`

### 6. `src/ui/sync-indicator.js`

| Phase A | Phase B |
|---|---|
| `var(--card, #fff)` | **`var(--panel, #fff)`** (khớp style.css) |
| `var(--border, #e5e7eb)` | **`var(--line, #e5e7eb)`** (khớp style.css) |
| `z-index: 9998` | **`z-index: 50`** (đã có app.js dùng 39 cho drawer) |
| Không có mobile media query | Thêm `@media (max-width: 640px)` đẩy indicator lên 70px để tránh che bottom tabs |

---

## 🆕 File mới Phase B

### 7. `sw.js` (Service Worker v10)

App.js đã register `'./sw.js?v=9'` nhưng file gốc không có trong upload. Em tạo mới với:
- **HTML**: network-first (luôn lấy bản mới, fallback cache khi offline)
- **JS/CSS/img**: cache-first + revalidate background
- **SKIP**: Firebase, Sentry, Analytics domains (cực quan trọng - không cache API calls)
- Auto-clean cache cũ khi activate
- Message API: `SKIP_WAITING`, `CLEAR_CACHE`

### 8. `src/integrations/sentry.js`

Sentry với privacy-safe config:
- Load SDK từ CDN
- `sampleRate: 1.0` errors, `tracesSampleRate: 0.0` (tiết kiệm quota free tier)
- `beforeSend` scrub email + ip + content > 200 chars
- Ignore browser extension errors, popup-cancelled errors
- Auto-detect environment (dev/preview/production)
- Skip nếu DSN chưa cấu hình (an toàn deploy ngay)

---

## 📝 Docs đã cập nhật

### `AUDIT-REPORT.md`
- Thêm section 5: **XSS audit verdict = PASS** (app.js đã có `esc()` đầy đủ)
- Thêm section 6: **Phase A bug fix log** (7 bug + 1 CSS variable)
- Thêm M2: import JSON không sanitize `id` (rủi ro thấp)
- Thêm M3: `crypto.randomUUID` fallback collision risk
- Cập nhật scope: đã audit `app.js` 1136 dòng + `style.css` 1926 dòng

### `PATCH-index-html.md`
- Bổ sung Sentry script (load TRƯỚC sync-engine để catch lỗi sớm)
- Bổ sung step đổi `sw.js?v=9` → `?v=10` trong `app.js` (chỉ 1 dòng)
- Thêm Step 5: Setup Sentry DSN
- Thêm Step 7: Lưu ý về schema (sessions, reviews, mission, tags array, recurring boolean)
- Cập nhật rollback option C: DevTools console rollback

### `DEPLOY-GUIDE.md`
- Thêm **Phase 4 — Setup Sentry** (DSN, test, alerts)
- Cập nhật Phase 2 step 2.1: copy `sw.js` + `src/integrations/`
- Cập nhật final checklist thêm Sentry verify
- Cập nhật troubleshoot section

### `TEST-CHECKLIST.md`
- T5: Migration test thêm verify `sessions/` (không phải `focusSessions/`) + `reviews/main`
- T12: Service Worker v10 test (cache name `tlf-v10-*`)
- T13: Sentry test (init OK, không gửi PII)
- T11: Sync indicator test thêm "CSS variable đúng", "không che bottom tabs"
- T20: XSS spot check (in case)

### `README.md`
- Rewrite hoàn toàn cho Phase B FINAL state
- Cập nhật file tree với `sw.js` + `src/integrations/sentry.js`
- Thêm Phase C roadmap (sau khi Phase B stable)
- Đáp 5 câu hỏi anh đã trả lời

---

## 🔍 Tại sao Phase A có bug?

**Em chỉ có `index.html`** ban đầu. Em đoán field names từ:
- HTML form `<input id="fTitle">` → `task.title` ✅ đúng
- HTML form `<input id="fStart">` → `task.start` ✅ đúng
- HTML form `<input id="fMission">` → em đoán `task.isMission` ❌ thật ra là `task.mission`
- `window.firebaseSync(db)` → em đoán `db = { tasks, events, focusSessions, ... }` ❌

**Form ID ≠ DB field name**. Đây là bài học: KHÔNG đoán schema khi không có code thật.

---

## ✅ Verify Phase B đúng

Sau khi anh deploy Phase B, chạy DevTools Console:

```js
// 1. Check schema khớp app.js
const t = window.db.tasks[0];
console.log('mission:', typeof t.mission);     // 'boolean' ✅
console.log('tags:', Array.isArray(t.tags));   // true ✅

const e = window.db.events[0];
console.log('recurring:', typeof e.recurring); // 'boolean' ✅

console.log('sessions:', Array.isArray(window.db.sessions));     // true ✅
console.log('reviews:', typeof window.db.reviews);               // 'object' ✅

// 2. Check Firestore subcollection sau migration
// Trong Firebase Console: users/{uid}/sessions/  ← KHÔNG phải focusSessions/
// users/{uid}/reviews/main                       ← phải tồn tại
```

Nếu thấy `focusSessions/` hoặc thiếu `reviews/main` → migration Phase A đã chạy → cần rollback và deploy Phase B.

---

## 📅 Timeline

- **8/6 hôm qua**: Phase A — drop-in package (suy đoán schema)
- **9/6 hôm nay sáng**: Em audit app.js thật, phát hiện bug → fix
- **9/6 hôm nay chiều**: Hoàn tất docs Phase B, đóng gói deliver

Tổng thời gian: ~2 ngày làm việc.
