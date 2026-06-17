import { ArrowLeft, Check } from 'lucide-react'

interface Props {
  startDate: string; setStartDate: (v: string) => void
  endDate: string; setEndDate: (v: string) => void
  indefinite: boolean; setIndefinite: (v: boolean) => void
  onPrev: () => void; onSave: () => void
}

export function Step4Duration({ startDate, setStartDate, endDate, setEndDate, indefinite, setIndefinite, onPrev, onSave }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onPrev} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-text dark:text-white">Duración</h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block">Fecha de inicio</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block">¿Cuándo termina?</label>
          <div className="flex flex-col gap-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!indefinite} onChange={() => setIndefinite(false)} className="accent-primary" />
              <span className="text-sm">Fecha específica</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={indefinite} onChange={() => setIndefinite(true)} className="accent-primary" />
              <span className="text-sm">Indefinido (hasta que lo cancele)</span>
            </label>
          </div>
          {!indefinite && (
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          )}
        </div>
      </div>
      <button onClick={onSave} className="w-full mt-6 py-3 rounded-xl bg-cta text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-cta/90 active:scale-[0.98] transition-all">
        <Check className="w-4 h-4" /> Guardar tratamiento
      </button>
    </div>
  )
}
