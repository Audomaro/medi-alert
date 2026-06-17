import { useEffect, useRef } from 'react'
import { useTreatmentStore } from '../stores/treatmentStore'
import { getDoseLogsByDate, saveDoseLog } from '../db'
import { generateId } from '../utils/id'
import { todayISO } from '../utils/date'
import type { Treatment } from '../types'

function generateDoseLogsForTreatment(t: Treatment, date: string) {
  const logs: { treatmentId: string; medicationId: string; scheduledDate: string; scheduledTime: string; doseLabel: string; doseValue: number; doseUnit: string }[] = []
  const dateObj = new Date(date + 'T12:00:00')

  if (date < t.startDate) return logs
  if (t.endDate && date > t.endDate) return logs
  if (!t.active) return logs

  let shouldAdd = false
  switch (t.frequencyType) {
    case 'daily':
      shouldAdd = true
      break
    case 'specific_days':
      shouldAdd = t.frequencyConfig.days?.includes(dateObj.getDay()) ?? false
      break
    case 'every_x_days': {
      const diff = Math.floor((dateObj.getTime() - new Date(t.startDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
      shouldAdd = diff % (t.frequencyConfig.interval || 1) === 0
      break
    }
    case 'every_x_weeks': {
      const diffW = Math.floor((dateObj.getTime() - new Date(t.startDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 7))
      shouldAdd = diffW % (t.frequencyConfig.interval || 1) === 0
      break
    }
    case 'every_x_months': {
      const start = new Date(t.startDate + 'T12:00:00')
      const diffM = (dateObj.getFullYear() - start.getFullYear()) * 12 + dateObj.getMonth() - start.getMonth()
      shouldAdd = diffM % (t.frequencyConfig.interval || 1) === 0
      break
    }
    case 'as_needed':
      break
  }

  if (shouldAdd) {
    for (const dose of t.doses) {
      logs.push({
        treatmentId: t.id,
        medicationId: t.medicationId,
        scheduledDate: date,
        scheduledTime: dose.time,
        doseLabel: dose.label,
        doseValue: dose.doseValue,
        doseUnit: dose.doseUnit,
      })
    }
  }
  return logs
}

export function useDoseChecker() {
  const { treatments, loadDoseLogs } = useTreatmentStore()
  const checking = useRef(false)

  useEffect(() => {
    if (treatments.length === 0) return
    const check = async () => {
      if (checking.current) return
      checking.current = true
      try {
        const date = todayISO()
        const existing = await getDoseLogsByDate(date)
        const existingKeys = new Set(existing.map((l) => `${l.treatmentId}|${l.doseLabel}`))
        let added = false
        for (const t of treatments) {
          const newLogs = generateDoseLogsForTreatment(t, date)
          for (const log of newLogs) {
            const key = `${log.treatmentId}|${log.doseLabel}`
            if (!existingKeys.has(key)) {
              await saveDoseLog({ ...log, id: generateId(), status: 'pending' })
              added = true
            }
          }
        }
        if (added) loadDoseLogs(date)
      } finally {
        checking.current = false
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [treatments])
}
