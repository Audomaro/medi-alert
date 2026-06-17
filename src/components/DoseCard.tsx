import { Pill, FlaskRound, Syringe, Wind, Droplets } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatTime24to12 } from '../utils/date'
import type { Presentation, DoseStatus } from '../types'

const iconMap: Record<Presentation, typeof Pill> = {
  pastilla: Pill, capsula: Pill, tableta: Pill, inyeccion: Syringe,
  solucion: FlaskRound, gotas: Droplets, inhalador: Wind, otro: Pill,
}

interface Props {
  time: string
  medicationName: string
  doseValue: number
  doseUnit: string
  presentation: Presentation
  status: DoseStatus
  icon?: string
  color?: string
  onMark: () => void
}

export function DoseCard({ time, medicationName, doseValue, doseUnit, presentation, status, color, onMark }: Props) {
  const Icon = iconMap[presentation] || Pill
  const isDone = status !== 'pending'
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="text-xs font-semibold" style={{ color: color || 'var(--color-primary)' }}>
            {formatTime24to12(time)}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color ? `${color}20` : '#E0F2FE', color: color || 'var(--color-primary)' }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-text dark:text-white">{medicationName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {presentation === 'gotas' ? `Aplicar ${doseValue} gotas` : `Tomar ${doseValue} ${doseUnit}`}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={status} />
          <button
            onClick={onMark}
            disabled={isDone}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isDone
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 active:scale-95'
            }`}
          >
            {isDone ? 'Completada' : 'Marcar dosis'}
          </button>
        </div>
      </div>
    </div>
  )
}
