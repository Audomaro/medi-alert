import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { WeekCalendar } from '../components/WeekCalendar'
import { DoseCard } from '../components/DoseCard'
import { FabMenu } from '../components/FabMenu'
import { ThemeToggle } from '../components/ThemeToggle'
import { useMedicationStore } from '../stores/medicationStore'
import { useTreatmentStore } from '../stores/treatmentStore'
import { todayISO, formatDateDisplay } from '../utils/date'
import { useDoseChecker } from '../hooks/useDoseChecker'
import type { DoseWithDetails } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const { treatments, doseLogs, loadTreatments, loadDoseLogs, updateDoseStatus, removeDoseLog } = useTreatmentStore()
  const { medications, load: loadMeds } = useMedicationStore()
  const [selectedDate, setSelectedDate] = useState(todayISO())

  useEffect(() => {
    loadTreatments()
    loadMeds()
  }, [])

  useEffect(() => {
    loadDoseLogs(selectedDate)
  }, [selectedDate, treatments.length])

  useDoseChecker()

  const dosesWithDetails: DoseWithDetails[] = doseLogs.map((log) => {
    const med = medications.find((m) => m.id === log.medicationId)
    return {
      ...log,
      medicationName: med?.name || 'Desconocido',
      medicationIcon: med?.icon,
      medicationColor: med?.color,
      presentation: med?.presentation || 'otro',
    }
  })

  const sortedDoses = [...dosesWithDetails].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  const pendingCount = doseLogs.filter((l) => l.status === 'pending').length

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
    if (treatments.length === 0 || doseLogs.length === 0) return
    const checkUpcoming = setInterval(() => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const pendingDoses = doseLogs.filter((l) =>
        l.status === 'pending' &&
        l.scheduledDate === selectedDate &&
        l.scheduledTime === currentTime
      )
      for (const dose of pendingDoses) {
        const med = medications.find((m) => m.id === dose.medicationId)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Medi-alert', {
            body: `Es hora de tomar ${med?.name || 'tu medicamento'}`,
            icon: '/icons/192.png',
          })
        }
      }
    }, 30000)
    return () => clearInterval(checkUpcoming)
  }, [treatments, doseLogs, medications, selectedDate])

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
            <p className="text-sm">Selecciona otro día o agrega un tratamiento</p>
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
            status={dose.status}
            color={dose.medicationColor}
            onMarkTaken={() => updateDoseStatus(dose.id, 'taken')}
            onMarkSkipped={() => updateDoseStatus(dose.id, 'skipped')}
            onMarkCancelled={() => updateDoseStatus(dose.id, 'cancelled')}
            onDelete={() => removeDoseLog(dose.id)}
          />
        ))}
      </div>

      <FabMenu onAddTreatment={() => navigate('/treatment/new')} onAddMedication={() => navigate('/medication/new')} />
    </div>
  )
}
