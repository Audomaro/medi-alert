import type { DoseStatus } from '../types'

const config: Record<DoseStatus, { label: string; classes: string }> = {
  pending: { label: 'Pendiente', classes: 'bg-warning-bg text-warning-text' },
  taken: { label: 'Tomada ✓', classes: 'bg-success-bg text-success-text' },
  skipped: { label: 'Saltada ✕', classes: 'bg-danger-bg text-danger-text' },
}

export function StatusBadge({ status }: { status: DoseStatus }) {
  const c = config[status]
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.classes}`}>
      {c.label}
    </span>
  )
}
