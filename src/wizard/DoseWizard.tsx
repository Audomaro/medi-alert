import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Search } from 'lucide-react'
import { useMedicationStore } from '../stores/medicationStore'
import { useDoseScheduleStore } from '../stores/doseScheduleStore'
import { generateId } from '../utils/id'
import { todayISO } from '../utils/date'
import type { Medication, FrequencyType, DoseDefinition } from '../types'

type Step = 1 | 2 | 3

const freqOptions: { value: FrequencyType; label: string; icon: string }[] = [
  { value: 'daily', label: 'Cada día', icon: '📅' },
  { value: 'specific_days', label: 'Días específicos', icon: '📆' },
  { value: 'every_x_days', label: 'Cada X días', icon: '🔄' },
  { value: 'every_x_weeks', label: 'Cada X semanas', icon: '📆' },
  { value: 'every_x_months', label: 'Cada X meses', icon: '📅' },
  { value: 'as_needed', label: 'Según sea necesario', icon: '⚡' },
]

const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function DoseWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { medications } = useMedicationStore()
  const { doseSchedules, add: addSchedule, update: updateSchedule } = useDoseScheduleStore()
  const isEditing = !!id

  const [step, setStep] = useState<Step>(1)
  const [search, setSearch] = useState('')

  // Step 1: selected medication
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)

  // Step 2 state
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [specificDays, setSpecificDays] = useState<number[]>([])
  const [intervalValue, setIntervalValue] = useState(1)
  const [doses, setDoses] = useState<DoseDefinition[]>([{ label: 'Dosis #1', time: '08:00', doseValue: 0, doseUnit: '' }])

  // Step 3 state
  const [startDate, setStartDate] = useState(todayISO())
  const [endDate, setEndDate] = useState('')
  const [dateError, setDateError] = useState('')

  useEffect(() => {
    const { load: loadMeds } = useMedicationStore.getState()
    loadMeds()
  }, [])

  useEffect(() => {
    if (!isEditing || !id) return
    const s = doseSchedules.find((x) => x.id === id)
    if (!s) return
    const med = medications.find((m) => m.id === s.medicationId)
    if (med) setSelectedMed(med)
    setFrequencyType(s.frequencyType)
    setTimesPerDay(s.frequencyConfig.timesPerDay || 1)
    setSpecificDays(s.frequencyConfig.days || [])
    setIntervalValue(s.frequencyConfig.interval || 1)
    setDoses(s.doseDefinitions)
    setStartDate(s.startDate)
    setEndDate(s.endDate)
  }, [isEditing, id, doseSchedules, medications])

  const filtered = medications.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  const next = () => setStep((step + 1) as Step)
  const prev = () => setStep((step - 1) as Step)

  const updateDoseTime = (index: number, time: string) => {
    const next = [...doses]
    next[index] = { ...next[index], time }
    setDoses(next)
  }

  const dv = selectedMed?.doseValue || 0
  const du = selectedMed?.doseUnit || 'mg'

  const handleSave = async () => {
    if (!selectedMed) return
    if (!endDate) { setDateError('La fecha final es obligatoria'); return }
    if (endDate < startDate) { setDateError('La fecha final debe ser posterior a la inicial'); return }

    const schedule = {
      id: isEditing && id ? id : generateId(),
      medicationId: selectedMed.id,
      frequencyType,
      frequencyConfig: { timesPerDay, days: specificDays, interval: intervalValue },
      doseDefinitions: doses.map((d) => ({ ...d, doseValue: dv, doseUnit: du })),
      startDate,
      endDate,
      active: true,
      createdAt: isEditing
        ? (doseSchedules.find((s) => s.id === id)?.createdAt || new Date().toISOString())
        : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    if (isEditing) {
      await updateSchedule(schedule)
    } else {
      await addSchedule(schedule)
    }
    navigate('/')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5 text-text dark:text-white" /></button>
        <h1 className="text-lg font-bold text-text dark:text-white">
          {isEditing ? 'Editar dosis' : 'Nueva dosis'}
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-4">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${step >= s ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'}`} />
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-xs font-medium text-gray-500 mb-2">Medicamento</p>
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar medicamento..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
            {filtered.map((m) => (
              <div key={m.id} onClick={() => setSelectedMed(m)}
                className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                  selectedMed?.id === m.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: m.color || '#0891B2' }}>{m.name[0]}</div>
                <div>
                  <div className="font-medium text-sm text-text dark:text-white">{m.name}</div>
                  <div className="text-xs text-gray-400">{m.doseValue} {m.doseUnit}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/medication/new')} className="w-full mt-2 p-3 rounded-xl text-primary font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-colors">
            + Agregar medicamento nuevo
          </button>
          <div className="flex justify-end mt-4">
            <button onClick={next} disabled={!selectedMed} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
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
                    setDoses(Array.from({ length: n }, (_, i) => ({ label: `Dosis #${i + 1}`, time: `${String(8 + i * 4).padStart(2, '0')}:00`, doseValue: dv, doseUnit: du })))
                  }}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                      timesPerDay === n ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                    }`}>{n} vez</button>
                ))}
                <input type="number" min={5} max={25} value={timesPerDay > 4 ? timesPerDay : ''} placeholder="N"
                  onChange={(e) => {
                    const n = Number(e.target.value)
                    if (n >= 5 && n <= 25) { setTimesPerDay(n); setDoses(Array.from({ length: n }, (_, i) => ({ label: `Dosis #${i + 1}`, time: `${String(8 + Math.floor(i * 24 / n)).padStart(2, '0')}:00`, doseValue: dv, doseUnit: du }))) }
                  }}
                  className="w-16 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              </div>
              {doses.slice(0, timesPerDay).map((d, i) => (
                <div key={i} className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-medium w-16">{d.label}</span>
                  <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
                  <span className="text-xs text-gray-400">{dv} {du}</span>
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
                  <span className="text-xs text-gray-400">{dv} {du}</span>
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
                  <span className="text-xs text-gray-400">{dv} {du}</span>
                </div>
              ))}
            </div>
          )}

          {frequencyType === 'as_needed' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
              <p className="text-sm text-gray-500 text-center py-4">Sin alertas programadas. Tú marcas cuándo tomas la dosis.</p>
            </div>
          )}

          <div className="flex justify-between mt-4">
            <button onClick={prev} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Atrás
            </button>
            <button onClick={next} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-primary/90 transition-all">
              Siguiente <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium mb-1.5 block">Fecha de inicio</label>
              <input type="date" value={startDate} min={todayISO()} onChange={(e) => {
                setStartDate(e.target.value)
                if (endDate && e.target.value > endDate) setEndDate('')
                setDateError('')
              }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1.5 block">Fecha final</label>
              <input type="date" value={endDate} min={startDate} onChange={(e) => { setEndDate(e.target.value); setDateError('') }}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
              {dateError && <p className="text-xs text-danger-text mt-1">{dateError}</p>}
            </div>
          </div>

          <div className="flex justify-between mt-4">
            <button onClick={prev} className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
              <ArrowLeft className="w-4 h-4 inline mr-1" /> Atrás
            </button>
          </div>

          <button onClick={handleSave} className="w-full mt-6 py-3 rounded-xl bg-cta text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-cta/90 active:scale-[0.98] transition-all">
            <Check className="w-4 h-4" /> {isEditing ? 'Guardar cambios' : 'Guardar dosis'}
          </button>
        </div>
      )}
    </div>
  )
}
