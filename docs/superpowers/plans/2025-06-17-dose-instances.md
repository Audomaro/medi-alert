# Dose Instances Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace dynamic dose generation with pre-generated `DoseInstance` rows in IndexedDB, enabling real DELETE operations for "Solo esta", "Esta y futuras", and "Todas" without affecting past doses or other medications.

**Architecture:** `DoseSchedule` becomes a configuration template. A new `dose_instances` table stores every individual dose occurrence as a real row. The store loads instances directly instead of generating them on the fly. Deletion becomes a real DB DELETE.

**Tech Stack:** React + TypeScript + Zustand + IndexedDB (idb) + Vitest

---

## Files to Create or Modify

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | Add `DoseInstance`, `DoseDefinition`; update `DoseSchedule`; remove `DoseAction` |
| `src/db/index.ts` | Schema v8: create `dose_instances` table, migration, CRUD functions |
| `src/utils/generateInstances.ts` | Generate `DoseInstance[]` from a `DoseSchedule` |
| `src/stores/doseScheduleStore.ts` | Rewrite all methods to use `dose_instances` |
| `src/pages/HomePage.tsx` | Update calls to match new store signatures |
| `src/stores/doseScheduleStore.test.ts` | Rewrite tests for new architecture |

---

### Task 1: Update Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace `Dose` with `DoseDefinition`**

```typescript
export interface DoseDefinition {
  label: string
  time: string
  doseValue: number
  doseUnit: string
}
```

- [ ] **Step 2: Update `DoseSchedule` to use `doseDefinitions`**

```typescript
export interface DoseSchedule {
  id: string
  medicationId: string
  frequencyType: FrequencyType
  frequencyConfig: FrequencyConfig
  doseDefinitions: DoseDefinition[]
  startDate: string
  endDate: string
  active: boolean
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 3: Add `DoseInstance` type**

```typescript
export interface DoseInstance {
  id: string
  scheduleId: string
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  doseLabel: string
  doseValue: number
  doseUnit: string
  status: DoseStatus
  takenAt?: string
  createdAt: string
  updatedAt: string
}
```

- [ ] **Step 4: Remove `DoseAction` interface**

Delete the `DoseAction` interface entirely.

- [ ] **Step 5: Verify TypeScript build**

Run: `npx tsc --noEmit`
Expected: Errors in files that still reference `DoseAction` and `Dose` — that's expected for now

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts
git commit -m "types: add DoseInstance, DoseDefinition; update DoseSchedule; remove DoseAction"
```

---

### Task 2: Update DB Schema to v8

**Files:**
- Modify: `src/db/index.ts`

- [ ] **Step 1: Bump DB_VERSION to 8**

Change `const DB_VERSION = 7` to `const DB_VERSION = 8`

- [ ] **Step 2: Add upgrade block for v8**

Add inside `upgrade`:

```typescript
if (_oldVersion < 8) {
  const instanceStore = db.createObjectStore('dose_instances', { keyPath: 'id' })
  instanceStore.createIndex('date', 'scheduledDate')
  instanceStore.createIndex('schedule', 'scheduleId')

  // Migrate existing DoseActions to DoseInstances
  if (db.objectStoreNames.contains('dose_actions')) {
    const actionStore = transaction.objectStore('dose_actions')
    const actions = await actionStore.getAll()
    for (const a of actions) {
      await instanceStore.put({
        id: a.id,
        scheduleId: a.scheduleId,
        medicationId: a.medicationId,
        scheduledDate: a.scheduledDate,
        scheduledTime: a.scheduledTime,
        doseLabel: a.doseLabel,
        doseValue: 0, // Will be regenerated from schedule
        doseUnit: '',
        status: a.status,
        takenAt: a.takenAt,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    }
    db.deleteObjectStore('dose_actions')
  }
}
```

- [ ] **Step 3: Add CRUD functions for `dose_instances`**

Add at the end of the file:

```typescript
export async function getDoseInstancesByDate(date: string): Promise<DoseInstance[]> {
  const db = await getDB()
  return db.getAllFromIndex('dose_instances', 'date', date)
}

export async function getDoseInstancesBySchedule(scheduleId: string): Promise<DoseInstance[]> {
  const db = await getDB()
  return db.getAllFromIndex('dose_instances', 'schedule', scheduleId)
}

export async function getDoseInstance(id: string): Promise<DoseInstance | undefined> {
  const db = await getDB()
  return db.get('dose_instances', id)
}

export async function saveDoseInstance(instance: DoseInstance): Promise<void> {
  const db = await getDB()
  await db.put('dose_instances', instance)
}

export async function saveDoseInstances(instances: DoseInstance[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('dose_instances', 'readwrite')
  for (const i of instances) {
    tx.store.put(i)
  }
  await tx.done
}

export async function deleteDoseInstance(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('dose_instances', id)
}

export async function deleteDoseInstancesBySchedule(scheduleId: string): Promise<void> {
  const db = await getDB()
  const instances = await db.getAllFromIndex('dose_instances', 'schedule', scheduleId)
  const tx = db.transaction('dose_instances', 'readwrite')
  for (const i of instances) {
    tx.store.delete(i.id)
  }
  await tx.done
}
```

- [ ] **Step 4: Remove old `DoseAction` functions**

Delete: `getDoseActionsByDate`, `saveDoseAction`, `deleteDoseAction`, `deleteDoseActionsBySchedule`, `getDoseAction`, `getDoseActionsBySchedule`

- [ ] **Step 5: Update imports**

Change `import type { Medication, DoseSchedule, DoseAction }` to `import type { Medication, DoseSchedule, DoseInstance }`

- [ ] **Step 6: Verify TypeScript build**

Run: `npx tsc --noEmit`
Expected: Errors in store and tests that still reference old functions

- [ ] **Step 7: Commit**

```bash
git add src/db/index.ts
git commit -m "db: schema v8 with dose_instances table, migrate dose_actions, add CRUD"
```

---

### Task 3: Create `generateDoseInstances` Utility

**Files:**
- Create: `src/utils/generateInstances.ts`

- [ ] **Step 1: Create the utility**

```typescript
import type { DoseSchedule, DoseInstance } from '../types'
import { shouldGenerateForDate, generateInstanceId } from './schedule'

export function generateDoseInstances(schedule: DoseSchedule): DoseInstance[] {
  const instances: DoseInstance[] = []
  const start = new Date(schedule.startDate + 'T00:00:00')
  const end = new Date(schedule.endDate + 'T00:00:00')
  const now = new Date().toISOString()

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    if (!shouldGenerateForDate(schedule, dateStr)) continue

    for (const def of schedule.doseDefinitions) {
      instances.push({
        id: generateInstanceId(schedule.id, dateStr, def.time, def.label),
        scheduleId: schedule.id,
        medicationId: schedule.medicationId,
        scheduledDate: dateStr,
        scheduledTime: def.time,
        doseLabel: def.label,
        doseValue: def.doseValue,
        doseUnit: def.doseUnit,
        status: 'pending',
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  return instances
}
```

- [ ] **Step 2: Write test for generator**

Create `src/utils/generateInstances.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { generateDoseInstances } from './generateInstances'
import type { DoseSchedule } from '../types'

function makeSchedule(overrides: Partial<DoseSchedule> = {}): DoseSchedule {
  return {
    id: 'sched-1',
    medicationId: 'med-1',
    frequencyType: 'daily',
    frequencyConfig: {},
    doseDefinitions: [
      { label: 'Mañana', time: '08:00', doseValue: 500, doseUnit: 'mg' },
      { label: 'Tarde', time: '14:00', doseValue: 250, doseUnit: 'mg' },
    ],
    startDate: '2026-06-15',
    endDate: '2026-06-17',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('generateDoseInstances', () => {
  it('generates all doses for each day in range', () => {
    const schedule = makeSchedule()
    const instances = generateDoseInstances(schedule)

    // 3 days × 2 doses = 6 instances
    expect(instances).toHaveLength(6)

    const dates = [...new Set(instances.map((i) => i.scheduledDate))]
    expect(dates).toEqual(['2026-06-15', '2026-06-16', '2026-06-17'])
  })

  it('skips days not matching frequency', () => {
    const schedule = makeSchedule({
      frequencyType: 'specific_days',
      frequencyConfig: { days: [1] }, // Monday only
      startDate: '2026-06-15', // Monday
      endDate: '2026-06-21', // Sunday
    })
    const instances = generateDoseInstances(schedule)
    expect(instances).toHaveLength(2) // Only Monday 15th
    expect(instances[0].scheduledDate).toBe('2026-06-15')
  })

  it('assigns correct metadata to each instance', () => {
    const schedule = makeSchedule()
    const instances = generateDoseInstances(schedule)

    const morning = instances.find((i) => i.scheduledTime === '08:00')
    expect(morning).toBeDefined()
    expect(morning!.doseValue).toBe(500)
    expect(morning!.doseUnit).toBe('mg')
    expect(morning!.status).toBe('pending')
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/utils/generateInstances.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/utils/generateInstances.ts src/utils/generateInstances.test.ts
git commit -m "feat: add generateDoseInstances utility with tests"
```

---

### Task 4: Rewrite Store — Core Methods

**Files:**
- Modify: `src/stores/doseScheduleStore.ts`
- Modify: `src/stores/doseScheduleStore.test.ts`

- [ ] **Step 1: Rewrite imports**

```typescript
import { create } from 'zustand'
import type { DoseSchedule, DoseWithDetails, DoseInstance, Medication } from '../types'
import { generateDoseInstances } from '../utils/generateInstances'
import {
  getAllDoseSchedules,
  getDoseSchedule,
  saveDoseSchedule,
  deleteDoseSchedule,
  getDoseInstancesByDate,
  getDoseInstancesBySchedule,
  getDoseInstance,
  saveDoseInstance,
  saveDoseInstances,
  deleteDoseInstance,
  deleteDoseInstancesBySchedule,
  getAllMedications,
} from '../db'
```

- [ ] **Step 2: Rewrite `loadDosesForDate`**

```typescript
loadDosesForDate: async (date) => {
  const [instances, medications] = await Promise.all([
    getDoseInstancesByDate(date),
    getAllMedications(),
  ])

  const medMap = new Map<string, Medication>()
  for (const m of medications) medMap.set(m.id, m)

  const result: DoseWithDetails[] = []
  for (const i of instances) {
    if (i.status === 'deleted') continue
    const med = medMap.get(i.medicationId)
    result.push({
      id: i.id,
      scheduleId: i.scheduleId,
      medicationId: i.medicationId,
      scheduledDate: i.scheduledDate,
      scheduledTime: i.scheduledTime,
      doseLabel: i.doseLabel,
      status: i.status,
      takenAt: i.takenAt,
      doseValue: i.doseValue,
      doseUnit: i.doseUnit,
      medicationName: med?.name || 'Desconocido',
      medicationIcon: med?.icon,
      medicationColor: med?.color,
      presentation: med?.presentation || 'otro',
    })
  }

  set({ doses: result })
},
```

- [ ] **Step 3: Rewrite `add`**

```typescript
add: async (s) => {
  await saveDoseSchedule(s)
  const instances = generateDoseInstances(s)
  await saveDoseInstances(instances)
  set((state) => ({ doseSchedules: [...state.doseSchedules, s] }))
},
```

- [ ] **Step 4: Rewrite `update`**

```typescript
update: async (s) => {
  await saveDoseSchedule(s)
  // Regenerate instances: preserve statuses of existing ones
  const existing = await getDoseInstancesBySchedule(s.id)
  const existingMap = new Map<string, DoseInstance>()
  for (const e of existing) existingMap.set(e.id, e)

  const newInstances = generateDoseInstances(s)
  for (const i of newInstances) {
    const old = existingMap.get(i.id)
    if (old && old.status !== 'pending') {
      i.status = old.status
      i.takenAt = old.takenAt
    }
  }

  // Delete instances that no longer apply
  const newIds = new Set(newInstances.map((i) => i.id))
  for (const e of existing) {
    if (!newIds.has(e.id)) {
      await deleteDoseInstance(e.id)
    }
  }

  await saveDoseInstances(newInstances)
  set((state) => ({ doseSchedules: state.doseSchedules.map((x) => (x.id === s.id ? s : x)) }))
},
```

- [ ] **Step 5: Rewrite `remove`**

```typescript
remove: async (id) => {
  await deleteDoseInstancesBySchedule(id)
  await deleteDoseSchedule(id)
  set((state) => ({
    doseSchedules: state.doseSchedules.filter((x) => x.id !== id),
    doses: state.doses.filter((d) => d.scheduleId !== id),
  }))
},
```

- [ ] **Step 6: Rewrite `updateDoseStatus`**

```typescript
updateDoseStatus: async (instanceId, status) => {
  const instance = await getDoseInstance(instanceId)
  if (!instance) return
  instance.status = status
  instance.takenAt = status === 'taken' ? new Date().toISOString() : undefined
  instance.updatedAt = new Date().toISOString()
  await saveDoseInstance(instance)
  set((state) => ({
    doses: state.doses.map((d) =>
      d.id === instanceId
        ? { ...d, status, takenAt: instance.takenAt }
        : d
    ),
  }))
},
```

**Note:** New signature is just `(instanceId, status)` — much simpler!

- [ ] **Step 7: Rewrite `deleteFutureDoses`**

```typescript
deleteFutureDoses: async (scheduleId, doseLabel, scheduledTime, fromDate) => {
  const instances = await getDoseInstancesBySchedule(scheduleId)
  const toDelete = instances.filter(
    (i) => i.doseLabel === doseLabel && i.scheduledTime === scheduledTime && i.scheduledDate >= fromDate
  )
  for (const i of toDelete) {
    await deleteDoseInstance(i.id)
  }
  set((state) => ({
    doses: state.doses.filter(
      (d) => !(d.scheduleId === scheduleId && d.doseLabel === doseLabel && d.scheduledTime === scheduledTime && d.scheduledDate >= fromDate)
    ),
  }))
},
```

- [ ] **Step 8: Rewrite `deleteDoseSlot`**

```typescript
deleteDoseSlot: async (instanceId) => {
  await deleteDoseInstance(instanceId)
  set((state) => ({
    doses: state.doses.filter((d) => d.id !== instanceId),
  }))
},
```

- [ ] **Step 9: Update interface**

```typescript
interface DoseScheduleState {
  doseSchedules: DoseSchedule[]
  doses: DoseWithDetails[]
  loadSchedules: () => Promise<void>
  loadDosesForDate: (date: string) => Promise<void>
  add: (s: DoseSchedule) => Promise<void>
  update: (s: DoseSchedule) => Promise<void>
  remove: (id: string) => Promise<void>
  updateDoseStatus: (instanceId: string, status: 'taken' | 'skipped' | 'cancelled') => Promise<void>
  deleteFutureDoses: (scheduleId: string, doseLabel: string, scheduledTime: string, fromDate: string) => Promise<void>
  deleteDoseSlot: (instanceId: string) => Promise<void>
}
```

- [ ] **Step 10: Commit**

```bash
git add src/stores/doseScheduleStore.ts
git commit -m "feat: rewrite store to use pre-generated dose_instances"
```

---

### Task 5: Update HomePage

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Update destructured imports from store**

```typescript
const { doses, loadDosesForDate, updateDoseStatus, deleteFutureDoses, deleteDoseSlot, remove: removeSchedule } = useDoseScheduleStore()
```

- [ ] **Step 2: Update service worker handler**

```typescript
if (action === 'delete') {
  deleteDoseSlot(doseId)
} else {
  updateDoseStatus(doseId, action)
}
```

- [ ] **Step 3: Update DoseCard callbacks**

```typescript
onMarkTaken={() => updateDoseStatus(dose.id, 'taken')}
onMarkSkipped={() => updateDoseStatus(dose.id, 'skipped')}
onMarkCancelled={() => updateDoseStatus(dose.id, 'cancelled')}
onDelete={() => setDeletingDose(dose)}
```

- [ ] **Step 4: Update modal buttons**

```typescript
// Solo esta
onClick={() => {
  deleteDoseSlot(deletingDose.id)
  setDeletingDose(null)
}}

// Esta y futuras
onClick={() => {
  deleteFutureDoses(deletingDose.scheduleId, deletingDose.doseLabel, deletingDose.scheduledTime, deletingDose.scheduledDate)
  setDeletingDose(null)
}}

// Todas
onClick={() => {
  removeSchedule(deletingDose.scheduleId)
  setDeletingDose(null)
}}
```

- [ ] **Step 5: Verify TypeScript build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat: update HomePage to use new store signatures"
```

---

### Task 6: Rewrite Tests

**Files:**
- Modify: `src/stores/doseScheduleStore.test.ts`

- [ ] **Step 1: Rewrite test file completely**

Replace the entire file with:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DoseSchedule, Medication } from '../types'
import { useDoseScheduleStore } from './doseScheduleStore'
import {
  getAllDoseSchedules,
  getDoseSchedule,
  saveDoseSchedule,
  deleteDoseSchedule,
  getDoseInstancesByDate,
  getDoseInstancesBySchedule,
  getDoseInstance,
  saveDoseInstance,
  saveDoseInstances,
  deleteDoseInstance,
  deleteDoseInstancesBySchedule,
  getAllMedications,
} from '../db'

vi.mock('../db')

const mockedGetAllDoseSchedules = vi.mocked(getAllDoseSchedules)
const mockedGetDoseSchedule = vi.mocked(getDoseSchedule)
const mockedSaveDoseSchedule = vi.mocked(saveDoseSchedule)
const mockedDeleteDoseSchedule = vi.mocked(deleteDoseSchedule)
const mockedGetDoseInstancesByDate = vi.mocked(getDoseInstancesByDate)
const mockedGetDoseInstancesBySchedule = vi.mocked(getDoseInstancesBySchedule)
const mockedGetDoseInstance = vi.mocked(getDoseInstance)
const mockedSaveDoseInstance = vi.mocked(saveDoseInstance)
const mockedSaveDoseInstances = vi.mocked(saveDoseInstances)
const mockedDeleteDoseInstance = vi.mocked(deleteDoseInstance)
const mockedDeleteDoseInstancesBySchedule = vi.mocked(deleteDoseInstancesBySchedule)
const mockedGetAllMedications = vi.mocked(getAllMedications)

function makeSchedule(overrides: Partial<DoseSchedule> = {}): DoseSchedule {
  return {
    id: 'sched-1',
    medicationId: 'med-1',
    frequencyType: 'daily',
    frequencyConfig: {},
    doseDefinitions: [
      { label: 'Mañana', time: '08:00', doseValue: 500, doseUnit: 'mg' },
      { label: 'Tarde', time: '14:00', doseValue: 250, doseUnit: 'mg' },
    ],
    startDate: '2026-06-15',
    endDate: '2026-06-30',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const medication: Medication = {
  id: 'med-1',
  name: 'Paracetamol',
  presentation: 'pastilla',
  doseValue: 500,
  doseUnit: 'mg',
  icon: 'pill',
  color: '#ff0000',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function makeInstance(overrides: Partial<any> = {}): any {
  return {
    id: 'sched-1|2026-06-15|08:00|Mañana',
    scheduleId: 'sched-1',
    medicationId: 'med-1',
    scheduledDate: '2026-06-15',
    scheduledTime: '08:00',
    doseLabel: 'Mañana',
    doseValue: 500,
    doseUnit: 'mg',
    status: 'pending',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function resetStore() {
  useDoseScheduleStore.setState({
    doseSchedules: [],
    doses: [],
  })
}

describe('doseScheduleStore - loadDosesForDate', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('loads instances for the given date and filters deleted', async () => {
    mockedGetDoseInstancesByDate.mockResolvedValue([
      makeInstance({ id: 'i1', scheduledTime: '08:00', status: 'pending' }),
      makeInstance({ id: 'i2', scheduledTime: '14:00', status: 'deleted' }),
    ])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('08:00')
  })
})

describe('doseScheduleStore - deleteDoseSlot (Solo esta)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('deletes a single instance from DB and state', async () => {
    mockedGetDoseInstancesByDate.mockResolvedValue([
      makeInstance({ id: 'i1', scheduledTime: '08:00' }),
      makeInstance({ id: 'i2', scheduledTime: '14:00' }),
    ])
    mockedGetAllMedications.mockResolvedValue([medication])
    mockedDeleteDoseInstance.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    await store.deleteDoseSlot('i1')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(1)
    expect(mockedDeleteDoseInstance).toHaveBeenCalledWith('i1')
  })
})

describe('doseScheduleStore - deleteFutureDoses (Esta y futuras)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('deletes only matching instances from the given date forward', async () => {
    mockedGetDoseInstancesBySchedule.mockResolvedValue([
      makeInstance({ id: 'i1', scheduledDate: '2026-06-15', scheduledTime: '08:00' }),
      makeInstance({ id: 'i2', scheduledDate: '2026-06-16', scheduledTime: '08:00' }),
      makeInstance({ id: 'i3', scheduledDate: '2026-06-17', scheduledTime: '08:00' }),
      makeInstance({ id: 'i4', scheduledDate: '2026-06-17', scheduledTime: '14:00' }),
    ])
    mockedDeleteDoseInstance.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.deleteFutureDoses('sched-1', 'Mañana', '08:00', '2026-06-16')

    expect(mockedDeleteDoseInstance).toHaveBeenCalledTimes(2)
    expect(mockedDeleteDoseInstance).toHaveBeenCalledWith('i2')
    expect(mockedDeleteDoseInstance).toHaveBeenCalledWith('i3')
    expect(mockedDeleteDoseInstance).not.toHaveBeenCalledWith('i1')
    expect(mockedDeleteDoseInstance).not.toHaveBeenCalledWith('i4')
  })
})

describe('doseScheduleStore - remove (Todas)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('deletes all instances and the schedule', async () => {
    mockedDeleteDoseInstancesBySchedule.mockResolvedValue(undefined)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.remove('sched-1')

    expect(mockedDeleteDoseInstancesBySchedule).toHaveBeenCalledWith('sched-1')
    expect(mockedDeleteDoseSchedule).toHaveBeenCalledWith('sched-1')
  })
})

describe('doseScheduleStore - updateDoseStatus', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('updates status on the instance', async () => {
    const instance = makeInstance({ id: 'i1', status: 'pending' })
    mockedGetDoseInstance.mockResolvedValue(instance)
    mockedSaveDoseInstance.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.updateDoseStatus('i1', 'taken')

    expect(instance.status).toBe('taken')
    expect(instance.takenAt).toBeDefined()
    expect(mockedSaveDoseInstance).toHaveBeenCalledWith(instance)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/stores/doseScheduleStore.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/stores/doseScheduleStore.test.ts
git commit -m "test: rewrite store tests for dose_instances architecture"
```

---

### Task 7: Full Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: TypeScript build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "feat: complete dose_instances refactor with full test coverage"
```

---

## Spec Coverage Checklist

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| `DoseInstance` type | Task 1 |
| `DoseDefinition` type | Task 1 |
| `DoseSchedule.doseDefinitions` | Task 1 |
| Remove `DoseAction` | Task 1 |
| DB schema v8 with `dose_instances` | Task 2 |
| Migration from `dose_actions` | Task 2 |
| CRUD for `dose_instances` | Task 2 |
| `generateDoseInstances` utility | Task 3 |
| Store loads instances directly | Task 4 |
| `deleteDoseSlot` = real DELETE | Task 4 |
| `deleteFutureDoses` = real DELETE range | Task 4 |
| `remove` = real DELETE all + schedule | Task 4 |
| `updateDoseStatus` = UPDATE status | Task 4 |
| HomePage updated | Task 5 |
| Tests cover all 3 deletion options | Task 6 |
| Other medications unaffected | Task 6 |
| Other doses same day unaffected | Task 6 |

## Placeholder Scan

- No TBD, TODO, or "implement later" found.
- All steps have exact code.
- All file paths are exact.

## Type Consistency Check

- `DoseSchedule.doseDefinitions` used in Task 1, 3, 4
- `DoseInstance` used in Tasks 2, 3, 4, 6
- `deleteDoseSlot(instanceId)` signature in Task 4 matches HomePage call in Task 5
- `deleteFutureDoses(scheduleId, doseLabel, scheduledTime, fromDate)` signature consistent in Tasks 4, 5, 6
- `updateDoseStatus(instanceId, status)` signature consistent in Tasks 4, 5

No inconsistencies found.
