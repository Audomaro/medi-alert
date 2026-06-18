import { create } from 'zustand'
import type { DoseSchedule, DoseWithDetails } from '../types'
import { generateDoseInstances } from '../utils/generateInstances'
import {
  getAllDoseSchedules,
  saveDoseSchedule,
  deleteDoseSchedule,
  getActiveSchedulesForDate,
  getDoseInstancesByDate,
  saveDoseInstances,
  saveDoseInstance,
  deleteDoseInstance,
  deleteDoseInstancesBySchedule,
  getDoseInstance,
  getDoseInstancesBySchedule,
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
  updateDoseStatus: (instanceId: string, status: 'taken' | 'skipped' | 'cancelled') => Promise<void>
  deleteDoseSlot: (instanceId: string) => Promise<void>
  deleteFutureDoses: (scheduleId: string, fromDate: string, doseLabel: string, scheduledTime: string) => Promise<void>
}

export const useDoseScheduleStore = create<DoseScheduleState>((set) => ({
  doseSchedules: [],
  doses: [],
  loadSchedules: async () => {
    const schedules = await getAllDoseSchedules()
    set({ doseSchedules: schedules })
  },
  loadDosesForDate: async (date) => {
    const [instances, schedules, medications] = await Promise.all([
      getDoseInstancesByDate(date),
      getActiveSchedulesForDate(date),
      getAllMedications(),
    ])

    const activeScheduleIds = new Set(schedules.map((s) => s.id))
    const medMap = new Map(medications.map((m) => [m.id, m]))

    const result: DoseWithDetails[] = []
    for (const inst of instances) {
      if (!activeScheduleIds.has(inst.scheduleId)) continue
      const med = medMap.get(inst.medicationId)
      result.push({
        id: inst.id,
        scheduleId: inst.scheduleId,
        medicationId: inst.medicationId,
        scheduledDate: inst.scheduledDate,
        scheduledTime: inst.scheduledTime,
        doseLabel: inst.doseLabel,
        status: inst.status,
        takenAt: inst.takenAt,
        doseValue: inst.doseValue,
        doseUnit: inst.doseUnit,
        medicationName: med?.name || 'Desconocido',
        medicationIcon: med?.icon,
        medicationColor: med?.color,
        presentation: med?.presentation || 'otro',
      })
    }

    set({ doses: result })
  },
  add: async (s) => {
    await saveDoseSchedule(s)
    const instances = generateDoseInstances(s)
    await saveDoseInstances(instances)
    set((state) => ({ doseSchedules: [...state.doseSchedules, s] }))
  },
  update: async (s) => {
    await deleteDoseInstancesBySchedule(s.id)
    await saveDoseSchedule(s)
    const instances = generateDoseInstances(s)
    await saveDoseInstances(instances)
    set((state) => ({
      doseSchedules: state.doseSchedules.map((x) => (x.id === s.id ? s : x)),
    }))
  },
  remove: async (id) => {
    await deleteDoseInstancesBySchedule(id)
    await deleteDoseSchedule(id)
    set((state) => ({
      doseSchedules: state.doseSchedules.filter((x) => x.id !== id),
      doses: state.doses.filter((d) => d.scheduleId !== id),
    }))
  },
  updateDoseStatus: async (instanceId, status) => {
    const instance = await getDoseInstance(instanceId)
    if (!instance) return
    instance.status = status
    instance.takenAt = status === 'taken' ? new Date().toISOString() : undefined
    instance.updatedAt = new Date().toISOString()
    await saveDoseInstance(instance)
    set((state) => ({
      doses: state.doses.map((d) =>
        d.id === instanceId ? { ...d, status, takenAt: instance.takenAt } : d
      ),
    }))
  },
  deleteDoseSlot: async (instanceId) => {
    await deleteDoseInstance(instanceId)
    set((state) => ({
      doses: state.doses.filter((d) => d.id !== instanceId),
    }))
  },
  deleteFutureDoses: async (scheduleId, fromDate, doseLabel, scheduledTime) => {
    const instances = await getDoseInstancesBySchedule(scheduleId)
    const toDelete = instances.filter(
      (i) =>
        i.doseLabel === doseLabel &&
        i.scheduledTime === scheduledTime &&
        i.scheduledDate >= fromDate
    )

    const idsToDelete = new Set(toDelete.map((i) => i.id))
    for (const inst of toDelete) {
      await deleteDoseInstance(inst.id)
    }
    set((state) => ({
      doses: state.doses.filter((d) => !idsToDelete.has(d.id)),
    }))
  },
}))
