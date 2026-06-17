import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Pill, FlaskRound, Syringe, Wind, Droplets, Heart, Bone, Eye, Ear, Stethoscope } from 'lucide-react'
import { useMedicationStore } from '../stores/medicationStore'
import type { Presentation } from '../types'

const iconMap: Record<Presentation, typeof Pill> = {
  pastilla: Pill, capsula: Pill, tableta: Pill, inyeccion: Syringe,
  solucion: FlaskRound, gotas: Droplets, inhalador: Wind, otro: Pill,
}

const medicationIconMap: Record<string, typeof Pill> = {
  pill: Pill, flask: FlaskRound, syringe: Syringe, wind: Wind,
  droplets: Droplets, heart: Heart, bone: Bone, eye: Eye,
  ear: Ear, stethoscope: Stethoscope,
}

export function MedicationsPage() {
  const navigate = useNavigate()
  const { medications, load } = useMedicationStore()
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const filtered = medications.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-text dark:text-white">Medicamentos</h1>
        <button onClick={() => navigate('/medication/new')} className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors duration-200">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar medicamento..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((m) => {
          const Icon = (m.icon && medicationIconMap[m.icon]) || iconMap[m.presentation]
          return (
            <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-md transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: m.color ? `${m.color}20` : '#E0F2FE' }}>
                <Icon className="w-5 h-5" style={{ color: m.color || '#0891B2' }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-text dark:text-white">{m.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{m.doseValue} {m.doseUnit} · {m.presentation}</div>
              </div>
              <Pencil className="w-4 h-4 text-primary cursor-pointer" onClick={() => navigate(`/medication/edit/${m.id}`)} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
