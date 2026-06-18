import { useState } from 'react'
import { Bell, Palette, Info, Trash2 } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { useMedicationStore } from '../stores/medicationStore'
import { useDoseScheduleStore } from '../stores/doseScheduleStore'
import packageJson from '../../package.json'
import { todayISO } from '../utils/date'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function MorePage() {
  const { dark, toggle } = useThemeStore()
  const { load: loadMeds } = useMedicationStore()
  const { loadDosesForDate } = useDoseScheduleStore()
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteAll = async () => {
    setDeleting(true)
    try {
      const { deleteAllData } = await import('../db')
      await deleteAllData()
      await Promise.all([loadMeds(), loadDosesForDate(todayISO())])
      setShowConfirm(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text dark:text-white mb-6">Más</h1>

      <div className="flex flex-col gap-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <button onClick={toggle} className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Palette className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-text dark:text-white text-sm">Tema oscuro</div>
              <div className="text-xs text-gray-400">{dark ? 'Activado' : 'Desactivado'}</div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors ${dark ? 'bg-primary' : 'bg-gray-300'} relative`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${dark ? 'translate-x-5.5' : 'translate-x-0.5'} `} />
            </div>
          </button>

          <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-text dark:text-white text-sm">Notificaciones</div>
              <div className="text-xs text-gray-400">Activadas</div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 border-t border-gray-100 dark:border-gray-700">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-text dark:text-white text-sm">Versión</div>
              <div className="text-xs text-gray-400">{packageJson.version}</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.06)] mt-2">
          <button onClick={() => setShowConfirm(true)} className="w-full flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-2xl">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 text-left">
              <div className="font-medium text-red-600 dark:text-red-400 text-sm">Eliminar todos los datos</div>
              <div className="text-xs text-gray-400">Borra medicamentos, tratamientos e historial</div>
            </div>
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showConfirm}
        title="Eliminar todos los datos"
        message="Esta acción eliminará todos los medicamentos, tratamientos e historial de dosis. Esta acción no se puede deshacer."
        confirmLabel={deleting ? 'Eliminando...' : 'Sí, eliminar todo'}
        danger
        onConfirm={handleDeleteAll}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
