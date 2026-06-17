import { create } from 'zustand'
import type { Medication } from '../types'
import { getAllMedications, saveMedication, deleteMedication } from '../db'

interface MedicationState {
  medications: Medication[]
  load: () => Promise<void>
  add: (m: Medication) => Promise<void>
  update: (m: Medication) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useMedicationStore = create<MedicationState>((set) => ({
  medications: [],
  load: async () => {
    const meds = await getAllMedications()
    set({ medications: meds })
  },
  add: async (m) => {
    const toSave = { ...m, updatedAt: m.createdAt }
    await saveMedication(toSave)
    set((s) => ({ medications: [...s.medications, toSave] }))
  },
  update: async (m) => {
    const toSave = { ...m, updatedAt: new Date().toISOString() }
    await saveMedication(toSave)
    set((s) => ({ medications: s.medications.map((med) => (med.id === m.id ? toSave : med)) }))
  },
  remove: async (id) => {
    await deleteMedication(id)
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }))
  },
}))
