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
