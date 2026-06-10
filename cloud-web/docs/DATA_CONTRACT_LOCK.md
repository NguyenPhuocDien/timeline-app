# 🔒 DATA CONTRACT LOCK
## Timeline Focus App - Immutable Data Schemas

**Version:** 2.0  
**Lock Date:** June 9, 2026  
**Locked By:** Senior Architect + Tester Review  
**Purpose:** Prevent breaking changes during Next.js migration

---

## ⚠️ CRITICAL WARNING

**ANY DEVIATION FROM THIS CONTRACT MUST:**
1. Stop migration immediately
2. Create rollback plan
3. Get explicit approval
4. Update this document with version bump
5. Create migration script + tests

**Violations will cause data loss or corruption.**

---

## 1. FIRESTORE COLLECTION NAMES (IMMUTABLE)

### ✅ CORRECT (Phase B Fixed)

```
users/{uid}/tasks/
users/{uid}/events/
users/{uid}/sessions/          ← NOT focusSessions
users/{uid}/settings/
users/{uid}/reviews/
```

### ❌ FORBIDDEN

```
users/{uid}/focusSessions/     ← Phase A bug
users/{uid}/focus-sessions/
users/{uid}/taskSessions/
```

**Rationale:** Phase B migration already uses `sessions`. Firestore Rules deployed.

---

## 2. TASK SCHEMA CONTRACT

### Required Fields

```typescript
interface Task {
  // Identity
  id: string;                  // UUID from crypto.randomUUID()
  
  // Core
  title: string;               // max 500 chars
  date: string;                // 'YYYY-MM-DD' format
  duration: number;            // minutes, 0-1440
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'doing' | 'done' | 'deferred' | 'stack' | 'deleted';
  
  // Booleans - CORRECT NAMES
  mission: boolean;            // ✅ NOT isMission
  done: boolean;               // legacy, status === 'done' is source of truth
  
  // Collections
  tags: string[];              // ✅ Array, NOT comma-separated string
                               // ✅ WITHOUT '#' prefix in storage
  
  // Timestamps
  createdAt: string;           // ✅ ISO string, NOT Firestore Timestamp
  updatedAt: string;           // ✅ ISO string, NOT Firestore Timestamp
  deletedAt?: string;          // ✅ ISO string for soft delete
}
```

### Optional Fields

```typescript
interface TaskOptional {
  start?: string;              // 'HH:MM' format
  end?: string;                // 'HH:MM' format
  deadline?: string;           // 'HH:MM' format
  notes?: string;              // max 10000 chars
  eventId?: string;            // Link to Event
  
  // Stack fields
  stackType?: 'overdue' | 'unfinished';
  stackedAt?: string;          // ISO timestamp
  reason?: string;             // max 500 chars
  deferCount?: number;         // Integer >= 0
  doneAt?: string;             // ISO timestamp
  
  // Flow object
  flow?: {
    summary: string;
    checklist: Array<{id: string, text: string, done: boolean}>;
    notes: Array<{id: string, text: string, createdAt: string}>;
    blockers: Array<{id: string, text: string, createdAt: string}>;
    nextActions: Array<{id: string, text: string, createdAt: string}>;
    logs: Array<{id: string, text: string, createdAt: string}>;
  };
  
  // Migration
  migratedFrom?: 1;            // Marker for v1 → v2 migrated data
}
```

### ❌ FORBIDDEN FIELD NAMES

```typescript
// Phase A bugs - DO NOT USE
isMission: boolean;            // ❌ Use mission
tags: string;                  // ❌ Use string[]
recurring: boolean;            // ❌ This is for Events
createdAt: Timestamp;          // ❌ Use ISO string
```

---

## 3. EVENT SCHEMA CONTRACT

```typescript
interface Event {
  // Required
  id: string;
  title: string;               // max 500 chars
  type: 'solar' | 'lunar';
  date: string;                // 'YYYY-MM-DD'
  recurring: boolean;          // ✅ Boolean, NOT 'yes'/'no' string
  
  // Optional
  notes?: string;              // max 5000 chars
  
  // Timestamps
  createdAt: string;           // ISO string
  updatedAt: string;           // ISO string
  deletedAt?: string;          // ISO string
  
  // Migration
  migratedFrom?: 1;
}
```

### ❌ FORBIDDEN

```typescript
recurring: 'yes' | 'no';       // ❌ Phase A bug
recurring: string;             // ❌ Must be boolean
```

---

## 4. SESSION SCHEMA CONTRACT

```typescript
interface Session {
  // Required
  id: string;
  
  // Optional
  taskId?: string;             // Link to Task
  date?: string;               // 'YYYY-MM-DD'
  minutes?: number;            // Integer 0-1440
  
  // Timestamps
  createdAt: string;           // ISO string
  
  // Migration
  migratedFrom?: 1;
}
```

**Collection name:** `users/{uid}/sessions/`

### ❌ FORBIDDEN

- Collection name: `focusSessions`
- Any other name variations

---

## 5. SETTINGS SCHEMA CONTRACT

```typescript
interface Settings {
  // Theme
  theme: string;               // ThemeId enum
  accent: string;              // Color name
  
  // Time Preferences
  availableStart: string;      // 'HH:MM' format
  availableEnd: string;        // 'HH:MM' format
  dailyMissionLimit: number;   // Integer >= 0
  
  // Features
  notifications: boolean;
  
  // Background
  backgroundPreset: string;    // PresetId enum
  backgroundImage: string;     // ⚠️ LOCAL ONLY (NOT synced to Firestore)
  backgroundName: string;      // ⚠️ LOCAL ONLY (NOT synced to Firestore)
}
```

**Document path:** `users/{uid}/settings/main`

### ⚠️ SYNC EXCLUSIONS

```typescript
// NEVER sync to Firestore (too large, causes 1MB limit)
backgroundImage: string;       // base64, can be several MB
backgroundName: string;        // File name

// Code: sync-engine.js cloudComparableDb()
delete copy.settings.backgroundImage;
delete copy.settings.backgroundName;
```

---

## 6. REVIEWS SCHEMA CONTRACT

```typescript
interface Reviews {
  // Map structure
  [date: string]: ReviewEntry;  // Key: 'YYYY-MM-DD'
}

interface ReviewEntry {
  summary?: string;
  mood?: string;
  achievements?: string[];
  // Extensible for future fields
}
```

**Document path:** `users/{uid}/reviews/main`  
**Firestore structure:**

```json
{
  "data": {
    "2026-06-09": {
      "summary": "Good day",
      "mood": "happy",
      "achievements": ["Completed 5 tasks"]
    },
    "2026-06-10": {...}
  },
  "updatedAt": "2026-06-10T10:00:00.000Z",
  "migratedFrom": 1
}
```

**Limit:** 365 days max (sanitizer truncates to prevent 1MB limit)

---

## 7. FIRESTORE PATHS (IMMUTABLE)

```
users/
  └── {uid}/                           # Auth UID
      ├── (root document)
      │   ├── migrationVersion: 2
      │   ├── _backup_v1: {...}        # ⚠️ NEVER DELETE
      │   ├── _v1HadData: boolean
      │   ├── _v1ItemCount: number
      │   └── db: {...}                # Legacy v1 data (keep 30 days)
      │
      ├── tasks/
      │   └── {taskId}/                # Per-task document
      │       └── (Task schema)
      │
      ├── events/
      │   └── {eventId}/
      │       └── (Event schema)
      │
      ├── sessions/                    # ✅ NOT focusSessions
      │   └── {sessionId}/
      │       └── (Session schema)
      │
      ├── settings/
      │   └── main                     # Single document
      │       └── (Settings schema)
      │
      └── reviews/
          └── main                     # Single document map
              └── data: {...}          # Reviews schema
```

### ⚠️ SACRED FIELDS (NEVER DELETE)

```
users/{uid}._backup_v1               # Rollback safety
users/{uid}.db                       # Legacy data (keep 30 days minimum)
users/{uid}.migrationVersion         # Version marker
```

---

## 8. LOCALSTORAGE CONTRACT

### Key Name (IMMUTABLE)

```javascript
const KEY = 'timeline_focus_product_final_v6';
```

**CANNOT CHANGE** - Millions of characters of user data keyed to this.

### Format

```typescript
interface LocalStorageData {
  tasks: Task[];
  events: Event[];
  sessions: Session[];
  settings: Settings;           // Includes backgroundImage (local only)
  reviews: Reviews;
}
```

**Serialization:** `JSON.stringify(db)`  
**Max size:** ~5-10MB (localStorage limit varies by browser)

### Auto-cleanup (preserve)

```javascript
// app.js:185-199
if (e.name === 'QuotaExceededError') {
  // Truncate old logs (>10 per task)
  db.tasks.forEach(t => {
    if (t.flow?.logs?.length > 10) {
      t.flow.logs = t.flow.logs.slice(-10);
    }
  });
  
  // Truncate old sessions (>500 total)
  if (db.sessions.length > 500) {
    db.sessions = db.sessions.slice(-500);
  }
}
```

---

## 9. TIMESTAMP FORMAT (IMMUTABLE)

### ✅ CORRECT: ISO 8601 String

```javascript
createdAt: new Date().toISOString()
// Output: "2026-06-09T07:30:00.000Z"
```

### ❌ FORBIDDEN: Firestore Timestamp

```javascript
import { serverTimestamp } from 'firebase/firestore';
createdAt: serverTimestamp()  // ❌ Returns Timestamp object
```

**Rationale:**
- App.js conflict resolution uses string comparison
- `newestStamp()` sorts ISO strings lexicographically
- Changing to Timestamp requires conflict resolution rewrite

**Exception:** Migration metadata can use `serverTimestamp()`:
```javascript
migratedAt: serverTimestamp()  // ✅ OK (not used in conflict resolution)
```

---

## 10. CONFLICT RESOLUTION ALGORITHM (LOCKED)

```javascript
// app.js:147-150
function newestStamp(item) { 
  return item?.updatedAt || item?.doneAt || item?.stackedAt || item?.createdAt || '';
}

// app.js:163-170
function mergeById(localItems = [], remoteItems = []) {
  const map = new Map();
  
  const put = item => {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
      return;
    }
    
    const currentStamp = newestStamp(existing);
    const nextStamp = newestStamp(item);
    
    // Last-write-wins
    if (nextStamp > currentStamp) {
      map.set(item.id, item);
    }
    // Tie-breaker: larger JSON wins
    else if (nextStamp === currentStamp && 
             JSON.stringify(item).length > JSON.stringify(existing).length) {
      map.set(item.id, item);
    }
  };
  
  remoteItems.forEach(put);
  localItems.forEach(put);
  
  return [...map.values()];
}
```

**CANNOT CHANGE** without:
1. Testing all 2-device conflict scenarios
2. Verifying NO data loss
3. Backward compatibility with existing timestamps
4. Approval from tester

---

## 11. VALIDATION RULES (Firestore Security Rules)

**File:** `firestore.rules` (deployed)

### Key Validators

```javascript
// Collection names
match /tasks/{taskId}          // ✅
match /sessions/{sessionId}    // ✅ NOT focusSessions

// Field types
data.mission is bool           // ✅ NOT isMission
data.tags is list              // ✅ NOT string
data.recurring is bool         // ✅ NOT 'yes'/'no'

// Enums
data.status in ['todo', 'doing', 'done', 'deferred', 'stack', 'deleted']
data.priority in ['high', 'medium', 'low']
data.type in ['solar', 'lunar']

// Sizes
data.title.size() <= 500
data.notes.size() <= 10000
data.tags.size() <= 50
```

**CANNOT CHANGE** without:
1. Deploying new rules to Firebase
2. Testing rejection of invalid data
3. Verifying existing data still validates

---

## 12. EXPORT/IMPORT JSON FORMAT (LOCKED)

### Schema

```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Task 1",
      "date": "2026-06-09",
      "duration": 60,
      "priority": "high",
      "status": "todo",
      "tags": ["study", "urgent"],
      "mission": true,
      "createdAt": "2026-06-09T07:00:00.000Z",
      "updatedAt": "2026-06-09T08:00:00.000Z"
    }
  ],
  "events": [
    {
      "id": "uuid",
      "title": "Event 1",
      "type": "solar",
      "date": "2026-12-25",
      "recurring": true,
      "createdAt": "2026-06-09T07:00:00.000Z",
      "updatedAt": "2026-06-09T07:00:00.000Z"
    }
  ],
  "sessions": [
    {
      "id": "uuid",
      "taskId": "task-uuid",
      "date": "2026-06-09",
      "minutes": 25,
      "createdAt": "2026-06-09T09:00:00.000Z"
    }
  ],
  "settings": {
    "theme": "github-light",
    "availableStart": "07:00",
    "availableEnd": "22:00",
    "backgroundPreset": "none"
  },
  "reviews": {
    "2026-06-09": {
      "summary": "Great day"
    }
  }
}
```

**Validation (app.js:1094-1098):**

```javascript
if (!Array.isArray(imported.tasks)) throw new Error('Invalid format');
if (!Array.isArray(imported.events)) throw new Error('Invalid format');
// Must pass basic structure check
```

**Migration:** Add Zod validation in Phase 1

---

## 13. SIGNATURE & APPROVAL

**I, as Senior Architect, lock this contract on June 9, 2026.**

**Locked Contracts:**
- ✅ Collection name: `sessions` (NOT `focusSessions`)
- ✅ Task field: `mission` (NOT `isMission`)
- ✅ Event field: `recurring` boolean (NOT string)
- ✅ Tags: array (NOT comma string)
- ✅ Timestamps: ISO string (NOT Firestore Timestamp)
- ✅ Firestore paths (all 5 subcollections)
- ✅ localStorage key
- ✅ Conflict resolution algorithm
- ✅ Export/Import format

**Stakeholder Approval Required:**

- [ ] Developer: Nguyễn Phước Điền
- [ ] Tester/QA: _________________
- [ ] Architect: Kiro AI (signed)

**Date:** _______________

---

**END OF DATA CONTRACT LOCK**
