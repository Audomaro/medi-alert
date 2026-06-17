import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import type { Medication } from '../types'

interface Props {
  medications: Medication[]
  selected: Medication | null
  onSelect: (m: Medication | null) => void
  onNext: () => void
}

export function Step1SelectMedication({ medications, selected, onSelect, onNext }: Props) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const filtered = medications.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h2 className="text-lg font-bold mb-3 text-text dark:text-white">Nuevo tratamiento</h2>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-medium text-gray-500 mb-2">Medicamento</p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar medicamento..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {filtered.map((m) => (
            <div key={m.id} onClick={() => onSelect(m)}
              className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                selected?.id === m.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: m.color || '#0891B2' }}>{m.name[0]}</div>
              <div>
                <div className="font-medium text-sm text-text dark:text-white">{m.name}</div>
                <div className="text-xs text-gray-400">{m.doseValue} {m.doseUnit}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => navigate('/medication/new')} className="w-full mt-2 p-3 rounded-xl text-primary font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-colors">
          + Agregar medicamento nuevo
        </button>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onNext} disabled={!selected} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200">
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
