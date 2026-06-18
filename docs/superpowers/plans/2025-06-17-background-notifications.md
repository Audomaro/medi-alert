# Background Notifications via SW — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver push-like notifications for due doses when the app is installed but closed.

**Architecture:** The Service Worker (SW) owns all notification scheduling. Three mechanisms: `setTimeout` per pending dose for exact-timing, Periodic Background Sync every 15 min as backup, and client messages to reschedule after mutations.

**Tech Stack:** TypeScript, idb (IndexedDB), Vite PWA (injectManifest), Lucide icons

**Files:**
- Modify: `src/sw.ts`
- Modify: `src/stores/doseScheduleStore.ts`
- Modify: `src/pages/HomePage.tsx` (or App.tsx)

---

### Task 1: Rewrite `src/sw.ts` with scheduling + DB logic

**File:** `src/sw.ts`

This is the core work. The SW needs to:
- Open IndexedDB and query pending doses for today
- Schedule `setTimeout` per pending dose at its exact time
- Handle `periodicsync` event (backup poll)
- Handle `message` event from client (RESCHEDULE)
- Handle `notificationclick` to update DB directly (no delete action)
- Expose DB helpers: getPendingDosesToday, getMedication, updateDoseStatus

- [ ] **Step 1: Replace `src/sw.ts` contents with the full implementation**

```typescript
/// <reference lib="WebWorker" />

import { openDB } from 'idb'
import type { DoseInstance, Medication } from '../types'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

const CACHE = 'medi-alert-v1'

// ── IndexedDB helpers ──────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesNow(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

async function getPendingDosesToday(): Promise<DoseInstance[]> {
  const db = await openDB('medi-alert', 9)
  const all = await db.getAllFromIndex('dose_instances', 'date', todayISO())
  return all.filter((d) => d.status === 'pending')
}

async function getMedication(id: string): Promise<Medication | undefined> {
  const db = await openDB('medi-alert', 9)
  return db.get('medications', id)
}

async function updateDoseStatus(id: string, status: DoseInstance['status']): Promise<void> {
  const db = await openDB('medi-alert', 9)
  const instance = await db.get('dose_instances', id)
  if (!instance) return
  instance.status = status
  instance.updatedAt = new Date().toISOString()
  if (status === 'taken') instance.takenAt = instance.updatedAt
  await db.put('dose_instances', instance)
}

// ── Timer management ───────────────────────────────────────────────

const timers = new Map<string, number>()

function clearAllTimers(): void {
  for (const id of timers.keys()) {
    self.clearTimeout(timers.get(id)!)
  }
  timers.clear()
}

// ── Notification logic ─────────────────────────────────────────────

async function showDoseNotification(instance: DoseInstance, medName: string): Promise<void> {
  const { id, scheduledTime, doseValue, doseUnit } = instance
  await self.registration.showNotification(`Medi-alert — ${medName}`, {
    body: `${doseValue}${doseUnit} — programada para las ${scheduledTime}`,
    tag: id,
    icon: '/icons/192.png',
    actions: [
      { action: 'taken',     title: 'Tomar' },
      { action: 'skipped',   title: 'Saltar' },
      { action: 'cancelled', title: 'Cancelar' },
    ],
    data: { doseId: id, scheduledDate: instance.scheduledDate, scheduledTime },
  })
}

async function notifyDose(instance: DoseInstance): Promise<void> {
  const med = await getMedication(instance.medicationId)
  await showDoseNotification(instance, med?.name || 'Medicamento')
  timers.delete(instance.id)
}

// ── Scheduling ─────────────────────────────────────────────────────

async function scheduleAllDoses(): Promise<void> {
  clearAllTimers()
  const nowMin = minutesNow()
  const instances = await getPendingDosesToday()

  for (const inst of instances) {
    const doseMin = timeToMinutes(inst.scheduledTime)

    if (doseMin > nowMin) {
      // Future dose — schedule timer
      const ms = (doseMin - nowMin) * 60_000
      const id = self.setTimeout(() => notifyDose(inst), ms)
      timers.set(inst.id, id)
    } else if (doseMin >= nowMin - 30 && doseMin <= nowMin) {
      // Due in the last 30 min — notify immediately
      notifyDose(inst)
    }
    // Older than 30 min — skip (already missed, no alert)
  }
}

// ── Event handlers ─────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(self.__WB_MANIFEST.map((a) => a.url)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ),
  )
  event.waitUntil(self.clients.claim())
  // Start scheduling
  event.waitUntil(scheduleAllDoses())
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'dose-check') {
    event.waitUntil(
      (async () => {
        await scheduleAllDoses()
        // Also catch doses that fired while SW was dead
        const nowMin = minutesNow()
        const instances = await getPendingDosesToday()
        for (const inst of instances) {
          const doseMin = timeToMinutes(inst.scheduledTime)
          if (doseMin >= nowMin - 30 && doseMin <= nowMin) {
            await notifyDose(inst)
          }
        }
      })()
    )
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RESCHEDULE') {
    event.waitUntil(scheduleAllDoses())
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const action = event.action
  const data = event.notification.data || {}

  if (action === 'taken' || action === 'skipped' || action === 'cancelled') {
    event.waitUntil(
      (async () => {
        // Persist directly to IndexedDB
        await updateDoseStatus(data.doseId, action)
        // Notify any open clients
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const c of clients) {
          c.postMessage({ type: 'DOSE_ACTION', action, doseId: data.doseId })
        }
        // Reschedule in case more doses are pending
        await scheduleAllDoses()
      })()
    )
    return
  }

  // Click on body (no action) — open app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/')
    }),
  )
})
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/sw.ts
git commit -m "sw: add background notification scheduling with DB persistence"
```

**Note:** The SW opens DB at version 9 to match the client. The upgrade callback from `src/db/index.ts` already ran on first client load, so the SW connects to an existing schema. If DB version changes in the future, this constant must be bumped in sync.

---

### Task 2: Register Periodic Sync from client

**Files:**
- Modify: `src/pages/HomePage.tsx` (first `useEffect`)

The client registers a periodic sync every 15 min when the app loads, so the browser wakes the SW for dose-checking.

- [ ] **Step 1: Add periodic sync registration in `HomePage.tsx`**

Find the first `useEffect` in `HomePage.tsx` (around lines 30-49). Add periodic sync registration to it:

```typescript
useEffect(() => {
  loadDosesForDate(selectedDate)
  registerPeriodicSync()
}, [])

async function registerPeriodicSync() {
  try {
    const reg = await navigator.serviceWorker.ready
    if ('periodicSync' in reg) {
      await (reg as any).periodicSync.register('dose-check', { minInterval: 15 * 60 * 1000 })
    }
  } catch {
    // Periodic Sync not supported — timer scheduling still works while SW is alive
  }
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "home: register periodic sync for background dose checks"
```

---

### Task 3: Send RESCHEDULE message after schedule mutations

**File:** `src/stores/doseScheduleStore.ts`

After `add`, `update`, `delete` operations, tell the SW to reschedule all timers.

- [ ] **Step 1: Add reschedule helper and call it after mutations**

Add this helper at the top of the store file (after `generateId` import):

```typescript
function notifySWReschedule(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'RESCHEDULE' })
}
```

Then add `notifySWReschedule()` call after each successful mutation in the `add`, `update`, and `remove` actions.

Find the `add:` action (around line 73-78):
```typescript
  add: async (s) => {
    await saveDoseSchedule(s)
    const instances = generateDoseInstances(s)
    await saveDoseInstances(instances)
    set((state) => ({ doseSchedules: [...state.doseSchedules, s] }))
    notifySWReschedule()
  },
```

Find the `update:` action (around line 79-91):
```typescript
  update: async (s) => {
    const old = await getDoseSchedule(s.id)
    await saveDoseSchedule(s)
    if (old) {
      await deleteDoseInstancesBySchedule(s.id)
    }
    const instances = generateDoseInstances(s)
    await saveDoseInstances(instances)
    await loadDosesForDate(todayISO())
    set((state) => ({
      doseSchedules: state.doseSchedules.map((x) => (x.id === s.id ? s : x)),
    }))
    notifySWReschedule()
  },
```

Find the `remove:` action (around line 92-101):
```typescript
  remove: async (id) => {
    await deleteDoseSchedule(id)
    await deleteDoseInstancesBySchedule(id)
    await loadDosesForDate(todayISO())
    set((state) => ({
      doseSchedules: state.doseSchedules.filter((x) => x.id !== id),
    }))
    notifySWReschedule()
  },
```

**Alternative (simpler):** Instead of calling in each action, wrap in the store's subscribe. But calling explicitly is clearer.

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run tests**

```bash
npx vitest run 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/stores/doseScheduleStore.ts
git commit -m "store: notify SW to reschedule after schedule mutations"
```

---

### Verification Checklist (manual, in production build)

- [ ] `npm run build` compiles without errors
- [ ] With app open and installed PWA, a dose at time X:XX shows notification when time arrives
- [ ] Close all browser windows — dose notification still arrives
- [ ] Notification shows 3 action buttons (Tomar, Saltar, Cancelar)
- [ ] Clicking "Tomar" on notification updates dose status in DB
- [ ] Open app after notification action — dose reflects the taken/skipped/cancelled status
- [ ] Create a new schedule — old timers are cleared and new ones programmed
