import { Clock, CheckCircle, XCircle, Ban } from 'lucide-react'
import type { DoseStatus } from '../types'

const config: Record<DoseStatus, { label: string; icon: typeof Clock; classes: string }> = {
  pending: { label: 'Pendiente', icon: Clock, classes: 'bg-warning-bg text-warning-text' },
  taken: { label: 'Tomada', icon: CheckCircle, classes: 'bg-success-bg text-success-text' },
  skipped: { label: 'Saltada', icon: XCircle, classes: 'bg-danger-bg text-danger-text' },
  cancelled: { label: 'Cancelada', icon: Ban, classes: 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300' },
  deleted: { label: 'Eliminada', icon: XCircle, classes: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
}

export function StatusBadge({ status }: { status: DoseStatus }) {
  const c = config[status]
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${c.classes}`}>
      <Icon className="w-3.5 h-3.5" />
      {c.label}
    </span>
  )
}
