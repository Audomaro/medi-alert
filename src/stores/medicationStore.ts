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
    await saveMedication(m)
    set((s) => ({ medications: [...s.medications, m] }))
  },
  update: async (m) => {
    await saveMedication(m)
    set((s) => ({ medications: s.medications.map((med) => (med.id === m.id ? m : med)) }))
  },
  remove: async (id) => {
    await deleteMedication(id)
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }))
  },
}))
