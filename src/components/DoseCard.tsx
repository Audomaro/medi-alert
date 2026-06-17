import { useState, useRef, useEffect } from 'react'
import { Pill, FlaskRound, Syringe, Wind, Droplets, Heart, Bone, Eye, Ear, Stethoscope, MoreVertical, Check, X, Ban, Trash2 } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatTime24to12 } from '../utils/date'
import type { Presentation, DoseStatus } from '../types'

const iconMap: Record<Presentation, typeof Pill> = {
  pastilla: Pill, capsula: Pill, tableta: Pill, inyeccion: Syringe,
  solucion: FlaskRound, gotas: Droplets, inhalador: Wind, otro: Pill,
}

const medicationIconMap: Record<string, typeof Pill> = {
  pill: Pill, flask: FlaskRound, syringe: Syringe, wind: Wind,
  droplets: Droplets, heart: Heart, bone: Bone, eye: Eye,
  ear: Ear, stethoscope: Stethoscope,
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
  onMarkTaken: () => void
  onMarkSkipped: () => void
  onMarkCancelled: () => void
  onDelete: () => void
}

const menuActions = [
  { key: 'taken', label: 'Marcar tomada', icon: Check, color: 'text-success-text' },
  { key: 'skipped', label: 'Saltar dosis', icon: X, color: 'text-danger-text' },
  { key: 'cancelled', label: 'Cancelar dosis', icon: Ban, color: 'text-gray-500' },
] as const

export function DoseCard({ time, medicationName, doseValue, doseUnit, presentation, icon, status, color, onMarkTaken, onMarkSkipped, onMarkCancelled, onDelete }: Props) {
  const Icon = (icon && medicationIconMap[icon]) || iconMap[presentation] || Pill
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handlers: Record<string, () => void> = {
    taken: onMarkTaken,
    skipped: onMarkSkipped,
    cancelled: onMarkCancelled,
  }

  const isPending = status === 'pending'

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
        <div className="flex flex-col items-end gap-2 relative">
          <StatusBadge status={status} />
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-text/60 dark:text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 rounded-xl shadow-lg border border-gray-100 dark:border-gray-600 py-1 min-w-44 z-50">
                {isPending && menuActions.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => { handlers[action.key](); setMenuOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <action.icon className={`w-4 h-4 ${action.color}`} />
                    <span className="text-text dark:text-white">{action.label}</span>
                  </button>
                ))}
                {!isPending && (
                  <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">
                    {status === 'taken' ? 'Dosis completada' : status === 'skipped' ? 'Dosis saltada' : 'Dosis cancelada'}
                  </div>
                )}
                <hr className="border-gray-100 dark:border-gray-600" />
                <button
                  onClick={() => { onDelete(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">Eliminar dosis</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
