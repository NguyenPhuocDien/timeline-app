# Phase D — Nâng cấp Data Layer: localStorage → IndexedDB (Dexie.js)

**Ngày:** 11/06/2026
**Trạng thái:** ✅ Hoàn thành, E2E pass 10/10

## Vì sao đổi

- localStorage: 1 JSON blob duy nhất, giới hạn ~5MB, không transaction, không index,
  mỗi lần lưu serialize toàn bộ app. Đã từng phải xử lý `QuotaExceededError` thủ công.
- Conflict resolution cũ: last-write-wins "mù" theo `updatedAt` — 2 thiết bị sửa cùng
  lúc thì một bên bị ghi đè im lặng (đúng bài học Super Productivity đã trả giá).

## Kiến trúc mới

```
IndexedDB (Dexie.js, vendor local — KHÔNG cần bundler/CDN ngoài)
  ├─ tasks / events / sessions   (per-entity table, key = id)
  ├─ kv                          (settings, reviews — gồm cả ảnh nền base64)
  └─ conflicts                   (nhật ký xung đột sync, cap 200 dòng)
        ↑ nguồn dữ liệu CHÍNH trên thiết bị

localStorage (key cũ giữ nguyên)
  └─ boot-cache rút gọn (KHÔNG chứa ảnh nền base64) → app vẫn render tức thì

Firestore — giữ nguyên schema v2, thêm conflict detection trước khi merge
```

- **Boot flow:** app.js đọc localStorage (sync, nhanh) → `src/core/storage.js` load
  IndexedDB → merge LWW theo `updatedAt` qua `window.updateDbFromStorage` → render.
- **Save flow:** `save()` ghi localStorage (slim) + debounce 400ms ghi IndexedDB
  (+ flush khi `pagehide`/tab ẩn) + push Firebase như cũ.
- **Migration:** lần chạy đầu, nếu IndexedDB trống → tự seed từ dữ liệu localStorage
  hiện có. Không cần user làm gì. Export/Import JSON giữ nguyên làm safety net.
- **Fallback:** nếu IndexedDB không mở được (private mode cũ…) → app chạy y như cũ
  trên localStorage (`window.idbActive = false`, hiển thị trong Settings).

## Conflict detection (sync-engine v2.1)

- So sánh local/remote với baseline lần sync trước: nếu CẢ HAI đều đổi `updatedAt`
  VÀ nội dung thực sự khác nhau (deepEqual sau stripSyncMeta) → ghi cả 2 bản vào
  bảng `conflicts` (IndexedDB), toast cảnh báo, merge vẫn giữ bản mới hơn.
- Tránh false positive: task bị auto-stack qua ngày trên 2 thiết bị (nội dung giống
  hệt, chỉ lệch timestamp) KHÔNG bị báo xung đột.
- Settings → card "Đồng bộ Đám mây": xem số xung đột, tải bản sao JSON, xóa nhật ký.
- Giới hạn đã biết: baseline chỉ tồn tại trong phiên (memory) — xung đột kiểu
  "sửa offline → đóng app → mở lại" vẫn merge LWW im lặng. Nâng cấp sau: lưu baseline
  vào IndexedDB.

## Sửa kèm theo

1. **Seed events có id cố định** (`seed-2026-01-01-tet-duong-lich`…) — trước đây mỗi
   lần `defaultData()` chạy tạo uid mới → nhân đôi ngày lễ khi merge nhiều nguồn.
   `dedupeEvents()` chỉ gộp event khớp catalog seed (event user tạo không bao giờ bị
   gộp; tombstone đã xóa luôn thắng).
2. **firestore.rules siết chặt:** `isValidSettings` (whitelist field + type check),
   `isValidReviews` (whitelist `data/updatedAt/createdAt/migratedFrom`, `data` phải là map).
   ⚠️ **Cần deploy lại rules:** `firebase deploy --only firestore:rules`
3. **schema.js `sanitizeSettingsForFirestore`** đổi sang whitelist (khớp rules).
4. **Service Worker v11:** precache thêm storage engine + toàn bộ module sync + Dexie.

## Files

| File | Thay đổi |
|---|---|
| `vendor/dexie.min.js` | MỚI — Dexie 4 ESM vendored (87KB, serve từ 'self', không cần đổi CSP) |
| `src/core/storage.js` | MỚI — storage engine IndexedDB |
| `app.js` | persistLocal slim cache, updateDbFromStorage, SEED_EVENTS id cố định, dedupeEvents, UI xung đột + backend storage trong Settings, SW v=11 |
| `src/core/sync-engine.js` | detectConflicts() trước merge |
| `src/core/schema.js` | settings sanitizer whitelist |
| `firestore.rules` | isValidSettings + isValidReviews |
| `sw.js` | v11 + precache mới |
| `tests/e2e/storage.spec.js` | MỚI — 3 test: migration localStorage→IDB, sống sót khi mất localStorage, ảnh nền ngoài localStorage nhưng khôi phục từ IDB |

## Kiểm chứng

- `npx playwright test` → **10/10 pass** (5 passed + 5 skipped theo project desktop/mobile)
- Review độc lập đã thực hiện: 1 critical (rules chặn reviews push) + 1 major
  (dedupe nuốt event user) + 3 minor — **tất cả đã fix và re-test**.
