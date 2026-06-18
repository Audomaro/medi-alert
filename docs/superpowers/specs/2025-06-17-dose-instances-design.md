# Design: Nueva estructura de BD — Dose Instances Pre-generadas

**Date:** 2025-06-17
**Status:** Approved

---

## Problem Statement

El sistema actual genera dosis dinámicamente en memoria a partir de `DoseSchedule`. Esto causa bugs cuando se intenta eliminar:

- **"Solo esta"** requiere guardar una acción `'deleted'` para que no se regenere al recargar
- **"Esta y futuras"** modifica el schedule (`endDate` + quita la dose del array), lo que afecta **todas las fechas** pasadas también porque la dose ya no existe en el schedule
- No hay forma de que una dosis a las 5pm desaparezca desde el 18 en adelante, pero una dosis a las 10pm del mismo medicamento siga existiendo

## Solution: Pre-generar todas las dosis en tabla `dose_instances`

Al crear o modificar un `DoseSchedule`, se generan **todas las dosis individuales** dentro del rango `[startDate, endDate]` según la frecuencia. Cada dosis es una fila real en IndexedDB.

---

## Database Schema

### `medications` (sin cambios)

### `dose_schedules` — Configuración del horario

```typescript
interface DoseSchedule {
  id: string
  medicationId: string
  frequencyType: FrequencyType
  frequencyConfig: FrequencyConfig
  doseDefinitions: DoseDefinition[]  // renombrado desde 'doses'
  startDate: string         // YYYY-MM-DD
  endDate: string           // YYYY-MM-DD
  active: boolean
  createdAt: string
  updatedAt: string
}
```

**Note:** `doseDefinitions` solo define la configuración de cada dosis (label, time, doseValue, doseUnit). Las instancias reales viven en `dose_instances`.

### `dose_instances` — Cada dosis individual generada

```typescript
interface DoseInstance {
  id: string              // scheduleId|date|time|label
  scheduleId: string
  medicationId: string
  scheduledDate: string   // YYYY-MM-DD
  scheduledTime: string   // HH:mm
  doseLabel: string
  doseValue: number
  doseUnit: string
  status: 'pending' | 'taken' | 'skipped' | 'cancelled' | 'deleted'
  takenAt?: string
  createdAt: string
  updatedAt: string
}
```

**Indexes:**
- Primary key: `id`
- Index `date`: `scheduledDate`
- Index `schedule`: `scheduleId`

### `dose_actions` — DEPRECATED / ELIMINAR

Con la nueva estructura, `dose_actions` ya no es necesario. El `status` vive directamente en `dose_instances`.

**Migration:** Al actualizar a esta versión, las acciones existentes en `dose_actions` se migran a `dose_instances` (actualizando el campo `status` y `takenAt`).

---

## Operations

### Crear un schedule

1. Guardar `DoseSchedule` en `dose_schedules`
2. Generar todas las dosis en el rango `[startDate, endDate]` según `frequencyType`
3. Guardar cada dosis como `DoseInstance` en `dose_instances`

### Cargar dosis de un día

```typescript
async function getDoseInstancesByDate(date: string): Promise<DoseInstance[]> {
  const db = await getDB()
  return db.getAllFromIndex('dose_instances', 'date', date)
}
```

Join con `medications` para obtener nombre, icono, color.

### "Solo esta"

```typescript
async function deleteSingleDose(instanceId: string): Promise<void> {
  const db = await getDB()
  await db.delete('dose_instances', instanceId)
}
```

**Real DELETE.** La dosis desaparece completamente de la BD.

### "Esta y futuras"

```typescript
async function deleteFutureDoses(scheduleId: string, doseLabel: string, scheduledTime: string, fromDate: string): Promise<void> {
  const db = await getDB()
  const all = await db.getAllFromIndex('dose_instances', 'schedule', scheduleId)
  const toDelete = all.filter(
    (d) => d.doseLabel === doseLabel && d.scheduledTime === scheduledTime && d.scheduledDate >= fromDate
  )
  const tx = db.transaction('dose_instances', 'readwrite')
  for (const d of toDelete) {
    tx.store.delete(d.id)
  }
  await tx.done
}
```

**Real DELETE.** Solo afecta esa `label` + `time` de ese `scheduleId`, desde la fecha indicada en adelante.

### "Todas"

```typescript
async function deleteAllDoses(scheduleId: string): Promise<void> {
  const db = await getDB()
  const all = await db.getAllFromIndex('dose_instances', 'schedule', scheduleId)
  const tx = db.transaction('dose_instances', 'readwrite')
  for (const d of all) {
    tx.store.delete(d.id)
  }
  await tx.done
  await db.delete('dose_schedules', scheduleId)
}
```

**Real DELETE.** Borra todas las instancias del schedule, luego borra el schedule.

### Actualizar estado (Tomar, Saltar, Cancelar)

```typescript
async function updateDoseStatus(instanceId: string, status: 'taken' | 'skipped' | 'cancelled'): Promise<void> {
  const db = await getDB()
  const instance = await db.get('dose_instances', instanceId)
  if (!instance) return
  instance.status = status
  instance.takenAt = status === 'taken' ? new Date().toISOString() : undefined
  instance.updatedAt = new Date().toISOString()
  await db.put('dose_instances', instance)
}
```

---

## State Mutation Summary (Nueva Estructura)

| Opción | `medications` | `dose_schedules` | `dose_instances` |
|--------|--------------|------------------|------------------|
| Solo esta | Conservado | Sin cambios | DELETE de 1 fila |
| Esta y futuras | Conservado | Sin cambios | DELETE de múltiples filas (mismo label+time, desde fecha) |
| Todas | Conservado | DELETE | DELETE de todas las filas del schedule |

**Nunca se toca `medications`.**

---

## Key Invariants

1. **Una `DoseInstance` existe si y solo si fue generada por un `DoseSchedule` activo y no ha sido eliminada.**
2. **"Solo esta" elimina una fila. "Esta y futuras" elimina un rango de filas. "Todas" elimina todas las filas del schedule.**
3. **Dos dosis del mismo schedule con diferentes horarios (ej: 5pm y 10pm) son filas completamente independientes.** Eliminar "Esta y futuras" de la de 5pm no afecta la de 10pm.
4. **Dos medicamentos diferentes tienen `scheduleId` diferentes** → sus dosis están en conjuntos disjuntos de filas.

---

## Edge Cases

### Editar un schedule existente

Si el usuario edita un schedule (cambia horarios, frecuencia, rango de fechas):

1. Recalcular qué dosis deberían existir en el nuevo rango
2. Para dosis que ya existen y siguen siendo válidas → conservar (preservar status `taken`/`skipped`/`cancelled`)
3. Para dosis nuevas → crear con `status: 'pending'`
4. Para dosis que ya no aplican → eliminar

### Schedule con fecha fin lejana

Si `endDate` está a 6 meses, se generan ~180 días × N dosis por día. Para 2 dosis/día = ~360 filas. Manejable.

---

## Migration Path (from current schema v7)

1. **DB_VERSION = 8**
2. Crear tabla `dose_instances` con indexes
3. Para cada `DoseSchedule` existente:
   - Generar todas las dosis en su rango
   - Para cada dosis, buscar si existe una `DoseAction` → migrar `status` y `takenAt`
   - Guardar en `dose_instances`
4. Eliminar tabla `dose_actions` (o mantener para referencia, deprecar en v9)

---

## Testing Strategy

- Test unitarios para generación de dosis desde schedule
- Test para cada opción de eliminación verificando que solo afecta las filas correctas
- Test para verificar que otras dosis del mismo día (diferente hora) no se ven afectadas
- Test para verificar que otros schedules (otros medicamentos) no se ven afectados

---

## Open Questions

None. Design approved.
