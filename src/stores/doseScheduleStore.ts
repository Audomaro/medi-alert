import { create } from 'zustand'
import type { DoseSchedule, DoseWithDetails, DoseAction, Medication } from '../types'
import { shouldGenerateForDate, generateInstanceId } from '../utils/schedule'
import {
  getAllDoseSchedules,
  getDoseSchedule,
  saveDoseSchedule,
  deleteDoseSchedule,
  getActiveSchedulesForDate,
  getDoseActionsByDate,
  getDoseActionsBySchedule,
  saveDoseAction,
  deleteDoseAction,
  deleteDoseActionsBySchedule,
  getAllMedications,
} from '../db'

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
  deleteFutureDoses: (instanceId: string, scheduleId: string, scheduledDate: string, doseLabel: string, scheduledTime: string) => Promise<void>
  deleteDoseSlot: (instanceId: string, scheduleId: string, medicationId: string, scheduledDate: string, doseLabel: string, scheduledTime: string) => Promise<void>
}

export const useDoseScheduleStore = create<DoseScheduleState>((set) => ({
  doseSchedules: [],
  doses: [],
  loadSchedules: async () => {
    const schedules = await getAllDoseSchedules()
    set({ doseSchedules: schedules })
  },
  loadDosesForDate: async (date) => {
    const [schedules, actions, medications] = await Promise.all([
      getActiveSchedulesForDate(date),
      getDoseActionsByDate(date),
      getAllMedications(),
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
        const action = actionMap.get(instanceId)
        if (action?.status === 'deleted') continue
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
  deleteFutureDoses: async (instanceId, scheduleId, scheduledDate, doseLabel, scheduledTime) => {
    const s = await getDoseSchedule(scheduleId)
    if (!s) return

    // Clean up orphaned DoseActions for this dose label + time
    const actions = await getDoseActionsBySchedule(scheduleId)
    for (const a of actions) {
      if (a.doseLabel === doseLabel && a.scheduledTime === scheduledTime) await deleteDoseAction(a.id)
    }

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
}))
