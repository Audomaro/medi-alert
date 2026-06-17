import { create } from 'zustand'
import type { DoseSchedule, DoseWithDetails, DoseAction, Medication } from '../types'
import {
  getAllDoseSchedules,
  saveDoseSchedule,
  deleteDoseSchedule,
  getActiveSchedulesForDate,
  getDoseActionsByDate,
  saveDoseAction,
  deleteDoseAction,
  deleteDoseActionsBySchedule,
  getAllMedications,
  saveHiddenDoseInstance,
  getHiddenDoseInstanceIds,
} from '../db'

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

interface DoseScheduleState {
  doseSchedules: DoseSchedule[]
  doses: DoseWithDetails[]
  loadSchedules: () => Promise<void>
  loadDosesForDate: (date: string) => Promise<void>
  add: (s: DoseSchedule) => Promise<void>
  update: (s: DoseSchedule) => Promise<void>
  remove: (id: string) => Promise<void>
  updateDoseStatus: (
    instanceId: string,
    scheduleId: string,
    medicationId: string,
    scheduledDate: string,
    scheduledTime: string,
    doseLabel: string,
    status: 'taken' | 'skipped' | 'cancelled'
  ) => Promise<void>
  hideDosePermanently: (instanceId: string) => Promise<void>
}

export const useDoseScheduleStore = create<DoseScheduleState>((set) => ({
  doseSchedules: [],
  doses: [],
  loadSchedules: async () => {
    const schedules = await getAllDoseSchedules()
    set({ doseSchedules: schedules })
  },
  loadDosesForDate: async (date) => {
    const [schedules, actions, medications, hiddenIds] = await Promise.all([
      getActiveSchedulesForDate(date),
      getDoseActionsByDate(date),
      getAllMedications(),
      getHiddenDoseInstanceIds(),
    ])

    const actionMap = new Map<string, DoseAction>()
    for (const a of actions) actionMap.set(a.id, a)

    const medMap = new Map<string, Medication>()
    for (const m of medications) medMap.set(m.id, m)

    const result: DoseWithDetails[] = []

    for (const s of schedules) {
      if (!shouldGenerateForDate(s, date)) continue
      const med = medMap.get(s.medicationId)
      for (const dose of s.doses) {
        const instanceId = generateInstanceId(s.id, date, dose.time, dose.label)
        if (hiddenIds.has(instanceId)) continue
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
  },
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
  },
  hideDosePermanently: async (instanceId) => {
    await Promise.all([
      saveHiddenDoseInstance(instanceId),
      deleteDoseAction(instanceId),
    ])
    set((state) => ({
      doses: state.doses.filter((d) => d.id !== instanceId),
    }))
  },
}))
