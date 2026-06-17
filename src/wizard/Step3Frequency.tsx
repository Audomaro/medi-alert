import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { FrequencyType, Dose } from '../types'

interface Props {
  frequencyType: FrequencyType; setFrequencyType: (v: FrequencyType) => void
  timesPerDay: number; setTimesPerDay: (v: number) => void
  specificDays: number[]; setSpecificDays: (v: number[]) => void
  intervalValue: number; setIntervalValue: (v: number) => void
  doseValue: number; doseUnit: string; presentation: string
  doses: Dose[]; setDoses: (v: Dose[]) => void
  onPrev: () => void; onNext: () => void
}

const freqOptions: { value: FrequencyType; label: string; icon: string }[] = [
  { value: 'daily', label: 'Cada día', icon: '📅' },
  { value: 'specific_days', label: 'Días específicos', icon: '📆' },
  { value: 'every_x_days', label: 'Cada X días', icon: '🔄' },
  { value: 'every_x_weeks', label: 'Cada X semanas', icon: '📆' },
  { value: 'every_x_months', label: 'Cada X meses', icon: '📅' },
  { value: 'as_needed', label: 'Según sea necesario', icon: '⚡' },
]

const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function Step3Frequency(props: Props) {
  const { frequencyType, setFrequencyType, timesPerDay, setTimesPerDay, specificDays, setSpecificDays, intervalValue, setIntervalValue, doseValue, doseUnit, doses, setDoses, onPrev, onNext } = props

  const updateDoseTime = (index: number, time: string) => {
    const next = [...doses]
    next[index] = { ...next[index], time }
    setDoses(next)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onPrev} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-text dark:text-white">Frecuencia</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {freqOptions.map((opt) => (
          <button key={opt.value} onClick={() => { setFrequencyType(opt.value); if (opt.value !== 'daily') setTimesPerDay(1) }}
            className={`w-full p-3 rounded-xl flex items-center gap-3 mb-1.5 cursor-pointer transition-all ${
              frequencyType === opt.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <span>{opt.icon}</span><span className="text-sm">{opt.label}</span>
          </button>
        ))}
      </div>

      {frequencyType === 'daily' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <label className="text-xs font-medium mb-3 block">Veces al día</label>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => {
                setTimesPerDay(n)
                setDoses(Array.from({ length: n }, (_, i) => ({ label: `Dosis #${i + 1}`, time: `${String(8 + i * 4).padStart(2, '0')}:00`, doseValue, doseUnit })))
              }}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  timesPerDay === n ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                }`}>{n} vez</button>
            ))}
            <input type="number" min={5} max={25} value={timesPerDay > 4 ? timesPerDay : ''} placeholder="N"
              onChange={(e) => {
                const n = Number(e.target.value)
                if (n >= 5 && n <= 25) { setTimesPerDay(n); setDoses(Array.from({ length: n }, (_, i) => ({ label: `Dosis #${i + 1}`, time: `${String(8 + Math.floor(i * 24 / n)).padStart(2, '0')}:00`, doseValue, doseUnit }))) }
              }}
              className="w-16 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
          </div>
          {doses.slice(0, timesPerDay).map((d, i) => (
            <div key={i} className="flex items-center gap-3 mb-2">
              <span className="text-xs font-medium w-16">{d.label}</span>
              <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              <span className="text-xs text-gray-400">{doseValue} {doseUnit}</span>
            </div>
          ))}
        </div>
      )}

      {frequencyType === 'specific_days' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <label className="text-xs font-medium mb-3 block">Selecciona los días</label>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayLabels.map((l, i) => (
              <button key={l} onClick={() => setSpecificDays(specificDays.includes(i) ? specificDays.filter((d) => d !== i) : [...specificDays, i])}
                className={`p-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                  specificDays.includes(i) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
                }`}>{l}</button>
            ))}
          </div>
          {doses.slice(0, 1).map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium">Dosis</span>
              <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              <span className="text-xs text-gray-400">{doseValue} {doseUnit}</span>
            </div>
          ))}
        </div>
      )}

      {(frequencyType === 'every_x_days' || frequencyType === 'every_x_weeks' || frequencyType === 'every_x_months') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <label className="text-xs font-medium mb-3 block">
            Cada <input type="number" min={1} max={frequencyType === 'every_x_months' ? 12 : frequencyType === 'every_x_weeks' ? 25 : 31}
              value={intervalValue} onChange={(e) => setIntervalValue(Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none text-center" />
            {' '}{{ every_x_days: 'días', every_x_weeks: 'semanas', every_x_months: 'meses' }[frequencyType]}
          </label>
          {doses.slice(0, 1).map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium">Dosis</span>
              <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              <span className="text-xs text-gray-400">{doseValue} {doseUnit}</span>
            </div>
          ))}
        </div>
      )}

      {frequencyType === 'as_needed' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-gray-500 text-center py-4">Sin alertas programadas. Tú marcas cuándo tomas la dosis.</p>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button onClick={onNext} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-primary/90 transition-all">
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
