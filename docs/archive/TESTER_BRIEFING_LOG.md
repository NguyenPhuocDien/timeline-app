# 📋 TESTER BRIEFING LOG - Timeline Focus App
**Ngày báo cáo:** 9 tháng 6, 2026  
**Vai trò Developer:** Nguyễn Phước Điền (MSSV: 21002595)  
**Vai trò Tester:** GPT AI Assistant  
**Trạng thái dự án:** ✅ PRODUCTION READY - Phase B Complete

---

## 🎯 TÓM TẮT EXECUTIVE (cho GPT Tester)

**Timeline Focus** là web app quản lý thời gian cá nhân với khả năng:
- ✅ Offline-first PWA (hoạt động không cần mạng)
- ✅ Firebase Cloud Sync (đồng bộ đa thiết bị)
- ✅ Timeline visualization + Focus timer
- ✅ Task management với analytics
- ✅ 18 themes customizable

**Công nghệ:** Vanilla JavaScript (KHÔNG framework), Firebase v10, Service Worker, Firestore

**Deploy URLs:**
- Production: https://timeline-app-one-beta.vercel.app
- Firebase Console: https://console.firebase.google.com/project/timeline-app-9a872
- GitHub: https://github.com/NguyenPhuocDien/timeline-app

---

## 🔍 ĐIỂM QUAN TRỌNG TESTER CẦN BIẾT

### 1. KIẾN TRÚC CƠ BẢN

```
┌─────────────────────────────────────────────────────┐
│                  USER INTERFACE                     │
│  index.html (360 lines) + app.js (1,136 lines)    │
│  style.css (1,926 lines) - 18 themes               │
└──────────────────┬──────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
    ┌────▼─────┐      ┌─────▼──────┐
    │LocalStore│      │  Firebase  │
    │(Primary) │◄─────┤Cloud (Sync)│
    └──────────┘      └────────────┘
         │                   │
         │            ┌──────▼───────────┐
         │            │ Firestore Rules  │
         │            │ (Security Layer) │
         │            └──────────────────┘
         │
    ┌────▼──────────────────┐
    │   Service Worker v10  │
    │   (Offline Support)   │
    └───────────────────────┘
```

### 2. DATA FLOW - CỰC KỲ QUAN TRỌNG

**Offline → Online Sync:**
```
User tạo task → localStorage (instant) → Firebase sync (debounce 800ms)
                     ↓
              render() update UI
                     ↓
          firebaseSync(db) push to cloud
```

**Online → Device A & B Sync:**
```
Device A: edit task → push to Firestore
                           ↓
                    onSnapshot trigger
                           ↓
Device B: receive update → mergeDbStates() → render()
                  ↓
         Conflict resolution (newestStamp wins)
```

**Migration Schema v1 → v2:**
```
OLD (Phase A):
users/{uid}.db = { tasks: [], events: [], sessions: [] }  ← 1 doc
                   ↓ RISK: 1MB limit khi ~3000 tasks

NEW (Phase B):
users/{uid}/tasks/{taskId}      ← per-entity subcollection
users/{uid}/events/{eventId}    
users/{uid}/sessions/{sessionId}
users/{uid}/settings/main       ← 1 doc
users/{uid}/reviews/main        ← 1 doc map
users/{uid}._backup_v1          ← backup data cũ (safety)
```

---

## 🧪 TEST PRIORITY MATRIX

### [P0 CRITICAL] - PHẢI TEST TRƯỚC PRODUCTION

| Test ID | Scenario | Expected Result | Risk if Fail |
|---------|----------|-----------------|--------------|
| **T1** | Login với Google | Toast success, sync indicator ✓ | User không dùng được cloud |
| **T2** | Create/Edit/Delete task | Firestore có doc tương ứng | Mất data |
| **T3** | Cross-user access | User B KHÔNG thấy data User A | Security breach |
| **T4** | 2-device sync | Task từ A → xuất hiện B trong 2s | Data loss |
| **T5** | Migration v1→v2 | Backup tạo, data migrate đầy đủ | Legacy user bị stuck |
| **T6** | Logout → Login | Data local + cloud đồng bộ | Data loss |

### [P1 HIGH] - TEST TRƯỚC PUBLIC

| Test ID | Scenario | Expected Result |
|---------|----------|-----------------|
| **T7** | Offline → Online | Task tạo offline sync lên khi có mạng |
| **T8** | Conflict resolution | Last-write-wins, KHÔNG mất task |
| **T9** | Export/Import JSON | Data restore đầy đủ |
| **T10** | Legal pages | Privacy/Terms/Contact render OK |
| **T11** | Sync indicator | 5 states (synced/syncing/offline/error/signed-out) |
| **T12** | Service Worker v10 | Cache đúng, Firebase KHÔNG bị cache |
| **T13** | Sentry errors | Error gửi về, KHÔNG leak PII |

### [P2 MEDIUM] - QUALITY ASSURANCE

- PWA install (Chrome/iOS)
- Security headers (CSP, HSTS, X-Frame-Options)
- Performance Lighthouse ≥80
- Mobile responsive

### [P3 LOW] - NICE TO HAVE

- Browser compatibility matrix
- XSS spot check (đã audit PASS)

---

## 🐛 BUG ĐÃ FIX (Phase A → Phase B)

**Context:** Phase A code dựa trên SUY ĐOÁN từ HTML form. Phase B đọc `app.js` thật mới phát hiện sai.

| Bug | Impact | Status |
|-----|--------|--------|
| Tên collection `focusSessions` thay vì `sessions` | **MẤT focus history** | ✅ Fixed |
| Thiếu `reviews` data | **MẤT review data** | ✅ Fixed |
| `task.isMission` thay vì `task.mission` | Rules reject task hợp lệ | ✅ Fixed |
| `event.recurring` là string thay vì boolean | Rules reject event | ✅ Fixed |
| `tags` là string thay vì array | Tags parse sai | ✅ Fixed |
| Timestamp dùng Firestore type thay vì ISO string | Conflict resolution lỗi | ✅ Fixed |
| CSS variables sai (`--card` vs `--panel`) | Sync indicator broken UI | ✅ Fixed |
| Service Worker chưa có file | Cache strategy sai | ✅ Created v10 |

**⚠️ Nếu test thấy `focusSessions/` trong Firestore → Phase A đã deploy → cần rollback!**

---

## 🔒 SECURITY CHECKLIST (cho Tester)

### Firestore Security Rules

**Phải verify:**
1. User A login → create task → Firestore: `users/{A_UID}/tasks/{taskId}`
2. User B login → Console chạy:
   ```js
   const { doc, getDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
   await getDoc(doc(window.dbFire, 'users', 'UID_CỦA_A', 'tasks', 'task_id_A'))
   ```
3. **Expected:** `permission-denied` error ✅
4. **Fail case:** B thấy task A → CRITICAL BUG

### XSS Protection

**App.js đã audit PASS** (Phase B). Spot check:
```js
// Test input
Title: <img src=x onerror="alert('xss')">
Tag: <script>alert(1)</script>

// Expected: text hiển thị raw, KHÔNG execute code
```

**Tất cả user data đã escape qua `esc()` function:**
```js
function esc(s) { 
  return String(s ?? '')
    .replace(/[&<>"]/g, m => 
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])
    )
}
```

### CSP Headers (Vercel)

Sau deploy, verify:
```bash
curl -I https://timeline-app-one-beta.vercel.app | grep -i "content-security-policy"
```

Phải có whitelist: Firebase, Sentry, Google Fonts. KHÔNG có `unsafe-eval`.

---

## 📊 DATA SCHEMA (cho Test Cases)

### Task Object
```js
{
  id: "uuid-string",
  title: "Học TypeScript",              // user input - CẦN escape
  date: "2026-06-09",                    // YYYY-MM-DD
  duration: 90,                          // minutes
  priority: "high",                      // enum: high|medium|low
  status: "todo",                        // enum: todo|doing|done|deferred|stack|deleted
  start: "14:00",                        // HH:MM optional
  end: "15:30",                          // HH:MM optional
  deadline: "18:00",                     // HH:MM optional
  tags: ["study", "typescript"],         // array (KHÔNG phải string)
  mission: true,                         // boolean (KHÔNG phải isMission)
  notes: "Xem docs + làm bài tập",       // user input - CẦN escape
  eventId: "event-uuid",                 // optional link
  flow: {                                // deep object
    summary: "Overview...",
    checklist: [{ id, text, done }],
    notes: [{ id, text, createdAt }],
    blockers: [...],
    nextActions: [...],
    logs: [...]
  },
  createdAt: "2026-06-09T07:30:00.000Z", // ISO string (NOT Firestore Timestamp)
  updatedAt: "2026-06-09T08:15:00.000Z"
}
```

### Event Object
```js
{
  id: "uuid",
  title: "Tết Nguyên Đán",
  type: "lunar",                         // solar | lunar
  date: "2027-02-06",
  recurring: true,                       // boolean (NOT 'yes'/'no')
  notes: "Mùng 1 Tết",
  createdAt: "2026-06-09T07:00:00.000Z",
  updatedAt: "2026-06-09T07:00:00.000Z"
}
```

### Session Object (Focus Timer History)
```js
{
  id: "uuid",
  taskId: "task-uuid",                   // optional
  date: "2026-06-09",
  minutes: 25,                           // focus duration
  createdAt: "2026-06-09T08:30:00.000Z"
}
```

**⚠️ Tên collection: `sessions` KHÔNG phải `focusSessions`**

---

## 🧩 TEST DATA SETUP (cho Tester)

### Tạo Test Accounts

Cần 2 tài khoản Google:
- **User A:** test-timeline-a@gmail.com
- **User B:** test-timeline-b@gmail.com

### Seed Data Script (DevTools Console)

```js
// Sau khi login, chạy trong Console:

// Tạo 10 tasks đa dạng
for (let i = 0; i < 10; i++) {
  const priorities = ['high', 'medium', 'low'];
  const statuses = ['todo', 'doing', 'done'];
  window.db.tasks.push({
    id: crypto.randomUUID(),
    title: `Test Task ${i + 1}`,
    date: '2026-06-09',
    duration: 30 + i * 15,
    priority: priorities[i % 3],
    status: statuses[i % 3],
    tags: i % 2 === 0 ? ['test', 'automation'] : ['manual'],
    mission: i < 3,
    notes: `Test notes ${i + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    flow: {
      summary: '',
      checklist: [],
      notes: [],
      blockers: [],
      nextActions: [],
      logs: []
    }
  });
}

// Tạo 5 events
for (let i = 0; i < 5; i++) {
  window.db.events.push({
    id: crypto.randomUUID(),
    title: `Test Event ${i + 1}`,
    type: i % 2 === 0 ? 'solar' : 'lunar',
    date: `2026-06-${10 + i}`,
    recurring: i % 2 === 0,
    notes: `Event notes ${i + 1}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

// Tạo 3 sessions
for (let i = 0; i < 3; i++) {
  window.db.sessions.push({
    id: crypto.randomUUID(),
    taskId: window.db.tasks[i]?.id,
    date: '2026-06-09',
    minutes: 25,
    createdAt: new Date().toISOString()
  });
}

// Save và sync
window.db.tasks.forEach(t => { if (!t.flow) t.flow = window.defaultFlow(); });
localStorage.setItem('timeline_focus_product_final_v6', JSON.stringify(window.db));
if (window.firebaseSync) window.firebaseSync(window.db);
window.render();

console.log('✅ Seed data created:', {
  tasks: window.db.tasks.length,
  events: window.db.events.length,
  sessions: window.db.sessions.length
});
```

### Cleanup Script (sau test)

```js
// Xóa tất cả test data
window.db.tasks = window.db.tasks.filter(t => !t.title.includes('Test Task'));
window.db.events = window.db.events.filter(e => !e.title.includes('Test Event'));
window.db.sessions = window.db.sessions.filter(s => 
  !window.db.tasks.find(t => t.id === s.taskId && t.title.includes('Test Task'))
);
localStorage.setItem('timeline_focus_product_final_v6', JSON.stringify(window.db));
if (window.firebaseSync) window.firebaseSync(window.db);
window.render();
console.log('✅ Test data cleaned');
```

---

## 🔧 DEBUG COMMANDS (cho Tester khi gặp bug)

### Check Sync Status
```js
window.getSyncStatus()
// Returns: { status: 'synced'|'syncing'|'offline'|'error'|'signed-out', error: null|string }
```

### Check User State
```js
console.log('User ID:', window.currentUserId);
console.log('Auth:', window.auth?.currentUser);
console.log('Firestore:', window.dbFire);
```

### Check Local Data
```js
console.log('Tasks:', window.db.tasks.length);
console.log('Events:', window.db.events.length);
console.log('Sessions:', window.db.sessions.length);
console.log('Settings:', window.db.settings);
console.log('Reviews:', Object.keys(window.db.reviews || {}).length);
```

### Force Sync
```js
// Force push local → cloud
if (window.firebaseSync) window.firebaseSync(window.db);

// Force pull cloud → local (DANGER: overwrite local)
// Không có API trực tiếp, phải refresh page
```

### Migration Rollback (Emergency)
```js
// Nếu migration bị lỗi, rollback về schema v1
import('./src/core/migration.js').then(m =>
  m.rollbackMigration(window.dbFire, window.currentUserId)
);
// Sau đó refresh page
```

### Clear Cache + Reload
```js
// Clear Service Worker cache
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(reg => reg.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(key => caches.delete(key));
  });
}

// Clear localStorage
localStorage.removeItem('timeline_focus_product_final_v6');

// Hard reload
location.reload(true);
```

---

## 🚨 KNOWN ISSUES & WORKAROUNDS

### Issue 1: Sync Indicator KHÔNG update
**Symptom:** Indicator stuck ở "⟳ Đang đồng bộ..." mãi  
**Root cause:** Event listener chưa attach  
**Debug:**
```js
document.addEventListener('sync-status-change', e => console.log('Sync:', e.detail));
```
**Workaround:** Refresh page

### Issue 2: Migration chạy 2 lần
**Symptom:** Toast "Đã chuyển dữ liệu..." xuất hiện 2 lần  
**Root cause:** Login trên 2 tab cùng lúc  
**Verdict:** SAFE (idempotent migration, không duplicate data)  
**Workaround:** Không cần fix

### Issue 3: Task duplicate khi tạo offline
**Symptom:** Tạo task offline → online → task bị duplicate  
**Root cause:** Service Worker cache stale HTML chứa old `app.js`  
**Fix:** Clear cache v9, force load v10:
```js
caches.delete('tlf-v9-static');
location.reload(true);
```

### Issue 4: Firebase Console thấy `focusSessions/`
**Symptom:** Collection tên `focusSessions` thay vì `sessions`  
**Root cause:** Phase A code đã deploy (BUG)  
**Fix:** ROLLBACK Phase A, deploy Phase B
```bash
git revert <commit-phase-a>
# Apply Phase B patches
firebase deploy --only firestore:rules
git push
```

### Issue 5: iOS Safari popup bị chặn
**Symptom:** Click login → không có popup  
**Root cause:** iOS "Prevent Cross-Site Tracking" ON  
**Verdict:** HANDLED (code fallback sang `signInWithRedirect`)  
**User workaround:** Settings → Safari → turn OFF prevent tracking

---

## 📈 PERFORMANCE BASELINE (cho Regression Test)

### Lighthouse Scores (Target)

| Metric | Target | Acceptable | Fail |
|--------|--------|------------|------|
| Performance | ≥85 | ≥70 | <70 |
| Accessibility | ≥95 | ≥90 | <90 |
| Best Practices | ≥95 | ≥90 | <90 |
| SEO | ≥90 | ≥85 | <85 |
| PWA | ≥90 | ≥85 | <85 |

### Load Time Metrics

```
First Contentful Paint (FCP): < 1.5s
Largest Contentful Paint (LCP): < 2.5s
Time to Interactive (TTI): < 3.5s
Cumulative Layout Shift (CLS): < 0.1
```

### Bundle Size (ước tính)

```
index.html: ~15KB (gzip ~5KB)
app.js: ~45KB (gzip ~12KB)
style.css: ~35KB (gzip ~7KB)
Total initial load: ~95KB gzip (~24KB)
```

### Firestore Quota

```
Free tier limits:
- Reads: 50K/day
- Writes: 20K/day
- Deletes: 20K/day
- Storage: 1GB

Ước tính 1 user active:
- ~100 reads/day (initial sync + realtime updates)
- ~50 writes/day (CRUD operations)
```

---

## 🎓 TESTING TIPS (cho GPT Tester)

### 1. Test theo luồng user thực tế

**GOOD:**
```
1. Login → verify sync
2. Tạo 3 tasks cho hôm nay
3. Chuyển 1 task sang "doing"
4. Start focus timer 25 phút
5. Đánh dấu task done
6. Check analytics dashboard
7. Logout
```

**BAD:**
```
1. Test login 50 lần liên tiếp
2. Tạo 1000 tasks cùng lúc
3. Spam click sync button
```

### 2. Test boundary cases

- Task với title 500 characters
- Task với 50 tags
- Event recurring 100 năm
- Focus session 24 giờ
- 0 tasks trong ngày
- Date range: năm 1900 → năm 2100

### 3. Test error scenarios

- Network đứt giữa chừng sync
- Firebase Rules từ chối (sửa rules test)
- localStorage quota exceeded
- Service Worker fail to install
- Login bị cancel popup

### 4. Test security

- XSS trong mọi input field
- SQL injection (không có backend SQL nhưng test mindset)
- Cross-user data leak
- CSRF (app dùng Firebase SDK → auto protected)
- Session hijacking

### 5. Test accessibility

- Keyboard navigation (Tab, Enter, Esc)
- Screen reader (NVDA/JAWS/VoiceOver)
- Color contrast ratios
- Focus indicators
- ARIA labels

---

## 📝 TEST REPORT TEMPLATE

```markdown
# TEST REPORT - Timeline Focus App
**Date:** YYYY-MM-DD
**Tester:** GPT AI / [Tên tester]
**Build:** [commit hash]
**Environment:** Production / Staging / Local

---

## Executive Summary

- **Total Tests:** X
- **Passed:** Y (Z%)
- **Failed:** N
- **Blocked:** M
- **Verdict:** ✅ PASS / ❌ FAIL / ⚠️ CONDITIONAL PASS

---

## Test Results by Priority

### [P0 CRITICAL] - X/6 Tests
- ✅ T1: Login flow
- ✅ T2: CRUD operations
- ❌ T3: Cross-user security [BUG-001]
- ✅ T4: Multi-device sync
- ⚠️ T5: Migration (needs retest)
- ✅ T6: Logout/login cycle

### [P1 HIGH] - Y/7 Tests
[Similar breakdown...]

### [P2 MEDIUM] - Z/5 Tests
[Similar breakdown...]

---

## Bugs Found

### [BUG-001] Cross-user data leak
**Severity:** CRITICAL  
**Priority:** P0  
**Steps to reproduce:**
1. Login as User A
2. Create task "Secret Task"
3. Login as User B
4. DevTools: `getDoc(doc(dbFire, 'users', 'UID_A', 'tasks', 'task_id'))`
5. **Expected:** Permission denied
6. **Actual:** Task data returned

**Root cause:** Firestore Rules not deployed  
**Fix:** `firebase deploy --only firestore:rules`  
**Status:** Fixed / In Progress / Blocked

---

## Performance Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| FCP | <1.5s | 1.2s | ✅ |
| LCP | <2.5s | 2.1s | ✅ |
| TTI | <3.5s | 4.2s | ⚠️ |

---

## Recommendations

1. **High Priority:**
   - Fix BUG-001 trước khi public
   - Add rate limiting cho login attempts

2. **Medium Priority:**
   - Optimize TTI (lazy load non-critical JS)
   - Add E2E tests với Playwright

3. **Low Priority:**
   - Thêm dark mode auto-switch
   - Support multiple languages

---

## Approval

- [ ] All P0 tests passed
- [ ] All CRITICAL bugs fixed
- [ ] Security audit passed
- [ ] Performance acceptable
- [ ] Documentation updated

**Ready for Production:** ✅ YES / ❌ NO

**Approved by:** [Developer Name]  
**Date:** YYYY-MM-DD
```

---

## 🆘 CONTACT & ESCALATION

### Developer Contact
- **Name:** Nguyễn Phước Điền
- **MSSV:** 21002595
- **GitHub:** @NguyenPhuocDien
- **Role:** Full-stack Developer

### Escalation Path
1. **P0/P1 bugs:** Notify developer immediately
2. **P2/P3 bugs:** Log vào GitHub Issues
3. **Security issues:** Private report, không public
4. **Production down:** Check Vercel status, rollback nếu cần

### Useful Links
- **Production:** https://timeline-app-one-beta.vercel.app
- **Firebase Console:** https://console.firebase.google.com/project/timeline-app-9a872
- **GitHub Repo:** https://github.com/NguyenPhuocDien/timeline-app
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Sentry:** (setup sau deploy)

---

## ✅ CHECKLIST TRƯỚC KHI BẮT ĐẦU TEST

- [ ] Đã đọc toàn bộ briefing này
- [ ] Hiểu kiến trúc offline-first + sync
- [ ] Có 2 tài khoản Google test
- [ ] Biết dùng DevTools Console
- [ ] Đã clone TEST-CHECKLIST.md
- [ ] Biết rollback khi cần
- [ ] Có quyền access Firebase Console (nếu cần)
- [ ] Biết liên hệ developer khi blocked

---

**Good luck testing! 🚀**

**Remember:**
- App.js là monolithic (1,136 dòng) → test kỹ integration
- Offline-first → test mất mạng nhiều scenarios
- Firebase Rules là CRITICAL → verify cross-user leak
- Migration là ONE-WAY → cẩn thận, có backup
- Phase B fix bugs Phase A → verify không còn `focusSessions/`

**Nếu có câu hỏi gì, ping Developer ngay!**
