import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Pill, FlaskRound, Syringe, Wind, Droplets, Heart, Bone, Eye, Ear, Stethoscope } from 'lucide-react'
import { useMedicationStore } from '../stores/medicationStore'
import { generateId } from '../utils/id'
import type { Presentation } from '../types'
import type { FC } from 'react'

const presentations: { value: Presentation; label: string }[] = [
  { value: 'pastilla', label: 'Pastilla' },
  { value: 'capsula', label: 'Cápsula' },
  { value: 'tableta', label: 'Tableta' },
  { value: 'inyeccion', label: 'Inyección' },
  { value: 'solucion', label: 'Solución' },
  { value: 'gotas', label: 'Gotas' },
  { value: 'inhalador', label: 'Inhalador' },
  { value: 'otro', label: 'Otro' },
]

const iconOptions: { value: string; icon: FC<{ className?: string }> }[] = [
  { value: 'pill', icon: Pill },
  { value: 'flask', icon: FlaskRound },
  { value: 'syringe', icon: Syringe },
  { value: 'wind', icon: Wind },
  { value: 'droplets', icon: Droplets },
  { value: 'heart', icon: Heart },
  { value: 'bone', icon: Bone },
  { value: 'eye', icon: Eye },
  { value: 'ear', icon: Ear },
  { value: 'stethoscope', icon: Stethoscope },
]

const colors = ['#0891B2', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#F97316', '#14B8A6']

export function MedicationWizard() {
  const navigate = useNavigate()
  const { medications, add } = useMedicationStore()
  const [name, setName] = useState('')
  const [presentation, setPresentation] = useState<Presentation>('pastilla')
  const [doseValue, setDoseValue] = useState('500')
  const [doseUnit, setDoseUnit] = useState('mg')
  const [selectedIcon, setSelectedIcon] = useState<string | undefined>(undefined)
  const [color, setColor] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (medications.some((m) => m.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('Este medicamento ya existe')
      return
    }
    await add({
      id: generateId(),
      name: name.trim(),
      presentation,
      doseValue: Number(doseValue) || 0,
      doseUnit: doseUnit.trim(),
      icon: selectedIcon,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    navigate(-1)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5 text-text dark:text-white" /></button>
        <h1 className="text-lg font-bold text-text dark:text-white">Nuevo medicamento</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Nombre</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Nombre del medicamento" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          {error && <p className="text-xs text-danger-text mt-1">{error}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Presentación</label>
          <div className="grid grid-cols-4 gap-2">
            {presentations.map((p) => (
              <button key={p.value} onClick={() => setPresentation(p.value)}
                className={`py-2 px-1 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                  presentation === p.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Dosis</label>
            <input value={doseValue} onChange={(e) => setDoseValue(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Unidad</label>
            <input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Icono (opcional)</label>
          <div className="flex gap-2 flex-wrap">
            {iconOptions.map((opt) => {
              const Icon = opt.icon
              return (
                <button key={opt.value} onClick={() => setSelectedIcon(opt.value === selectedIcon ? undefined : opt.value)}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${
                    selectedIcon === opt.value ? 'bg-primary text-white ring-2 ring-primary/30' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}>
                  <Icon className="w-4 h-4" />
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Color (opcional)</label>
          <div className="flex gap-2 items-center flex-wrap">
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c === color ? undefined : c)}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all duration-200 ${c === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="w-full mt-6 py-3 rounded-xl bg-cta text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-cta/90 active:scale-[0.98] transition-all duration-200">
        <Check className="w-4 h-4" /> Guardar medicamento
      </button>
    </div>
  )
}
