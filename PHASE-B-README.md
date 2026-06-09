# Timeline Focus — Production Hardening Package

> **Phase B FINAL** — bộ deliverable hoàn chỉnh sau khi audit toàn bộ codebase thật (`app.js` 1136 dòng + `style.css` 1926 dòng).
> Nguyên tắc: **không phá `app.js`, backward compat tuyệt đối, deploy được ngay, có thể rollback**.

---

## 📦 Có gì trong package này

```
timeline-focus-production/
│
├── 📄 AUDIT-REPORT.md         ← Audit chi tiết Phase A + Phase B (đọc đầu tiên)
├── 📄 PATCH-index-html.md     ← Hướng dẫn patch index.html + app.js (~5 dòng)
├── 📄 DEPLOY-GUIDE.md         ← Deploy 6 phase (Rules → Code → Sentry → ...)
├── 📄 TEST-CHECKLIST.md       ← Checklist test thủ công P0/P1/P2/P3
├── 📄 PHASE-B-CHANGELOG.md    ← Diff Phase A → Phase B (cực kỳ quan trọng)
├── 📄 README.md               ← (file này)
│
├── 🔒 firestore.rules         ← CRITICAL — Deploy NGAY, ngăn user đọc data người khác
├── ⚙️  firebase.json
├── ⚙️  firestore.indexes.json
├── 🛡️  vercel.json             ← Security headers (CSP, HSTS, X-Frame-Options)
├── ⚡ sw.js                   ← Service Worker v10 (cache strategy đúng, skip Firebase)
│
├── public/
│   ├── 📄 privacy.html        ← Chính sách quyền riêng tư (GDPR + NĐ 13/2023)
│   ├── 📄 terms.html          ← Điều khoản sử dụng
│   └── 📄 contact.html        ← Liên hệ + báo lỗi
│
└── src/
    ├── core/
    │   ├── 📐 schema.js        ← Type definitions + sanitizers (đã FIX để khớp app.js)
    │   ├── 🔁 sync-engine.js   ← CRITICAL — Sync per-entity, thay block Firebase cũ
    │   └── 🔄 migration.js     ← Migration v1 → v2 (idempotent, có backup)
    ├── utils/
    │   └── 🛡️  safe-dom.js     ← XSS-safe DOM helpers (utility cho code mới, KHÔNG apply vào app.js)
    ├── ui/
    │   └── 🎯 sync-indicator.js ← Widget trạng thái sync (góc phải dưới, CSS variables đúng)
    └── integrations/
        └── 📊 sentry.js        ← Error monitoring (privacy-safe, KHÔNG gửi PII)
```

---

## ⚡ Quickstart (3 bước, ~25 phút)

### 1. Deploy Firestore Rules (5 phút) — CRITICAL
```bash
cp firestore.rules firebase.json firestore.indexes.json /path/to/your-project/
cd /path/to/your-project
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 2. Patch code (15 phút)
```bash
# Copy code mới vào project
cp -r src /path/to/your-project/
cp sw.js /path/to/your-project/
cp public/*.html /path/to/your-project/
cp vercel.json /path/to/your-project/

# Mở index.html theo PATCH-index-html.md:
# - Xóa block <script type="module"> Firebase cũ (~dòng 223-357)
# - Thay bằng 3 dòng module mới (Sentry + sync-engine + sync-indicator)
# - Thêm link privacy/terms/contact vào sidebar

# Mở app.js đổi 1 dòng:
# sw.js?v=9 → sw.js?v=10

# Setup Sentry (optional):
# - Tạo project tại sentry.io
# - Paste DSN vào src/integrations/sentry.js
```

### 3. Test + deploy (5 phút)
Theo `TEST-CHECKLIST.md` chạy tối thiểu **[P0 CRITICAL]** 6 test, rồi:
```bash
git add . && git commit -m "feat: phase B production hardening"
git push   # Vercel auto-deploy
```

---

## 🎯 Vấn đề đã giải quyết

| Vấn đề | Cách giải quyết | File |
|---|---|---|
| Lưu toàn bộ DB user 1 doc → vỡ 1MB ~3000 task | Subcollection per entity | `sync-engine.js`, `firestore.rules` |
| Sync last-write-wins toàn doc → mất task 2 device | Conflict resolution per entity bằng `updatedAt` ISO | `sync-engine.js`, app.js `mergeById` |
| Không có Firestore Rules → cross-user access | Rules validate auth + ownership + schema | `firestore.rules` |
| Không có migration → user cũ stuck | Migration idempotent + backup `_backup_v1` | `migration.js` |
| Silent fail sync | Sync indicator + event system | `sync-indicator.js` |
| Không có legal pages | Privacy + Terms + Contact | `public/*.html` |
| Không có security headers | CSP + HSTS + X-Frame-Options | `vercel.json` |
| Không có error monitoring | Sentry privacy-safe | `sentry.js` |
| SW không tồn tại / cache strategy sai | SW v10 mới với cache đúng + skip Firebase | `sw.js` |
| Render user input | App.js đã có `esc()` đầy đủ → VERDICT XSS PASS | (giữ nguyên) |

---

## 🛡️ Nguyên tắc thiết kế

### 1. Backward compatibility tuyệt đối
- **KHÔNG sửa `app.js`** (trừ đổi `sw.js?v=9` → `?v=10`, 1 dòng)
- **KHÔNG sửa CSS, không sửa DOM**
- Chỉ thay 1 block `<script type="module">` trong `index.html`
- Cùng interface: `window.firebaseSync(db)`, `window.updateDbFromFirebase(db)`, `window.currentUserId`
- App.js có sẵn `mergeDbStates`, `mergeById` → em **không can thiệp**, để app.js tự merge

### 2. Không xóa data cũ
- Migration backup data v1 sang `users/{uid}._backup_v1`
- Giữ luôn `users/{uid}.db` (data v1 gốc) ít nhất 30 ngày
- Rollback dễ bằng git revert hoặc swap block trong index.html

### 3. Idempotent — chạy nhiều lần không corrupt
- Migration: 2 device migrate đồng thời cũng OK (cùng ID = overwrite)
- Sync: re-sync không tạo duplicate
- Login: re-login không trigger migrate lại

### 4. Fail-safe
- Sync lỗi → toast cảnh báo + indicator đỏ (KHÔNG silent)
- Migration lỗi → giữ data cũ, không set `migrationVersion = 2`
- Sentry catch lỗi → có cảnh báo gửi về email anh
- SW network-first cho HTML → không serve stale code

### 5. Privacy-safe
- Sentry KHÔNG gửi email user (scrub trong `beforeSend`)
- Sentry KHÔNG gửi task content (truncate breadcrumbs)
- Privacy Policy compliant GDPR + NĐ 13/2023
- KHÔNG dùng Google Analytics

---

## 🚀 Phase C — Sau khi Phase B stable 2-4 tuần

Anh đã chọn **"phương án an toàn nhất"** → Phase C KHÔNG vội. Để app stable trước, sau đó mới làm:

| # | Việc | Khi nào nên làm |
|---|---|---|
| C1 | App Check (Firebase) | Khi public rộng, có người spam Firebase |
| C2 | Tách app.js thành modules | Khi app.js > 3000 dòng |
| C3 | Vite + TypeScript | Khi có team > 1 dev hoặc cần type safety |
| C4 | Unit tests Vitest | Khi refactor lớn để giữ regression |
| C5 | Per-entity event API | Tối ưu sync (push chỉ entity thay đổi, không diff toàn db) |
| C6 | Custom domain | Khi product có thương hiệu ổn định |
| C7 | App Store / Play Store (PWA wrapper) | Khi sẵn sàng marketing |

---

## 📞 5 câu hỏi anh đã trả lời

1. **Custom domain hay vercel.app?** → vercel.app (an toàn nhất). Mua domain Phase C.
2. **User thật?** → Chưa nhưng treat như có. Migration cẩn trọng ✅
3. **SW cache name?** → Không có file → em tạo v10 mới với cache đúng ✅
4. **Sentry?** → YES → `src/integrations/sentry.js` (paste DSN sau)
5. **Vanilla JS hay Vite+TS?** → Vanilla JS (an toàn nhất). Vite+TS Phase C.

---

## 🆘 Khi có vấn đề

1. `AUDIT-REPORT.md` section 6 — bug fix log Phase A → Phase B
2. `DEPLOY-GUIDE.md` section "Khi có sự cố production"
3. `TEST-CHECKLIST.md` section "Failure recovery"
4. DevTools Console:
   ```js
   window.getSyncStatus()       // trạng thái sync hiện tại
   window.currentUserId         // user ID
   window.db                    // local data
   window.dbFire                // Firestore instance
   ```

---

## 📊 Tóm tắt số liệu Phase B

- **Số file**: 19 (17 từ Phase A + 2 mới: `sw.js`, `sentry.js`)
- **Code thực sự**: ~1,800 dòng (sync + migration + schema + safe-dom + sync-indicator + sw + sentry)
- **Rules**: ~200 dòng (validate kỹ + comment)
- **Legal**: ~400 dòng (3 HTML pages)
- **Docs**: ~2,000 dòng (audit + deploy + test + readme + changelog + patch)
- **Số dòng `app.js` cần sửa**: **1 dòng** (đổi `sw.js?v=9` → `?v=10`)
- **Thời gian deploy ước tính**: 25 phút (rules + code + verify)

---

## 📜 Versioning

- **Schema version**: 2 (subcollection-based)
- **Sync engine**: 2.0.0
- **Service Worker**: v10
- **App.js**: giữ nguyên (em không version)
- **Backward compat**: từ schema v1 (single-doc) → v2 (subcollection)
