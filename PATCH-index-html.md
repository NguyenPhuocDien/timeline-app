# 🩹 PATCH: index.html (Phase B FINAL)

> Sửa MỘT block duy nhất trong `index.html` + 1 dòng nhỏ trong `app.js`.
> **Không phá UI, không phá CSS, giữ app.js logic gốc.**

---

## Tóm tắt thay đổi

| Việc | File | Số dòng |
|---|---|---|
| Thay block Firebase `<script type="module">` | `index.html` | ~135 dòng → 3 dòng |
| Thêm Sentry trước app.js (optional) | `index.html` | +1 dòng |
| Bump SW version `v=9` → `v=10` | `app.js` | đổi 1 chỗ |
| Thêm link legal pages | `index.html` (sidebar) | +3 link |

---

## STEP 1 — Xóa block Firebase cũ trong `index.html`

**TÌM** (từ comment `<!-- FIREBASE INTEGRATION SCRIPT -->` đến `</script>` cuối, ~dòng 223-357):

```html
<!-- FIREBASE INTEGRATION SCRIPT -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
  ...
  // (toàn bộ block, từ dòng ~223 đến ~357)
  ...
</script>
```

**XÓA** toàn bộ block đó.

---

## STEP 2 — Thay bằng 3 dòng module mới

**Tại vị trí vừa xóa, dán:**

```html
<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- TIMELINE FOCUS — Sentry (optional, để giữ trên cùng để catch lỗi sớm)   -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<script type="module" src="src/integrations/sentry.js"></script>

<!-- ─────────────────────────────────────────────────────────────────────── -->
<!-- TIMELINE FOCUS — Sync Engine v2 (per-entity, conflict resolution)       -->
<!-- ─────────────────────────────────────────────────────────────────────── -->
<script type="module" src="src/core/sync-engine.js"></script>
<script type="module" src="src/ui/sync-indicator.js"></script>
```

> **Lưu ý**: nếu chưa dùng Sentry (chưa có DSN), em vẫn an toàn — `sentry.js` tự check và bỏ qua nếu DSN chưa cấu hình.

### Tùy chọn: config Firebase tự custom

Nếu sau này muốn dùng Firebase project khác (staging vs production):

```html
<script type="module">
  import { initSyncEngine } from './src/core/sync-engine.js';
  import './src/ui/sync-indicator.js';
  import './src/integrations/sentry.js';

  initSyncEngine({
    apiKey: "YOUR_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT",
    storageBucket: "YOUR_PROJECT.firebasestorage.app",
    messagingSenderId: "...",
    appId: "..."
  });
</script>
```

---

## STEP 3 — Cập nhật SW version trong `app.js`

**TÌM** trong `app.js` (dòng 365):
```js
.register('./sw.js?v=9', { updateViaCache: 'none' })
```

**ĐỔI** thành:
```js
.register('./sw.js?v=10', { updateViaCache: 'none' })
```

Lý do: SW v10 có cache strategy mới (network-first cho HTML, skip Firebase domains). Bump version để browser invalidate cache cũ.

---

## STEP 4 — Thêm link legal pages

Trong sidebar (`<aside class="side">`) hoặc cuối main, thêm:

```html
<div class="legalLinks" style="padding:12px;font-size:11px;color:var(--muted);text-align:center;border-top:1px solid var(--line)">
  <a href="/privacy.html" target="_blank" rel="noopener" style="color:inherit">Quyền riêng tư</a>
  <span style="margin:0 4px">·</span>
  <a href="/terms.html" target="_blank" rel="noopener" style="color:inherit">Điều khoản</a>
  <span style="margin:0 4px">·</span>
  <a href="/contact.html" target="_blank" rel="noopener" style="color:inherit">Liên hệ</a>
</div>
```

Bắt buộc có theo Google OAuth Branding Guidelines + NĐ 13/2023/NĐ-CP VN.

---

## STEP 5 — Setup Sentry DSN (tùy chọn, nhưng anh đã chọn YES)

1. Tạo project tại https://sentry.io → chọn "Browser JavaScript"
2. Copy DSN (dạng `https://abc...@o0.ingest.sentry.io/0`)
3. Mở `src/integrations/sentry.js`, tìm:
   ```js
   const SENTRY_DSN = '__YOUR_SENTRY_DSN_HERE__';
   ```
4. Paste DSN vào:
   ```js
   const SENTRY_DSN = 'https://abc...@o0.ingest.sentry.io/0';
   ```

Nếu chưa muốn setup Sentry ngay, **để nguyên placeholder** — code tự skip an toàn.

---

## STEP 6 — KHÔNG cần sửa app.js (TRỪ STEP 3 ở trên)

App.js của anh **đang gọi** các function này:
- `window.firebaseLogin()` — vẫn còn ✅
- `window.firebaseLogout()` — vẫn còn ✅
- `window.firebaseSync(db)` — vẫn còn (nội bộ đã đổi sang per-entity) ✅
- `window.updateDbFromFirebase(db)` — anh tự định nghĩa, sync engine sẽ gọi ✅
- `window.currentUserId` — vẫn được set ✅

App.js có sẵn `mergeDbStates`, `mergeById`, `cloudComparableDb` → **em không can thiệp, để app.js merge như nó vẫn làm**.

---

## STEP 7 — Lưu ý quan trọng về schema (Phase B FIX)

App.js dùng các field names:
- `db.sessions` (KHÔNG phải `focusSessions`) ✅ sync engine v2 đã đúng
- `db.reviews` (object map theo ngày) ✅ sync engine v2 đã thêm
- `task.mission` (KHÔNG phải `isMission`) ✅ rules đã đúng
- `task.tags` là **array of strings** (không có dấu `#`) ✅ sanitizer đã đúng
- `event.recurring` là **boolean** (KHÔNG phải `'yes'/'no'`) ✅ rules đã đúng

Tất cả các điểm trên em đã verify khớp `app.js` 1136 dòng. Không cần sửa app.js.

---

## Rủi ro & Rollback

### Rủi ro: thấp
Em giữ nguyên app.js, không đụng DOM, không đụng CSS.
- **Tệ nhất**: sync engine v2 có bug → toast cảnh báo → user vẫn có local data
- **Không bao giờ**: mất data local (app.js có save() lưu localStorage trước rồi mới firebaseSync)

### Rollback nhanh (nếu phát hiện vấn đề production)

**Option A — Git revert** (an toàn nhất):
```bash
git revert <commit-hash>
git push
```

**Option B — Thủ công**:
1. Trong `index.html`, comment 3 dòng module mới
2. Uncomment block `<script type="module">` cũ
3. Trong `app.js`, đổi `sw.js?v=10` → `sw.js?v=9`
4. Deploy

Data trên Firestore **vẫn còn nguyên**:
- Subcollections `tasks/`, `events/`, `sessions/` — không bị xóa
- `users/{uid}.db` (legacy) — vẫn còn
- `users/{uid}._backup_v1` — backup trước migration

**Option C — DevTools console** (mark migration chưa chạy, để engine cũ đọc lại từ `.db`):
```js
import('./src/core/migration.js').then(m =>
  m.rollbackMigration(window.dbFire, window.currentUserId)
);
```

---

## Cách test sau khi patch

```bash
# 1. Serve local
python3 -m http.server 8000
# Mở http://localhost:8000

# 2. Mở DevTools Console — phải thấy:
[Sentry] DSN chưa cấu hình. Bỏ qua khởi tạo.      # nếu chưa setup Sentry
[sync] (không có error đỏ)

# 3. Login Google — phải thấy:
✅ Đã kết nối Cloud: ...
✅ Đã chuyển dữ liệu cũ sang schema mới: N task, M sự kiện, K session    ← chỉ lần đầu

# 4. Kiểm tra Firestore Console:
   users/{uid}/tasks/{taskId}      ← subcollection có data
   users/{uid}/events/{eventId}
   users/{uid}/sessions/{sessionId}      ← chú ý: sessions, KHÔNG phải focusSessions
   users/{uid}/settings/main
   users/{uid}/reviews/main              ← MỚI
   users/{uid}.migrationVersion == 2
   users/{uid}._backup_v1 = {...}        ← backup

# 5. Tạo task mới → kiểm tra:
   - Sync indicator (góc phải dưới): chớp "Đang đồng bộ" → "Đã đồng bộ"
   - Firestore Console: có doc mới trong /tasks/{taskId}
   - Trong sw.js → DevTools Application tab → Cache Storage: thấy `tlf-v10-static`, `tlf-v10-runtime`
```
