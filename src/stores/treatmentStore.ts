import { create } from 'zustand'
import type { Treatment, DoseLog } from '../types'
import {
  getAllTreatments,
  saveTreatment,
  deleteTreatment,
  getDoseLogsByDate,
} from '../db'

interface TreatmentState {
  treatments: Treatment[]
  doseLogs: DoseLog[]
  loadTreatments: () => Promise<void>
  loadDoseLogs: (date: string) => Promise<void>
  add: (t: Treatment) => Promise<void>
  update: (t: Treatment) => Promise<void>
  remove: (id: string) => Promise<void>
  updateDoseStatus: (id: string, status: 'taken' | 'skipped' | 'cancelled') => Promise<void>
  removeDoseLog: (id: string) => Promise<void>
}

export const useTreatmentStore = create<TreatmentState>((set) => ({
  treatments: [],
  doseLogs: [],
  loadTreatments: async () => {
    const ts = await getAllTreatments()
    set({ treatments: ts })
  },
  loadDoseLogs: async (date) => {
    const logs = await getDoseLogsByDate(date)
    set({ doseLogs: logs })
  },
  add: async (t) => {
    await saveTreatment(t)
    set((s) => ({ treatments: [...s.treatments, t] }))
  },
  update: async (t) => {
    await saveTreatment(t)
    set((s) => ({ treatments: s.treatments.map((x) => (x.id === t.id ? t : x)) }))
  },
  remove: async (id) => {
    await deleteTreatment(id)
    set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) }))
  },
  removeDoseLog: async (id) => {
    const { deleteDoseLog } = await import('../db')
    await deleteDoseLog(id)
    set((s) => ({ doseLogs: s.doseLogs.filter((l) => l.id !== id) }))
  },
  updateDoseStatus: async (id, status) => {
    const { updateDoseLogStatus } = await import('../db')
    await updateDoseLogStatus(id, status)
    set((s) => ({
      doseLogs: s.doseLogs.map((l) =>
        l.id === id
          ? { ...l, status, takenAt: status === 'taken' ? new Date().toISOString() : undefined }
          : l
      ),
    }))
  },
}))
