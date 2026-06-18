# Dose Deletion — Tres Opciones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement three deletion options for generated doses: "Solo esta" (hide one instance), "Esta y futuras" (remove dose from schedule from selected date forward), and "Todas" (delete entire schedule + history). No option deletes the Medication.

**Architecture:** Use existing IndexedDB tables (`medications`, `dose_schedules`, `dose_actions`). Add `'deleted'` as a `DoseStatus` value. "Solo esta" stores a `DoseAction` with `status: 'deleted'` — `loadDosesForDate` filters these out without touching the schedule. "Esta y futuras" modifies the `DoseSchedule` (removes the dose, sets `endDate`). "Todas" removes the schedule and its actions.

**Tech Stack:** React + TypeScript + Zustand + IndexedDB (idb) + Vitest

---

## Files to Create or Modify

| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | Add `'deleted'` to `DoseStatus` union |
| `src/stores/doseScheduleStore.ts` | Update `loadDosesForDate`, `deleteDoseSlot`, `deleteFutureDoses` |
| `src/pages/HomePage.tsx` | Update `deleteDoseSlot` call signature; update button label |
| `src/stores/doseScheduleStore.test.ts` | Replace tests to cover new behavior |

---

### Task 1: Add `'deleted'` to `DoseStatus`

**Files:**
- Modify: `src/types/index.ts:5`

- [ ] **Step 1: Update the type**

```typescript
export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'cancelled' | 'deleted'
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "types: add 'deleted' to DoseStatus"
```

---

### Task 2: Filter `'deleted'` actions in `loadDosesForDate`

**Files:**
- Modify: `src/stores/doseScheduleStore.ts:61-84`

- [ ] **Step 1: Write failing test**

In `src/stores/doseScheduleStore.test.ts`, add:

```typescript
it('filters deleted dose actions from the doses list', async () => {
  const schedule = makeSchedule()
  mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
  mockedGetDoseActionsByDate.mockResolvedValue([
    {
      id: 'sched-1|2026-06-15|08:00|Mañana',
      scheduleId: 'sched-1',
      medicationId: 'med-1',
      scheduledDate: '2026-06-15',
      scheduledTime: '08:00',
      doseLabel: 'Mañana',
      status: 'deleted',
    },
  ])
  mockedGetAllMedications.mockResolvedValue([medication])

  const store = useDoseScheduleStore.getState()
  await store.loadDosesForDate('2026-06-15')

  const doses = useDoseScheduleStore.getState().doses
  expect(doses).toHaveLength(1)
  expect(doses[0].scheduledTime).toBe('14:00')
})
```

- [ ] **Step 2: Run test — verify it fails**

Run: `npx vitest run src/stores/doseScheduleStore.test.ts`
Expected: FAIL — `expected 1, received 2`

- [ ] **Step 3: Implement filter in `loadDosesForDate`**

In `src/stores/doseScheduleStore.ts`, inside the `for (const dose of s.doses)` loop, after getting `action`, add:

```typescript
const instanceId = generateInstanceId(s.id, date, dose.time, dose.label)
const action = actionMap.get(instanceId)
if (action?.status === 'deleted') continue
```

- [ ] **Step 4: Run test — verify it passes**

Run: `npx vitest run src/stores/doseScheduleStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/doseScheduleStore.ts src/stores/doseScheduleStore.test.ts
git commit -m "feat: filter deleted actions when loading doses"
```

---

### Task 3: Reimplement `deleteDoseSlot` for "Solo esta"

**Current behavior:** Modifies the schedule, removes the dose permanently.
**New behavior:** Stores a `DoseAction` with `status: 'deleted'`; leaves schedule untouched.

**Files:**
- Modify: `src/stores/doseScheduleStore.ts:35-36, 157-184`
- Modify: `src/pages/HomePage.tsx:14, 150`

- [ ] **Step 1: Update `DoseScheduleState` interface signature**

```typescript
deleteDoseSlot: (instanceId: string, scheduleId: string, medicationId: string, scheduledDate: string, doseLabel: string, scheduledTime: string) => Promise<void>
```

- [ ] **Step 2: Reimplement `deleteDoseSlot`**

Replace the entire `deleteDoseSlot` method with:

```typescript
deleteDoseSlot: async (instanceId, scheduleId, medicationId, scheduledDate, doseLabel, scheduledTime) => {
  const action: DoseAction = {
    id: instanceId,
    scheduleId,
    medicationId,
    scheduledDate,
    scheduledTime,
    doseLabel,
    status: 'deleted',
  }
  await saveDoseAction(action)
  set((state) => ({
    doses: state.doses.filter((d) => d.id !== instanceId),
  }))
},
```

- [ ] **Step 3: Update HomePage call signature**

In `src/pages/HomePage.tsx` line 150, change:

```typescript
// BEFORE
deleteDoseSlot(deletingDose.id, deletingDose.scheduleId, deletingDose.doseLabel, deletingDose.scheduledTime)
// AFTER
deleteDoseSlot(deletingDose.id, deletingDose.scheduleId, deletingDose.medicationId, deletingDose.scheduledDate, deletingDose.doseLabel, deletingDose.scheduledTime)
```

- [ ] **Step 4: Write test for new behavior**

In `src/stores/doseScheduleStore.test.ts`, replace the `deleteDoseSlot` describe block with:

```typescript
describe('doseScheduleStore - deleteDoseSlot (Solo esta)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('creates a deleted action and removes only the targeted instance from state', async () => {
    const schedule = makeSchedule()
    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])
    mockedSaveDoseAction.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    const instanceId = useDoseScheduleStore.getState().doses.find((d) => d.scheduledTime === '08:00')!.id

    await store.deleteDoseSlot(instanceId, 'sched-1', 'med-1', '2026-06-15', 'Mañana', '08:00')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('14:00')

    expect(mockedSaveDoseAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: instanceId,
        scheduleId: 'sched-1',
        medicationId: 'med-1',
        scheduledDate: '2026-06-15',
        scheduledTime: '08:00',
        doseLabel: 'Mañana',
        status: 'deleted',
      })
    )
    expect(mockedSaveDoseSchedule).not.toHaveBeenCalled()
    expect(mockedDeleteDoseSchedule).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 5: Run tests — verify they pass**

Run: `npx vitest run src/stores/doseScheduleStore.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/stores/doseScheduleStore.ts src/pages/HomePage.tsx src/stores/doseScheduleStore.test.ts
git commit -m "feat: reimplement deleteDoseSlot as 'Solo esta' — stores deleted action, leaves schedule intact"
```

---

### Task 4: Reimplement `deleteFutureDoses` for "Esta y futuras"

**Current behavior:** Removes dose from schedule AND deletes all past actions for that label+time.
**New behavior:** Removes dose from schedule, sets `endDate` to day before selected date, but DOES NOT delete past actions.

**Files:**
- Modify: `src/stores/doseScheduleStore.ts:124-155`

- [ ] **Step 1: Reimplement `deleteFutureDoses`**

Replace with:

```typescript
deleteFutureDoses: async (instanceId, scheduleId, scheduledDate, doseLabel, scheduledTime) => {
  const s = await getDoseSchedule(scheduleId)
  if (!s) return

  // Calculate day before the current dose's date
  const d = new Date(scheduledDate + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  const newEnd = d.toISOString().split('T')[0]

  // Remove this specific dose time from schedule (match by label + time)
  const remaining = s.doses.filter((d) => d.label !== doseLabel || d.time !== scheduledTime)
  const updated = { ...s, doses: remaining, endDate: newEnd, updatedAt: new Date().toISOString() }

  if (remaining.length === 0) {
    await deleteDoseSchedule(scheduleId)
    set((state) => ({
      doseSchedules: state.doseSchedules.filter((x) => x.id !== scheduleId),
      doses: state.doses.filter((d) => d.scheduleId !== scheduleId),
    }))
  } else {
    await saveDoseSchedule(updated)
    set((state) => ({
      doseSchedules: state.doseSchedules.map((x) => (x.id === scheduleId ? updated : x)),
      doses: state.doses.filter((d) => d.id !== instanceId),
    }))
  }
},
```

**Key change:** Removed the loop that called `deleteDoseAction` for past actions.

- [ ] **Step 2: Write test for new behavior**

Replace `deleteFutureDoses` describe block:

```typescript
describe('doseScheduleStore - deleteFutureDoses (Esta y futuras)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('modifies schedule endDate and removes dose, preserving other doses on same date', async () => {
    const schedule = makeSchedule()
    mockedGetDoseSchedule.mockResolvedValue(schedule)
    mockedSaveDoseSchedule.mockResolvedValue(undefined)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)

    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    const instanceId = useDoseScheduleStore.getState().doses.find((d) => d.scheduledTime === '08:00')!.id

    await store.deleteFutureDoses(instanceId, 'sched-1', '2026-06-15', 'Mañana', '08:00')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('14:00')

    expect(mockedSaveDoseSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sched-1',
        doses: [{ label: 'Tarde', time: '14:00', doseValue: 250, doseUnit: 'mg' }],
        endDate: '2026-06-14',
      })
    )
    expect(mockedDeleteDoseAction).not.toHaveBeenCalled()
  })

  it('deletes the entire schedule when removing the last remaining dose', async () => {
    const schedule = makeSchedule({ doses: [{ label: 'Mañana', time: '08:00', doseValue: 500, doseUnit: 'mg' }] })
    mockedGetDoseSchedule.mockResolvedValue(schedule)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)

    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(1)

    const instanceId = useDoseScheduleStore.getState().doses[0].id
    await store.deleteFutureDoses(instanceId, 'sched-1', '2026-06-15', 'Mañana', '08:00')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(0)
    expect(useDoseScheduleStore.getState().doseSchedules).toHaveLength(0)
    expect(mockedDeleteDoseSchedule).toHaveBeenCalledWith('sched-1')
  })
})
```

- [ ] **Step 3: Run tests — verify they pass**

Run: `npx vitest run src/stores/doseScheduleStore.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/doseScheduleStore.ts src/stores/doseScheduleStore.test.ts
git commit -m "feat: reimplement deleteFutureDoses as 'Esta y futuras' — preserves past actions"
```

---

### Task 5: Verify `remove` works for "Todas"

**Files:**
- Modify: `src/stores/doseScheduleStore.test.ts`
- Modify: `src/pages/HomePage.tsx:171`

- [ ] **Step 1: Update button label in HomePage**

In `src/pages/HomePage.tsx` line 171, change button text from "Todas las fechas" to "Todas".

- [ ] **Step 2: Write test for `remove`**

```typescript
describe('doseScheduleStore - remove (Todas)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('deletes the schedule, all its actions, and removes all doses from state', async () => {
    const schedule = makeSchedule()
    mockedDeleteDoseActionsBySchedule.mockResolvedValue(undefined)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)

    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    await store.remove('sched-1')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(0)
    expect(useDoseScheduleStore.getState().doseSchedules).toHaveLength(0)
    expect(mockedDeleteDoseActionsBySchedule).toHaveBeenCalledWith('sched-1')
    expect(mockedDeleteDoseSchedule).toHaveBeenCalledWith('sched-1')
  })
})
```

- [ ] **Step 3: Run tests — verify they pass**

Run: `npx vitest run src/stores/doseScheduleStore.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/stores/doseScheduleStore.test.ts src/pages/HomePage.tsx
git commit -m "test: add tests for 'Todas' removal; update button label"
```

---

### Task 6: Full test suite verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (17 schedule tests + new store tests)

- [ ] **Step 2: Verify TypeScript build**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add .
git commit -m "test: verify full suite passes after dose deletion refactor"
```

---

## Spec Coverage Checklist

| Spec Requirement | Implementing Task |
|------------------|-------------------|
| `DoseStatus` includes `'deleted'` | Task 1 |
| `loadDosesForDate` filters `'deleted'` | Task 2 |
| "Solo esta" creates `DoseAction('deleted')`, leaves schedule | Task 3 |
| "Esta y futuras" modifies schedule endDate, removes dose, preserves past actions | Task 4 |
| "Todas" deletes schedule + all actions | Task 5 (verify existing `remove`) |
| Medication never deleted | All tasks (never touch `medications` store) |
| Tests cover all 3 options | Tasks 2–5 |

## Placeholder Scan

- No TBD, TODO, or "implement later" found.
- No vague steps — each step has exact code or exact command.
- All type signatures are consistent across tasks.

## Type Consistency Check

- `DoseStatus` = `'pending' | 'taken' | 'skipped' | 'cancelled' | 'deleted'` — used in Task 1, referenced in Tasks 2–4.
- `deleteDoseSlot` signature: `(instanceId, scheduleId, medicationId, scheduledDate, doseLabel, scheduledTime)` — defined in Task 3, used in Task 3 test.
- `deleteFutureDoses` signature: unchanged — `(instanceId, scheduleId, scheduledDate, doseLabel, scheduledTime)` — used in Task 4.

No inconsistencies found.
