# ✅ TEST CHECKLIST — Timeline Focus sau khi patch (Phase B)

> Đánh dấu khi đã test xong. Tối thiểu chạy hết **[P0 CRITICAL]** trước khi merge production.

---

## Setup test environment

```bash
# 1. Serve local
cd /path/to/timeline-app-one-beta
python3 -m http.server 8000

# 2. Mở Firebase Console (tab riêng):
#    https://console.firebase.google.com/project/timeline-app-9a872/firestore/data

# 3. Mở DevTools (F12) → Console tab
```

T��o 2 tài khoản Google test để test cross-user.

---

## [P0 CRITICAL] — Phải pass 100% trước khi production

### T1. Login flow
- [ ] Mở app khi chưa login → sidebar nút "🔑 Đăng nhập Đồng bộ"
- [ ] Click → popup Google
- [ ] Login thành công → toast "✅ Đã kết nối Cloud: ..."
- [ ] Nút đổi thành "👤 \<Tên\> (Đăng xuất)"
- [ ] Sync indicator góc phải dưới: `⟳ Đang đồng bộ...` → `✓ Đã đồng bộ`
- [ ] Console:
  - `[Sentry] DSN chưa cấu hình` (nếu chưa setup) HOẶC `[Sentry] Initialized successfully`
  - `[migration]` log có message rõ ràng
  - KHÔNG có error đỏ

### T2. Tạo / sửa / xoá task
- [ ] Tạo task mới → xuất hiện trong list
- [ ] Sync indicator chớp `⟳` → `✓`
- [ ] **Firebase Console**: `users/{uid}/tasks/{taskId}` có document mới
- [ ] Sửa title task → Firestore: doc update, `updatedAt` mới
- [ ] Xoá task → Firestore: `deletedAt` được set (soft delete)
- [ ] Refresh trang → task đã xoá KHÔNG hiện lại
- [ ] Tags: tạo task với tag `#study #work` → Firestore lưu `tags: ['study', 'work']` (KHÔNG có dấu #)

### T3. Bảo mật — User A không đọc được data User B
- [ ] Login bằng tài khoản A → tạo task "Test A"
- [ ] Logout, login bằng tài khoản B
- [ ] **KHÔNG được** thấy "Test A"
- [ ] DevTools Console của B chạy:
  ```js
  const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  await getDoc(doc(window.dbFire, 'users', 'UID_CỦA_A', 'tasks', 'task_id_A'))
    .catch(e => console.log('BLOCKED:', e.code));
  ```
- [ ] Kết quả: `BLOCKED: permission-denied` ✅

### T4. Sync 2 thiết bị — không mất task
- [ ] Login cùng tài khoản trên Chrome (Device A) và Safari (Device B)
- [ ] A tạo "Task A1" → 1-2s sau B phải thấy "Task A1"
- [ ] B tạo "Task B1" → 1-2s sau A phải thấy "Task B1"
- [ ] Cả 2 device đều có cả A1 và B1 (**không mất task nào**)
- [ ] A sửa "Task A1" → "Task A1 edited" → 1-2s sau B thấy
- [ ] A xoá "Task B1" → 1-2s sau B task biến mất

### T5. Migration — không mất data (CỰC KỲ QUAN TRỌNG cho Phase B fix)
> ⚠️ Test với account có data cũ (schema v1)

Trước khi patch — DevTools Console:
```js
console.log('Tasks v1:', window.db.tasks.length);
console.log('Events v1:', window.db.events.length);
console.log('Sessions v1:', window.db.sessions.length);
console.log('Reviews v1:', Object.keys(window.db.reviews || {}).length);
```
Lưu lại 4 số này.

Sau khi patch + login:
- [ ] Toast: `✅ Đã chuyển dữ liệu cũ sang schema mới: N task, M sự kiện, K session`
- [ ] N, M, K khớp số trước migration
- [ ] **Firebase Console** kiểm tra:
  - [ ] `users/{uid}/tasks/` có đúng N documents
  - [ ] `users/{uid}/events/` có đúng M documents
  - [ ] `users/{uid}/sessions/` có đúng K documents (KHÔNG phải `focusSessions/`)
  - [ ] `users/{uid}/settings/main` có data
  - [ ] `users/{uid}/reviews/main` có `.data` map nếu có reviews cũ
  - [ ] `users/{uid}.migrationVersion == 2`
  - [ ] `users/{uid}._backup_v1` chứa data cũ (BACKUP an toàn)
  - [ ] `users/{uid}.db` vẫn còn (legacy backup)
- [ ] Reload app → tất cả task vẫn hiện
- [ ] Login lại lần 2 → Console: `[migration] Already at version 2 — skipping`

### T6. Logout → login lại — không mất dữ liệu local
- [ ] Tạo 3 task khi đã login
- [ ] Logout → task vẫn hiển thị (localStorage)
- [ ] Login lại → 3 task vẫn còn, KHÔNG duplicate

---

## [P1 HIGH] — Pass trước khi public

### T7. Offline → online
- [ ] DevTools → Network → Throttling: "Offline"
- [ ] Sync indicator: `⊘ Offline` (cam)
- [ ] Tạo task offline → hiện trên UI (local)
- [ ] Bật Network → indicator `⟳` → `✓`
- [ ] Firestore Console: task offline xuất hiện trên cloud

### T8. Conflict resolution — sửa cùng task trên 2 device
- [ ] A và B cùng có task "X"
- [ ] Tắt Network cả 2
- [ ] A sửa: "X — A"
- [ ] B sửa: "X — B"
- [ ] Bật A trước, đợi sync xong (5s)
- [ ] Bật B
- [ ] Kết quả: cả A và B cùng hiển thị "X — B" (B save sau, last-writer-wins)
- [ ] KHÔNG mất cả task X (không mất task)

### T9. Export / Import JSON
- [ ] Click "↑ Xuất dữ liệu" → file `.json` download
- [ ] Mở file → đầy đủ tasks, events, sessions, settings, reviews
- [ ] Xoá hết → import file vừa xuất
- [ ] Data restored đầy đủ
- [ ] Login → data restored sync lên cloud

### T10. Legal pages
- [ ] `/privacy.html` mở được, render OK
- [ ] `/terms.html` mở được, render OK
- [ ] `/contact.html` mở được, mailto link work
- [ ] Link từ sidebar app → mở privacy/terms được

### T11. Sync indicator
- [ ] Chưa login: `○ Chưa đăng nhập`
- [ ] Đang sync: `⟳ Đang đồng bộ...` có animation xoay
- [ ] Xong: `✓ Đã đồng bộ`
- [ ] Offline: `⊘ Offline` màu cam
- [ ] Error: `! Lỗi đồng bộ` nền đỏ nhạt
- [ ] Click indicator → alert chi tiết + tips
- [ ] CSS variable đúng: dùng `--panel`, `--line` (khớp style.css), không broken theme khi đổi giao diện
- [ ] Trên mobile: indicator KHÔNG đè lên thanh bottom tabs (đã có media query đẩy lên 70px)

### T12. Service Worker v10
- [ ] DevTools → Application → Service Workers: thấy `sw.js?v=10` activated
- [ ] Cache Storage: thấy `tlf-v10-static` và `tlf-v10-runtime`
- [ ] KHÔNG còn cache cũ `tlf-v9-*` (Phase B activate sẽ tự xoá)
- [ ] Test offline: app vẫn load (HTML cached)
- [ ] Firebase requests KHÔNG bị cache: Network tab thấy request đến `firestore.googleapis.com` đi qua mạng

### T13. Sentry (nếu đã setup DSN)
- [ ] Console: `[Sentry] Initialized successfully`
- [ ] Test: `throw new Error('test-sentry-' + Date.now())`
- [ ] Trong 30s, Sentry dashboard hiện error
- [ ] Verify: email user KHÔNG xuất hiện trong Sentry event detail
- [ ] Verify: task title KHÔNG bị log trong breadcrumbs

---

## [P2 MEDIUM] — Cải thiện trải nghiệm

### T14. PWA install
- [ ] Chrome: thanh URL có icon "Install"
- [ ] Install → app chạy standalone
- [ ] iOS Safari: Share → Add to Home Screen

### T15. Security headers (sau khi deploy)
```bash
curl -I https://timeline-app-one-beta.vercel.app
```
Phải có:
- [ ] `strict-transport-security: max-age=63072000; includeSubDomains; preload`
- [ ] `x-content-type-options: nosniff`
- [ ] `x-frame-options: DENY`
- [ ] `content-security-policy: default-src 'self'; ...`

### T16. CSP không block app
- [ ] App load đầy đủ
- [ ] Firebase Auth popup mở được
- [ ] Console KHÔNG có "Refused to load... violates CSP"

### T17. Performance (Lighthouse)
- [ ] Performance: ≥ 80
- [ ] Accessibility: ≥ 90
- [ ] Best Practices: ≥ 95
- [ ] SEO: ≥ 90
- [ ] PWA: ≥ 90

### T18. Mobile responsive
- [ ] iPhone Safari: UI không tràn, sync indicator không che bottom tabs
- [ ] Android Chrome: UI ổn
- [ ] Tablet ngang: layout ổn

---

## [P3 LOW] — Nice to have

### T19. Browser compat
- [ ] Chrome 120+, Firefox 120+, Safari 17+, Edge 120+
- [ ] Safari iOS 16+, Chrome Android

### T20. XSS spot check
> App.js đã có esc() đầy đủ (Phase B audit PASS). Spot check để chắc:
- [ ] Tạo task với title: `<img src=x onerror="alert('xss')">`
- [ ] Task hiển thị **text raw** (thấy chữ `<img...>`), KHÔNG alert
- [ ] Tạo task tag: `<script>alert(1)</script>`
- [ ] Tag hiển thị text raw, KHÔNG chạy script

---

## 🚨 Failure recovery

### Sync không work
1. Console: `window.getSyncStatus()` → xem status + error
2. Network tab: request đến `firestore.googleapis.com` → status?
3. `403` → Rules quá chặt → check `firestore.rules` validators
4. `400` → schema sai → check `sanitize*ForFirestore` trong `schema.js`

### Migration fail
1. Console search `[migration]` → tìm error
2. Firebase Console: `users/{uid}._backup_v1` còn không?
3. Emergency rollback:
   ```js
   import('./src/core/migration.js').then(m =>
     m.rollbackMigration(window.dbFire, window.currentUserId)
   );
   ```

### Task biến mất sau sync
1. Firebase Console: `users/{uid}/tasks/{taskId}` còn không?
2. Nếu có nhưng `deletedAt != null` → bị soft delete, có thể clear field
3. Localstorage: `localStorage.getItem('timeline_focus_product_final_v6')` còn data?

### Login fail
1. Firebase Console → Authentication → Users → user tồn tại?
2. Authorized domains có domain hiện tại?
3. `auth/unauthorized-domain` → thêm domain vào Firebase Console
4. iOS Safari "Prevent Cross-Site Tracking" → chặn popup → fallback redirect (em đã handle)

---

## Báo cáo sau test

```
TEST RESULT — <ngày>
Tester: <tên>
Phiên bản: <commit hash>

[P0 CRITICAL]: X/6 pass
[P1 HIGH]: Y/7 pass
[P2 MEDIUM]: Z/5 pass

Lỗi phát hiện:
1. <mô tả ngắn> — severity (P0/P1/P2/P3)
2. ...

Sẵn sàng production: YES / NO / WITH-CAVEATS
Caveats: <nếu có>
```
