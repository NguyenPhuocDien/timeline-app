# 🚀 DEPLOY GUIDE — Timeline Focus Production (Phase B FINAL)

> Deploy theo thứ tự: CRITICAL → HIGH → optional. Mỗi phase test riêng, rollback riêng.

---

## Yêu cầu

```bash
# Firebase CLI
npm install -g firebase-tools
firebase login
firebase use --add   # chọn timeline-app-9a872
```

---

## ⚡ PHASE 1 — Deploy Firestore Security Rules (5 phút, CRITICAL)

> **QUAN TRỌNG NHẤT.** Deploy ngay, không cần code mới.

### 1.1 Backup rules hiện tại
```bash
firebase firestore:rules:get > backup-rules-$(date +%Y%m%d).txt
cat backup-rules-*.txt
```

### 1.2 Copy file vào root project
```bash
cp /path/to/timeline-focus-production/firestore.rules .
cp /path/to/timeline-focus-production/firebase.json .
cp /path/to/timeline-focus-production/firestore.indexes.json .
```

### 1.3 Test với Emulator (KHUYẾN NGHỊ)
```bash
firebase emulators:start --only firestore
# Mở http://localhost:4000 → Firestore Emulator UI
```

### 1.4 Deploy
```bash
firebase deploy --only firestore:rules
```

**Output mong đợi:**
```
✓ cloud.firestore: rules file firestore.rules compiled successfully
✓ firestore: released rules firestore.rules to cloud.firestore
✔ Deploy complete!
```

### 1.5 Verify trên Firebase Console
1. https://console.firebase.google.com/project/timeline-app-9a872/firestore/rules
2. Tab "Rules Playground" → test:
   - User A đọc `users/userB/tasks/x` → **Deny** ✅
   - User A đọc `users/userA/tasks/x` → **Allow** ✅
   - User A ghi `users/userA/sessions/x` với `minutes: 30` → **Allow** ✅
   - User A ghi `users/userA/tasks/x` với `status: 'invalid'` → **Deny** ✅

### 1.6 Deploy Firestore indexes (làm cùng lúc)
```bash
firebase deploy --only firestore:indexes
```

Indexes sẽ build trong 5-10 phút. Vào Firebase Console > Firestore > Indexes để xem progress.

### Rollback rules
```bash
# Firebase Console → Firestore → Rules → tab "Versions" → click "Rollback"
# Hoặc:
cp backup-rules-YYYYMMDD.txt firestore.rules
firebase deploy --only firestore:rules
```

---

## 📦 PHASE 2 — Deploy code mới (15 phút)

### 2.1 Copy files vào project Vercel
```bash
cd /path/to/timeline-app-one-beta

# Code mới
cp -r /path/to/timeline-focus-production/src .
cp /path/to/timeline-focus-production/sw.js .
cp /path/to/timeline-focus-production/vercel.json .

# Legal pages (chú ý: chỉ copy file html, KHÔNG copy thư mục public/ overwrite)
cp /path/to/timeline-focus-production/public/privacy.html .
cp /path/to/timeline-focus-production/public/terms.html .
cp /path/to/timeline-focus-production/public/contact.html .
```

### 2.2 Patch `index.html` + `app.js`

Theo `PATCH-index-html.md`:
1. Xóa block `<script type="module">` Firebase cũ (~dòng 223-357)
2. Thay bằng 3 dòng:
   ```html
   <script type="module" src="src/integrations/sentry.js"></script>
   <script type="module" src="src/core/sync-engine.js"></script>
   <script type="module" src="src/ui/sync-indicator.js"></script>
   ```
3. Thêm link legal vào sidebar
4. Trong `app.js`, đổi `sw.js?v=9` → `sw.js?v=10`

### 2.3 Test local TRƯỚC khi push
```bash
python3 -m http.server 8000
# Mở http://localhost:8000
```

**Checklist DevTools Console:**
- [ ] `[Sentry] DSN chưa cấu hình. Bỏ qua khởi tạo.` (nếu chưa setup)
- [ ] KHÔNG có error đỏ
- [ ] Login Google work
- [ ] Tạo task → sync indicator chớp → Firestore có doc mới trong `tasks/`
- [ ] Application tab → Cache Storage: thấy `tlf-v10-static`, `tlf-v10-runtime`

### 2.4 Push lên Vercel
```bash
git add .
git commit -m "feat: phase B sync engine + sentry + sw v10 + legal pages"
git push origin main
```

Vercel tự deploy. Theo dõi tại https://vercel.com/dashboard.

### 2.5 Verify production
1. Mở `https://timeline-app-one-beta.vercel.app`
2. Hard refresh (Cmd+Shift+R)
3. Login → migration tự chạy (nếu có data v1)
4. Toast: `✅ Đã chuyển dữ liệu cũ sang schema mới: N task, M sự kiện, K session`
5. Sync indicator góc phải dưới hiện `✓ Đã đồng bộ`
6. Tạo task → kiểm tra Firestore có doc mới trong `tasks/`

### Rollback code
```bash
# Vercel Dashboard → Deployments → click commit cũ → Promote to Production
# Hoặc:
git revert HEAD
git push origin main
```

---

## 🔐 PHASE 3 — Cập nhật Firebase Console (10 phút)

### 3.1 Authorized domains
Firebase Console → Authentication → Settings → Authorized domains. Có đủ:
- `timeline-app-one-beta.vercel.app`
- `timeline-app-9a872.firebaseapp.com`
- `localhost` (cho dev)

### 3.2 OAuth consent screen
Google Cloud Console → APIs & Services → OAuth consent screen:
- Application name: **Timeline Focus**
- User support email: `support@timeline-focus.app` (hoặc email cá nhân của anh)
- App logo: upload `icon-512.png`
- Application home page: `https://timeline-app-one-beta.vercel.app`
- **Privacy policy link**: `https://timeline-app-one-beta.vercel.app/privacy.html` ✅
- **Terms of service link**: `https://timeline-app-one-beta.vercel.app/terms.html` ✅
- Scopes: chỉ `email`, `profile`

### 3.3 App Check (KHUYẾN NGHỊ, làm sau khi stable)
Bảo vệ Firebase khỏi abuse. Em chưa add vào code để không phá login flow lần đầu.

Khi muốn bật:
1. Firebase Console → App Check → Register
2. Provider: reCAPTCHA v3 (free)
3. Lấy site key, thêm vào `sync-engine.js` (em sẽ làm Phase C nếu anh cần)

---

## 🛡️ PHASE 4 — Setup Sentry (10 phút)

### 4.1 Tạo Sentry project
1. https://sentry.io → Sign up (free tier: 5K errors/month)
2. Create Project → **Browser JavaScript** (KHÔNG phải React/Vue)
3. Project name: `timeline-focus`
4. Platform: JavaScript
5. Copy DSN — dạng:
   ```
   https://abc123def456@o0.ingest.sentry.io/0
   ```

### 4.2 Paste DSN vào code
Mở `src/integrations/sentry.js`, sửa:
```js
const SENTRY_DSN = '__YOUR_SENTRY_DSN_HERE__';
```
Thành:
```js
const SENTRY_DSN = 'https://abc123def456@o0.ingest.sentry.io/0';
```

### 4.3 Commit + deploy
```bash
git add src/integrations/sentry.js
git commit -m "feat: configure Sentry DSN"
git push
```

### 4.4 Test Sentry
1. Mở app production
2. DevTools Console:
   ```js
   throw new Error('test-sentry-' + Date.now())
   ```
3. Trong 30 giây, Sentry dashboard hiện error
4. Verify: lỗi KHÔNG chứa email user (em đã scrub trong `beforeSend`)

### 4.5 Setup Sentry alerts (optional)
1. Sentry → Alerts → New Alert Rule
2. Condition: `An issue is first seen`
3. Action: Send email tới anh
4. Save

---

## 🌐 PHASE 5 — Custom Domain (tùy chọn, không vội)

> Anh đã chọn "phương án ổn định nhất" → **KHÔNG mua domain ngay**. Giữ `*.vercel.app` cho đến khi app stable 3-6 tháng.

Khi quyết định mua:
1. Mua domain (Cloudflare Registrar khoảng $9-15/năm)
2. Vercel Dashboard → Project → Settings → Domains → Add
3. DNS Cloudflare: A record `@ → 76.76.21.21`, CNAME `www → cname.vercel-dns.com`
4. SSL tự cấp Let's Encrypt
5. **Quan trọng**: cập nhật authorized domains Firebase + OAuth consent screen
6. Cập nhật CSP trong `vercel.json` nếu domain khác hoàn toàn

---

## 📊 PHASE 6 — Monitoring khác (tùy chọn)

### 6.1 UptimeRobot (free)
1. https://uptimerobot.com → tạo monitor
2. URL: production URL
3. Interval: 5 phút
4. Email alert khi down

### 6.2 Analytics (privacy-friendly)
**Plausible** ($9/tháng):
```html
<script defer data-domain="timeline-app-one-beta.vercel.app"
        src="https://plausible.io/js/script.js"></script>
```

**Umami** (self-host free):
- Deploy free trên Vercel theo https://umami.is/docs/install

**KHÔNG dùng Google Analytics** — yêu cầu cookie banner ở EU và làm chậm app.

---

## ✅ Final checklist trước khi public

- [ ] Firestore Rules deployed (Phase 1) — anh test bằng Rules Playground
- [ ] Firestore Indexes deployed và đã build xong (~10 phút)
- [ ] Sync engine v2 chạy trên production (Phase 2)
- [ ] Test login → tạo task → 2 thiết bị khác nhau sync OK
- [ ] Test migration: account có data cũ → chuyển sang v2 KHÔNG mất tasks/events/sessions/reviews
- [ ] Privacy + Terms + Contact accessible từ link trong sidebar
- [ ] OAuth consent screen có link privacy/terms (Phase 3.2)
- [ ] Sentry catch lỗi test (Phase 4.4)
- [ ] Sync indicator hiển thị đúng các trạng thái (online/offline/syncing/synced/error)
- [ ] Test trên Chrome desktop, Safari iOS, Android Chrome
- [ ] Test offline → online → sync resume
- [ ] Service Worker mới đang chạy: `tlf-v10-static`, `tlf-v10-runtime` trong Cache Storage

---

## 🚨 Khi có sự cố production

### App không load
1. Check Vercel deployment status → có deploy thành công không?
2. Hard refresh (Cmd+Shift+R) hoặc DevTools → Application → Storage → Clear site data
3. Check Sentry recent errors

### Sync không work
1. Click sync indicator → xem chi tiết status
2. Console (F12) tìm `[sync]` log
3. `window.getSyncStatus()` để xem trạng thái
4. Check Firestore Rules có quá strict không qua Rules Playground
5. Nếu khẩn → `window.firebaseLogout()` rồi login lại

### Migration báo lỗi
1. Console search `[migration]` → tìm chi tiết error
2. Firebase Console: `users/{uid}._backup_v1` còn không?
3. Nếu có backup → rollback:
   ```js
   import('./src/core/migration.js').then(m =>
     m.rollbackMigration(window.dbFire, window.currentUserId)
   );
   ```

### User báo mất data
1. Hỏi: dùng app trên thiết bị nào? Login Google nào?
2. Firebase Console → `users/{uid}/tasks/` còn data không?
3. Check `users/{uid}._backup_v1.tasks` (backup khi migration)
4. Check `users/{uid}.db` (legacy v1 vẫn còn)
5. Nếu mất hết → hỏi user có file `.json` đã xuất không (export feature đã có sẵn)
