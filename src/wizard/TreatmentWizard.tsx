import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMedicationStore } from '../stores/medicationStore'
import { useTreatmentStore } from '../stores/treatmentStore'
import { generateId } from '../utils/id'
import { Step1SelectMedication } from './Step1SelectMedication'
import { Step2DoseConfig } from './Step2DoseConfig'
import { Step3Frequency } from './Step3Frequency'
import { Step4Duration } from './Step4Duration'
import type { Medication, FrequencyType, Dose } from '../types'

type Step = 1 | 2 | 3 | 4

export function TreatmentWizard() {
  const { medications } = useMedicationStore()
  const { add: addTreatment } = useTreatmentStore()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>(1)
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)

  const [doseValue, setDoseValue] = useState<number>(0)
  const [doseUnit, setDoseUnit] = useState('')
  const [presentation, setPresentation] = useState(selectedMed?.presentation || 'pastilla')

  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [specificDays, setSpecificDays] = useState<number[]>([])
  const [intervalValue, setIntervalValue] = useState(1)
  const [doses, setDoses] = useState<Dose[]>([{ label: 'Dosis #1', time: '08:00', doseValue: 0, doseUnit: '' }])

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [indefinite, setIndefinite] = useState(true)

  const handleSave = async () => {
    if (!selectedMed) return
    await addTreatment({
      id: generateId(),
      medicationId: selectedMed.id,
      frequencyType,
      frequencyConfig: { type: frequencyType, timesPerDay, days: specificDays, interval: intervalValue },
      doses: doses.map((d) => ({ ...d, doseValue: doseValue || selectedMed.doseValue, doseUnit: doseUnit || selectedMed.doseUnit })),
      startDate,
      endDate: indefinite ? undefined : endDate || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    })
    navigate('/')
  }

  const next = () => setStep((step + 1) as Step)
  const prev = () => setStep((step - 1) as Step)

  switch (step) {
    case 1:
      return <Step1SelectMedication medications={medications} selected={selectedMed} onSelect={(m) => { setSelectedMed(m); if (m) { setDoseValue(m.doseValue); setDoseUnit(m.doseUnit); setPresentation(m.presentation) } }} onNext={next} />
    case 2:
      return <Step2DoseConfig doseValue={doseValue} setDoseValue={setDoseValue} doseUnit={doseUnit} setDoseUnit={setDoseUnit} presentation={presentation} setPresentation={setPresentation} onPrev={prev} onNext={next} medicationName={selectedMed?.name || ''} />
    case 3:
      return <Step3Frequency frequencyType={frequencyType} setFrequencyType={setFrequencyType} timesPerDay={timesPerDay} setTimesPerDay={setTimesPerDay} specificDays={specificDays} setSpecificDays={setSpecificDays} intervalValue={intervalValue} setIntervalValue={setIntervalValue} doseValue={doseValue || selectedMed?.doseValue || 0} doseUnit={doseUnit || selectedMed?.doseUnit || ''} presentation={presentation} doses={doses} setDoses={setDoses} onPrev={prev} onNext={next} />
    case 4:
      return <Step4Duration startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} indefinite={indefinite} setIndefinite={setIndefinite} onPrev={prev} onSave={handleSave} />
  }
}
