import { useState } from 'react'
import { Plus, Pill, CalendarPlus } from 'lucide-react'

interface Props {
  onAddTreatment: () => void
  onAddMedication: () => void
}

export function FabMenu({ onAddTreatment, onAddMedication }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-24 right-6 flex flex-col items-end gap-3 z-50">
      {open && (
        <>
          <button
            onClick={() => { onAddTreatment(); setOpen(false) }}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-text dark:text-white px-4 py-2.5 rounded-xl shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium"
          >
            <CalendarPlus className="w-4 h-4 text-primary" /> Agregar tratamiento
          </button>
          <button
            onClick={() => { onAddMedication(); setOpen(false) }}
            className="flex items-center gap-2 bg-white dark:bg-gray-800 text-text dark:text-white px-4 py-2.5 rounded-xl shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium"
          >
            <Pill className="w-4 h-4 text-primary" /> Agregar medicamento
          </button>
        </>
      )}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 cursor-pointer hover:bg-primary/90 active:scale-95 transition-all duration-200"
      >
        <Plus className={`w-7 h-7 transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
      </button>
    </div>
  )
}
