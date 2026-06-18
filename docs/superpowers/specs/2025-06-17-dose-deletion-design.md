# Design: Eliminación de Dosis — Tres Opciones

**Date:** 2025-06-17
**Status:** Approved

---

## Overview

Implementar tres opciones de eliminación para cada dosis generada en el calendario:

1. **"Solo esta"** — Oculta solo la instancia del día seleccionado.
2. **"Esta y futuras"** — Elimina la dosis desde el día seleccionado en adelante.
3. **"Todas"** — Elimina todo el schedule de dosis y su historial.

**Restricción clave:** Ninguna opción elimina el `Medicamento` asociado. Solo afecta `DoseSchedule` y `DoseAction`.

---

## 1. "Solo esta"

### Behavior
- La dosis seleccionada desaparece de la lista del día actual.
- Dosis pasadas y futuras de la misma hora/label siguen existiendo.
- El `DoseSchedule` no se modifica.

### Implementation
- Crear una `DoseAction` con `status: 'deleted'` para esa `instanceId`.
- En `loadDosesForDate`, filtrar instancias cuya action sea `'deleted'`.
- No se crea ninguna tabla nueva; todo vive en `dose_actions`.

### Data changes
- `dose_actions` ← nueva entrada con `status: 'deleted'`
- `dose_schedules` ← sin cambios
- `medications` ← sin cambios

---

## 2. "Esta y futuras"

### Behavior
- La dosis seleccionada y todas las futuras de la misma hora/label desaparecen.
- Dosis pasadas (tomadas, saltadas o pendientes) se mantienen.
- El `Medicamento` sigue existiendo.

### Implementation
- Modificar el `DoseSchedule`:
  - Remover la `dose` específica (match por `label` + `time`) del array `doses`.
  - Ajustar `endDate` al día anterior a la fecha seleccionada.
  - Guardar el schedule actualizado.
- Si era la última `dose` del schedule, eliminar el `DoseSchedule` completo (pero no el `Medicamento`).

### Data changes
- `dose_schedules` ← modificado (o eliminado si era última dose)
- `dose_actions` ← sin cambios (las acciones pasadas se conservan)
- `medications` ← sin cambios

---

## 3. "Todas"

### Behavior
- Elimina todo el `DoseSchedule` de dosis y todo su historial de acciones.
- El `Medicamento` asociado sigue existiendo.

### Implementation
- Eliminar el `DoseSchedule` de `dose_schedules`.
- Eliminar todas las `DoseAction` asociadas a ese `scheduleId` de `dose_actions`.
- El `Medicamento` en `medications` no se toca.

### Data changes
- `dose_schedules` ← eliminado
- `dose_actions` ← eliminadas todas las del `scheduleId`
- `medications` ← sin cambios

---

## State Mutation Summary

| Opción | `medications` | `dose_schedules` | `dose_actions` |
|--------|--------------|------------------|----------------|
| Solo esta | Conservado | Sin cambios | Nueva entrada `'deleted'` |
| Esta y futuras | Conservado | Modificado (o eliminado si última dose) | Conservadas las pasadas |
| Todas | Conservado | Eliminado | Eliminadas todas |

---

## Type Changes

- `DoseStatus` debe incluir `'deleted'` como valor válido.

## UI Behavior

- El modal de eliminación muestra las 3 opciones como botones.
- Después de eliminar, la lista de dosis del día se recarga.
- Si no quedan dosis para el día, se muestra el estado vacío.

## Testing Strategy

- Test unitarios para cada opción en la store:
  - Verificar estado local después de cada operación.
  - Verificar llamadas a funciones de DB correctas.
  - Verificar que otras dosis del mismo schedule no se vean afectadas (regresión del bug anterior).

---

## Open Questions

None. Design approved.
