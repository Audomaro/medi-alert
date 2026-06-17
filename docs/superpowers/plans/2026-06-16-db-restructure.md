# DB Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace eager dose_log generation with on-demand computation and restructure IndexedDB from 4 stores to 3.

**Architecture:** Remove `dose_logs` and `deleted_dose_keys` stores. Add `dose_actions` store (only persisted interactions). Pending doses computed from `dose_schedules` at query time. Simplify `FrequencyConfig`. Add `updatedAt` timestamps.

**Tech Stack:** React 19 / TypeScript / idb / Zustand / IndexedDB

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | New `DoseAction` type, simplified `FrequencyConfig`, standalone `DoseWithDetails` |
| `src/db/index.ts` | Rewrite | DB_VERSION 5, 3 stores, on-demand query functions, no more eager gen |
| `src/stores/doseScheduleStore.ts` | Rewrite | On-demand dose computation + `DoseAction` persistence |
| `src/stores/medicationStore.ts` | Modify | Add `updatedAt` on updates |
| `src/components/DoseCard.tsx` | Modify | Remove `onDelete` prop, remove "Eliminar dosis" from context menu |
| `src/pages/HomePage.tsx` | Modify | Use new store API `loadDosesForDate`, no `removeDoseLog` |
| `src/pages/MorePage.tsx` | Modify | Remove `deleted_dose_keys` from clear logic |
| `README.md` | Done | Already updated |

---

### Task 1: Update Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Simplify FrequencyConfig (remove redundant `type` field)**

Replace:
```typescript
export interface FrequencyConfig {
  type: FrequencyType
  timesPerDay?: number
  days?: number[]
  interval?: number
}
```

With:
```typescript
export interface FrequencyConfig {
  timesPerDay?: number
  days?: number[]
  interval?: number
}
```

- [ ] **Step 2: Add updatedAt to Medication**

Add `updatedAt: string` field to `Medication` interface.

- [ ] **Step 3: Add updatedAt to DoseSchedule**

Add `updatedAt: string` field to `DoseSchedule` interface.

- [ ] **Step 4: Add DoseAction interface**

Add before `DoseWithDetails`:
```typescript
export interface DoseAction {
  id: string
  scheduleId: string
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  doseLabel: string
  status: 'taken' | 'skipped' | 'cancelled'
  takenAt?: string
}
```

- [ ] **Step 5: Rewrite DoseWithDetails (standalone, no longer extends DoseLog)**

Replace `DoseWithDetails` with a standalone type that includes all display fields:
```typescript
export interface DoseWithDetails {
  id: string
  scheduleId: string
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  doseLabel: string
  status: DoseStatus
  takenAt?: string
  doseValue: number
  doseUnit: string
  medicationName: string
  medicationIcon?: string
  medicationColor?: string
  presentation: Presentation
}
```

- [ ] **Step 6: Run type-check to confirm**

Run: `npx tsc --noEmit`
Expected: PASS (existing code imports from other files will fail later, but types themselves should compile)

---

### Task 2: Rewrite IndexedDB Layer

**Files:**
- Rewrite: `src/db/index.ts`

- [ ] **Step 1: Update DB_VERSION and upgrade function**

Set `DB_VERSION = 5`. In the `upgrade` callback:

```typescript
if (_oldVersion < 4) {
  // v1-v4 creation as before
}
if (_oldVersion < 5) {
  // Create dose_actions store with indexes
  const actionStore = db.createObjectStore('dose_actions', { keyPath: 'id' })
  actionStore.createIndex('date', 'scheduledDate')
  actionStore.createIndex('schedule', 'scheduleId')
  
  // Migrate existing non-pending dose_logs to dose_actions
  if (db.objectStoreNames.contains('dose_logs')) {
    const oldStore = transaction.objectStore('dose_logs')
    const oldLogs = await oldStore.getAll()
    for (const log of oldLogs) {
      if (log.status !== 'pending') {
        const { doseValue, doseUnit, ...action } = log
        actionStore.put(action)
      }
    }
    db.deleteObjectStore('dose_logs')
  }
  
  // Remove deleted_dose_keys store
  if (db.objectStoreNames.contains('deleted_dose_keys')) {
    db.deleteObjectStore('deleted_dose_keys')
  }
  
  // Update medications with updatedAt
  if (db.objectStoreNames.contains('medications')) {
    const medStore = transaction.objectStore('medications')
    const allMeds = await medStore.getAll()
    for (const m of allMeds) {
      if (!m.updatedAt) {
        m.updatedAt = m.createdAt
        await medStore.put(m)
      }
    }
  }
  
  // Update dose_schedules: strip frequencyConfig.type, add updatedAt
  if (db.objectStoreNames.contains('dose_schedules')) {
    const schedStore = transaction.objectStore('dose_schedules')
    const allScheds = await schedStore.getAll()
    for (const s of allScheds) {
      if (s.frequencyConfig?.type) {
        const { type, ...rest } = s.frequencyConfig
        s.frequencyConfig = rest
      }
      if (!s.updatedAt) {
        s.updatedAt = s.createdAt
      }
      await schedStore.put(s)
    }
  }
}
```

- [ ] **Step 2: Add dose_actions query functions**

```typescript
export async function getDoseActionsByDate(date: string): Promise<DoseAction[]> {
  const db = await getDB()
  return db.getAllFromIndex('dose_actions', 'date', date)
}

export async function saveDoseAction(action: DoseAction): Promise<void> {
  const db = await getDB()
  await db.put('dose_actions', action)
}

export async function deleteDoseAction(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('dose_actions', id)
}

export async function deleteDoseActionsBySchedule(scheduleId: string): Promise<void> {
  const db = await getDB()
  const actions = await db.getAllFromIndex('dose_actions', 'schedule', scheduleId)
  const tx = db.transaction('dose_actions', 'readwrite')
  for (const a of actions) {
    tx.store.delete(a.id)
  }
  await tx.done
}
```

- [ ] **Step 3: Remove old dose_logs and deleted_dose_keys functions**

Remove:
- `getDoseLogsByDate`
- `getDoseLogsBySchedule`
- `saveDoseLog`
- `deleteDoseLog`
- `deleteDoseLogsBySchedule`
- `saveDeletedDoseKey`
- `getDeletedDoseKeys`
- `updateDoseLogStatus`

- [ ] **Step 4: Add getActiveSchedulesForDate helper**

```typescript
export async function getActiveSchedulesForDate(date: string): Promise<DoseSchedule[]> {
  const db = await getDB()
  const all = await db.getAll('dose_schedules')
  return all.filter((s) => s.active && s.startDate <= date && s.endDate >= date)
}
```

- [ ] **Step 5: Simplify deleteAllData**

Remove `deleted_dose_keys` from stores (already handled dynamically by `db.objectStoreNames`).

- [ ] **Step 6: Update import**

Change `import type { Medication, DoseSchedule, DoseLog } from '../types'` to `import type { Medication, DoseSchedule, DoseAction } from '../types'`

- [ ] **Step 7: Run type-check**

Run: `npx tsc --noEmit`
Expected: type errors in stores/pages that still reference old functions — this is expected, next tasks fix them

---

### Task 3: Rewrite doseScheduleStore

**Files:**
- Rewrite: `src/stores/doseScheduleStore.ts`

- [ ] **Step 1: Add dose computation utility function**

```typescript
function shouldGenerateForDate(s: DoseSchedule, dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  switch (s.frequencyType) {
    case 'daily':
      return true
    case 'specific_days':
      return s.frequencyConfig.days?.includes(d.getDay()) ?? false
    case 'every_x_days': {
      const start = new Date(s.startDate + 'T12:00:00')
      const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return diff % (s.frequencyConfig.interval || 1) === 0
    }
    case 'every_x_weeks': {
      const start = new Date(s.startDate + 'T12:00:00')
      const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
      return diff % (s.frequencyConfig.interval || 1) === 0
    }
    case 'every_x_months': {
      const start = new Date(s.startDate + 'T12:00:00')
      const diff = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth()
      return diff % (s.frequencyConfig.interval || 1) === 0
    }
    case 'as_needed':
      return false
  }
}

function generateInstanceId(scheduleId: string, date: string, time: string, label: string): string {
  return `${scheduleId}|${date}|${time}|${label}`
}
```

- [ ] **Step 2: Rewrite store interface**

Replace `DoseLog` references and `loadDoseLogs`/`removeDoseLog` with new API:

```typescript
interface DoseScheduleState {
  doseSchedules: DoseSchedule[]
  doses: DoseWithDetails[]
  loadSchedules: () => Promise<void>
  loadDosesForDate: (date: string) => Promise<void>
  add: (s: DoseSchedule) => Promise<void>
  update: (s: DoseSchedule) => Promise<void>
  remove: (id: string) => Promise<void>
  updateDoseStatus: (instanceId: string, scheduleId: string, medicationId: string, scheduledDate: string, scheduledTime: string, doseLabel: string, status: 'taken' | 'skipped' | 'cancelled') => Promise<void>
}
```

- [ ] **Step 3: Implement loadDosesForDate**

```typescript
loadDosesForDate: async (date) => {
  const [schedules, actions, meds] = await Promise.all([
    getActiveSchedulesForDate(date),
    getDoseActionsByDate(date),
    getAllMedications(),
  ])
  
  const actionMap = new Map<string, DoseAction>()
  for (const a of actions) {
    actionMap.set(a.id, a)
  }
  
  const medMap = new Map<string, Medication>()
  for (const m of meds) {
    medMap.set(m.id, m)
  }
  
  const result: DoseWithDetails[] = []
  
  for (const s of schedules) {
    if (!shouldGenerateForDate(s, date)) continue
    const med = medMap.get(s.medicationId)
    for (const dose of s.doses) {
      const instanceId = generateInstanceId(s.id, date, dose.time, dose.label)
      const action = actionMap.get(instanceId)
      result.push({
        id: instanceId,
        scheduleId: s.id,
        medicationId: s.medicationId,
        scheduledDate: date,
        scheduledTime: dose.time,
        doseLabel: dose.label,
        status: action?.status || 'pending',
        takenAt: action?.takenAt,
        doseValue: dose.doseValue,
        doseUnit: dose.doseUnit,
        medicationName: med?.name || 'Desconocido',
        medicationIcon: med?.icon,
        medicationColor: med?.color,
        presentation: med?.presentation || 'otro',
      })
    }
  }
  
  set({ doses: result })
}
```

- [ ] **Step 4: Implement updateDoseStatus**

```typescript
updateDoseStatus: async (instanceId, scheduleId, medicationId, scheduledDate, scheduledTime, doseLabel, status) => {
  const action: DoseAction = {
    id: instanceId,
    scheduleId,
    medicationId,
    scheduledDate,
    scheduledTime,
    doseLabel,
    status,
    takenAt: status === 'taken' ? new Date().toISOString() : undefined,
  }
  await saveDoseAction(action)
  set((state) => ({
    doses: state.doses.map((d) =>
      d.id === instanceId
        ? { ...d, status, takenAt: action.takenAt }
        : d
    ),
  }))
}
```

- [ ] **Step 5: Simplify add/update/remove (no log generation)**

```typescript
add: async (s) => {
  await saveDoseSchedule(s)
  set((state) => ({ doseSchedules: [...state.doseSchedules, s] }))
},
update: async (s) => {
  await saveDoseSchedule(s)
  set((state) => ({ doseSchedules: state.doseSchedules.map((x) => (x.id === s.id ? s : x)) }))
},
remove: async (id) => {
  await deleteDoseActionsBySchedule(id)
  await deleteDoseSchedule(id)
  set((state) => ({
    doseSchedules: state.doseSchedules.filter((x) => x.id !== id),
    doses: state.doses.filter((d) => d.scheduleId !== id),
  }))
},
```

- [ ] **Step 6: Update imports**

```typescript
import type { DoseSchedule, DoseWithDetails, DoseAction } from '../types'
import {
  getAllDoseSchedules, saveDoseSchedule, deleteDoseSchedule,
  getActiveSchedulesForDate, getDoseActionsByDate,
  saveDoseAction, deleteDoseActionsBySchedule,
} from '../db'
import { getAllMedications } from '../db'
```

- [ ] **Step 7: Run type-check**

Run: `npx tsc --noEmit`
Expected: type errors in HomePage, DoseCard that still reference old store API — expected

---

### Task 4: Update medicationStore

**Files:**
- Modify: `src/stores/medicationStore.ts`

- [ ] **Step 1: Add updatedAt on medication update**

In the `update` function, set `updatedAt` before saving:
```typescript
update: async (m) => {
  const toSave = { ...m, updatedAt: new Date().toISOString() }
  await saveMedication(toSave)
  set((s) => ({ medications: s.medications.map((med) => (med.id === m.id ? toSave : med)) }))
},
```

- [ ] **Step 2: Add updatedAt on medication add**

In the `add` function:
```typescript
add: async (m) => {
  const toSave = { ...m, updatedAt: m.createdAt }
  await saveMedication(toSave)
  set((s) => ({ medications: [...s.medications, toSave] }))
},
```

- [ ] **Step 3: Run type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no interface changes affect this store)

---

### Task 5: Update HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Use new store API**

Replace:
```typescript
const { medications, doseLogs, load: loadMeds, loadDoseLogs, updateDoseStatus, removeDoseLog } = useDoseScheduleStore()
// ...
loadMeds()
// ...
loadDoseLogs(selectedDate)
// ...
updateDoseStatus(dose.id, 'taken')
// ...
removeDoseLog(dose.id)
```

With:
```typescript
const { medications, load: loadMeds } = useMedicationStore()
const { doses, loadDosesForDate, updateDoseStatus } = useDoseScheduleStore()
// ...
useEffect(() => { loadMeds() }, [])
// ...
useEffect(() => { loadDosesForDate(selectedDate) }, [selectedDate])
// ...
const pendingCount = doses.filter((d) => d.status === 'pending').length
// ...
// Remove doseLogs/doseWithDetails — doses already contains enriched data
// (no need for medicines.find() mapping)
const sortedDoses = [...doses].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))
```

- [ ] **Step 2: Update notification logic to use `doses` instead of `doseLogs`**

Replace:
```typescript
const pendingDoses = doseLogs.filter(...)
```
With:
```typescript
const pendingDoses = doses.filter(...)
```

- [ ] **Step 3: Update DoseCard props — remove onDelete, pass scheduleId**

```typescript
<DoseCard
  key={dose.id}
  time={dose.scheduledTime}
  medicationName={dose.medicationName}
  doseValue={dose.doseValue}
  doseUnit={dose.doseUnit}
  presentation={dose.presentation}
  icon={dose.medicationIcon}
  status={dose.status}
  color={dose.medicationColor}
  scheduleId={dose.scheduleId}
  onMarkTaken={() => updateDoseStatus(dose.id, dose.scheduleId, dose.medicationId, dose.scheduledDate, dose.scheduledTime, dose.doseLabel, 'taken')}
  onMarkSkipped={() => updateDoseStatus(dose.id, dose.scheduleId, dose.medicationId, dose.scheduledDate, dose.scheduledTime, dose.doseLabel, 'skipped')}
  onMarkCancelled={() => updateDoseStatus(dose.id, dose.scheduleId, dose.medicationId, dose.scheduledDate, dose.scheduledTime, dose.doseLabel, 'cancelled')}
  onDelete={() => {}} /* noop — remove in Task 6 */
/>
```

- [ ] **Step 4: Update imports**

Remove `useMedicationStore` import (HomePage no longer directly uses medicationStore).
Keep `useDoseScheduleStore`. Remove `DoseWithDetails` type import.

- [ ] **Step 5: Run type-check**

Run: `npx tsc --noEmit`

---

### Task 6: Update DoseCard

**Files:**
- Modify: `src/components/DoseCard.tsx`

- [ ] **Step 1: Remove onDelete from Props interface**

Remove `onDelete: () => void` from `Props`.

- [ ] **Step 2: Remove "Eliminar dosis" from context menu**

Remove the `Trash2` menu item from `menuActions` array and its handler.

---

### Task 7: Update MorePage

**Files:**
- Modify: `src/pages/MorePage.tsx`

- [ ] **Step 1: Load doses using new store API**

Replace `loadDoseLogs` from `useMedicationStore` with `loadDosesForDate` from `useDoseScheduleStore`:
```typescript
const { load: loadMeds } = useMedicationStore()
const { loadDosesForDate } = useDoseScheduleStore()

// In handleDeleteAll:
const today = todayISO()
await Promise.all([loadMeds(), loadDosesForDate(today)])
```

- [ ] **Step 2: Run type-check**

Run: `npx tsc --noEmit`
Expected: PASS

---

### Task 8: Update MedicationWizard to include updatedAt

**Files:**
- Modify: `src/wizard/MedicationWizard.tsx`

- [ ] **Step 1: Add updatedAt to new medication objects**

In `handleSave`:
```typescript
await add({
  id: generateId(),
  name: name.trim(),
  presentation,
  doseValue: Number(doseValue) || 0,
  doseUnit: doseUnit.trim(),
  icon: selectedIcon,
  color,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(), // ADD THIS
})
```

---

### Task 9: Update DoseWizard to strip frequencyConfig.type

**Files:**
- Modify: `src/wizard/DoseWizard.tsx`

- [ ] **Step 1: Remove `type` from frequencyConfig in handleSave**

Replace:
```typescript
frequencyConfig: { type: frequencyType, timesPerDay, days: specificDays, interval: intervalValue },
```
With:
```typescript
frequencyConfig: { timesPerDay, days: specificDays, interval: intervalValue },
```

---

### Task 10: Build Verification

- [ ] **Step 1: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Production build**

Run: `npx vite build`
Expected: clean output, PWA built
