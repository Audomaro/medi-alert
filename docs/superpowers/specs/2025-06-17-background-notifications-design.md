# Background Notifications via Service Worker

## Problem

When Medi-alert is installed as a PWA but closed (no browser windows open), notifications for due doses do not fire. Currently, the dose reminder check only runs in `HomePage.tsx` via `setInterval` while the page is open.

## Architecture

The Service Worker (SW) is the single source of truth for all notification delivery. Three complementary mechanisms ensure reliability:

| Mechanism | When | Purpose |
|---|---|---|
| Timer scheduling | SW `activate`, after each notification action | Programs exact `setTimeout` for each pending dose today |
| Periodic Background Sync | Every ~15 min (browser-managed) | Backup: catches doses missed while SW was terminated |
| Client message | After add/update/delete of a schedule | Tells SW to clear + reschedule all timers |

## Data Flow

### SW activate / message
```
[activate | message from client]
  → open IndexedDB (idb)
  → query dose_instances by today's date + status === 'pending'
  → for each pending instance:
      → if scheduledTime > now: setTimeout for exact time
      → if scheduledTime is within [now - 30min, now]: show notification immediately
```

### Periodic Sync
```
[periodicsync event, tag='dose-check']
  → open IndexedDB
  → query pending dose_instances for today
  → for each with scheduledTime in [now - 30min, now]: show notification
```

### Notification click (action button)
```
[notificationclick, action = taken|skipped|cancelled]
  → update dose_instance status in IndexedDB directly
  → postMessage to all open clients (type: 'DOSE_ACTION', action, doseId)
  → close notification
```

### Notification click (body, no action button)
```
[notificationclick, action = '']
  → close notification
  → focus existing window or open new window at /
```

## Notifications

### Format
```ts
{
  title: `Medi-alert — ${medicationName}`,
  body: `${doseValue} ${doseUnit} — programada para las ${scheduledTime}`,
  tag: doseInstance.id,       // deduplication key
  icon: '/icons/192.png',
  actions: [
    { action: 'taken',     title: 'Tomar' },
    { action: 'skipped',   title: 'Saltar' },
    { action: 'cancelled', title: 'Cancelar' },
  ],
  data: { doseId, scheduledDate, scheduledTime }
}
```

No "Eliminar" action — excluded as requested.

## IndexedDB Operations (SW-side)

Only three operations needed, using the already-installed `idb` library:

| Operation | Store | Logic |
|---|---|---|
| `getPendingDosesToday()` | `dose_instances` | `getAllFromIndex('date', todayISO)` filtered by `status === 'pending'` |
| `getMedication(id)` | `medications` | `get('medications', id)` → returns name, icon, color |
| `updateDoseStatus(id, status)` | `dose_instances` | `get('dose_instances', id)` → update status/takenAt → `put(...)` |

Medication details (name, icon, color) are resolved by joining `scheduleId → dose_schedule → medicationId → medications`.

## Client Changes

### App.tsx (or HomePage.tsx)
On mount, register periodic sync:
```ts
const reg = await navigator.serviceWorker.ready
if ('periodicSync' in reg) {
  await reg.periodicSync.register('dose-check', { minInterval: 15 * 60 * 1000 })
}
```

### doseScheduleStore.ts
After `add`, `update`, `delete` — send message to SW:
```ts
navigator.serviceWorker.controller?.postMessage({ type: 'RESCHEDULE' })
```

## Edge Cases

| Case | Handling |
|---|---|
| SW terminated between activate and dose time | Periodic Sync catches it on next wake |
| User marked dose from app before SW fires | Status is no longer `pending` → no notification |
| Multiple doses same time | Separate notification per dose, each with unique `tag` |
| Offline | IndexedDB works without connectivity |
| Periodic Sync not supported (Firefox, Safari) | Timer scheduling (primary mechanism) still works while SW is alive |
| App uninstalled | Periodic Sync reg is automatically removed by browser |

## Files Changed

| File | Change |
|---|---|
| `src/sw.ts` | Full rewrite: add scheduling logic, IndexedDB queries, periodic sync handler, message handler, updated notification handlers |
| `src/pages/App.tsx` (or HomePage) | Register periodic sync on mount |
| `src/stores/doseScheduleStore.ts` | Post RESCHEDULE message after mutations |

## Success Criteria

1. With app closed and installed, dose notifications appear at the scheduled time ± 2 min
2. Notification shows 3 action buttons: Tomar, Saltar, Cancelar
3. Clicking an action button updates the dose status persistently (no need to open app)
4. Opening the app after actions reflect the updated statuses
5. Creating/editing/deleting a schedule triggers immediate reschedule in SW
