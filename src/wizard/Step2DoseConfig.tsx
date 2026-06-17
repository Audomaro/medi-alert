import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Presentation } from '../types'

const presentations: { value: Presentation; label: string }[] = [
  { value: 'pastilla', label: 'Pastilla' }, { value: 'capsula', label: 'Cápsula' },
  { value: 'tableta', label: 'Tableta' }, { value: 'inyeccion', label: 'Inyección' },
  { value: 'solucion', label: 'Solución' }, { value: 'gotas', label: 'Gotas' },
  { value: 'inhalador', label: 'Inhalador' }, { value: 'otro', label: 'Otro' },
]

interface Props {
  doseValue: number; setDoseValue: (v: number) => void
  doseUnit: string; setDoseUnit: (v: string) => void
  presentation: Presentation; setPresentation: (v: Presentation) => void
  onPrev: () => void; onNext: () => void; medicationName: string
}

export function Step2DoseConfig({ doseValue, setDoseValue, doseUnit, setDoseUnit, presentation, setPresentation, onPrev, onNext, medicationName }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onPrev} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-text dark:text-white">{medicationName}</h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium mb-2 block">Presentación</label>
          <div className="grid grid-cols-4 gap-2">
            {presentations.map((p) => (
              <button key={p.value} onClick={() => setPresentation(p.value)}
                className={`py-2 px-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  presentation === p.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                }`}>{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block">Dosis por toma</label>
          <div className="flex gap-3 items-center">
            <input type="number" value={doseValue} onChange={(e) => setDoseValue(Number(e.target.value))}
              className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)}
              className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onNext} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-primary/90 transition-all">
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
