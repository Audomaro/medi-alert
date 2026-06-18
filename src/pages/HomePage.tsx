import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { WeekCalendar } from '../components/WeekCalendar'
import { DoseCard } from '../components/DoseCard'
import { FabMenu } from '../components/FabMenu'
import { ThemeToggle } from '../components/ThemeToggle'
import { useDoseScheduleStore } from '../stores/doseScheduleStore'
import { todayISO, formatDateDisplay } from '../utils/date'

export function HomePage() {
  const navigate = useNavigate()
  const { doses, loadDosesForDate, updateDoseStatus, hideDosePermanently } = useDoseScheduleStore()
  const [selectedDate, setSelectedDate] = useState(todayISO())

  useEffect(() => {
    loadDosesForDate(selectedDate)
  }, [selectedDate])

  const sortedDoses = [...doses].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  const pendingCount = doses.filter((d) => d.status === 'pending').length

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if ('setAppBadge' in navigator) {
      navigator.setAppBadge(pendingCount).catch(() => {})
    }
  }, [pendingCount])

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'DOSE_ACTION') return
      const { action, doseId, scheduleId, medicationId, scheduledDate, scheduledTime, doseLabel } = event.data
      if (action === 'delete') {
        hideDosePermanently(doseId)
      } else {
        updateDoseStatus(doseId, scheduleId, medicationId, scheduledDate, scheduledTime, doseLabel, action)
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, [])

  useEffect(() => {
    if (doses.length === 0) return
    const checkUpcoming = setInterval(() => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const pendingDoses = doses.filter((d) =>
        d.status === 'pending' &&
        d.scheduledDate === selectedDate &&
        d.scheduledTime === currentTime
      )
      for (const dose of pendingDoses) {
        if ('Notification' in window && Notification.permission === 'granted') {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification('Medi-alert', {
              body: `Es hora de tomar ${dose.medicationName || 'tu medicamento'}`,
              icon: '/icons/192.png',
              tag: dose.id,
              actions: [
                { action: 'taken', title: 'Tomar' },
                { action: 'skipped', title: 'Saltar' },
                { action: 'cancelled', title: 'Cancelar' },
                { action: 'delete', title: 'Eliminar' },
              ],
              data: {
                doseId: dose.id,
                scheduleId: dose.scheduleId,
                medicationId: dose.medicationId,
                scheduledDate: dose.scheduledDate,
                scheduledTime: dose.scheduledTime,
                doseLabel: dose.doseLabel,
              },
            } as any)
          })
        }
      }
    }, 30000)
    return () => clearInterval(checkUpcoming)
  }, [doses, selectedDate])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-text dark:text-white">Medi-alert</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer">
            <Bell className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      <WeekCalendar selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 mb-5">
        {formatDateDisplay(selectedDate)}
      </p>

      <div className="flex flex-col gap-3">
        {sortedDoses.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <p className="text-lg font-medium mb-1">Sin dosis este día</p>
            <p className="text-sm">Selecciona otro día o agrega una dosis</p>
          </div>
        )}
        {sortedDoses.map((dose) => (
          <DoseCard
            key={dose.id}
            time={dose.scheduledTime}
            medicationName={dose.medicationName}
            doseValue={dose.doseValue}
            doseUnit={dose.doseUnit}
            presentation={dose.presentation}
            icon={dose.medicationIcon}
            status={dose.status}
            color={dose.medicationColor}
            onMarkTaken={() => updateDoseStatus(dose.id, dose.scheduleId, dose.medicationId, dose.scheduledDate, dose.scheduledTime, dose.doseLabel, 'taken')}
            onMarkSkipped={() => updateDoseStatus(dose.id, dose.scheduleId, dose.medicationId, dose.scheduledDate, dose.scheduledTime, dose.doseLabel, 'skipped')}
            onMarkCancelled={() => updateDoseStatus(dose.id, dose.scheduleId, dose.medicationId, dose.scheduledDate, dose.scheduledTime, dose.doseLabel, 'cancelled')}
            onDelete={() => hideDosePermanently(dose.id)}
          />
        ))}
      </div>

      <FabMenu onAddDose={() => navigate('/dose/new')} />
    </div>
  )
}
