import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMedicationStore } from '../stores/medicationStore'
import { useTreatmentStore } from '../stores/treatmentStore'
import { generateId } from '../utils/id'
import { Step1SelectMedication } from './Step1SelectMedication'
import { Step2DoseConfig } from './Step2DoseConfig'
import { Step3Frequency } from './Step3Frequency'
import { Step4Duration } from './Step4Duration'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Medication, FrequencyType, Dose } from '../types'

type Step = 1 | 2 | 3 | 4

export function TreatmentWizard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { medications } = useMedicationStore()
  const { treatments, add: addTreatment, update: updateTreatment } = useTreatmentStore()
  const isEditing = !!id

  const [step, setStep] = useState<Step>(1)
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)

  const [doseValue, setDoseValue] = useState<number>(0)
  const [doseUnit, setDoseUnit] = useState('')
  const [presentation, setPresentation] = useState<string>('pastilla')

  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [specificDays, setSpecificDays] = useState<number[]>([])
  const [intervalValue, setIntervalValue] = useState(1)
  const [doses, setDoses] = useState<Dose[]>([{ label: 'Dosis #1', time: '08:00', doseValue: 0, doseUnit: '' }])

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [indefinite, setIndefinite] = useState(true)

  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isEditing || !id) return
    const t = treatments.find((x) => x.id === id)
    if (!t) return
    const med = medications.find((m) => m.id === t.medicationId)
    if (med) setSelectedMed(med)
    setDoseValue(t.doses[0]?.doseValue || 0)
    setDoseUnit(t.doses[0]?.doseUnit || '')
    setPresentation(t.doses[0] ? (med?.presentation || 'pastilla') : 'pastilla')
    setFrequencyType(t.frequencyType)
    setTimesPerDay(t.frequencyConfig.timesPerDay || 1)
    setSpecificDays(t.frequencyConfig.days || [])
    setIntervalValue(t.frequencyConfig.interval || 1)
    setDoses(t.doses)
    setStartDate(t.startDate)
    setIndefinite(!t.endDate)
    if (t.endDate) setEndDate(t.endDate)
  }, [isEditing, id, treatments, medications])

  const handleSave = async () => {
    if (!selectedMed) return
    setShowConfirm(true)
  }

  const doSave = async () => {
    if (!selectedMed) return
    setLoading(true)
    try {
      const treatment = {
        id: isEditing && id ? id : generateId(),
        medicationId: selectedMed.id,
        frequencyType,
        frequencyConfig: { type: frequencyType, timesPerDay, days: specificDays, interval: intervalValue },
        doses: doses.map((d) => ({ ...d, doseValue: doseValue || selectedMed.doseValue, doseUnit: doseUnit || selectedMed.doseUnit })),
        startDate,
        endDate: indefinite ? undefined : endDate || undefined,
        active: true,
        createdAt: isEditing ? (treatments.find((t) => t.id === id)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      }
      if (isEditing) {
        const { deleteDoseLogsByTreatment } = await import('../db')
        await deleteDoseLogsByTreatment(id!)
        await updateTreatment(treatment)
      } else {
        await addTreatment(treatment)
      }
      navigate('/')
    } finally {
      setLoading(false)
    }
  }

  const next = () => setStep((step + 1) as Step)
  const prev = () => setStep((step - 1) as Step)

  const selectedMed2 = selectedMed

  const stepContent = (() => {
    switch (step) {
      case 1:
        return <Step1SelectMedication medications={medications} selected={selectedMed} onSelect={(m) => { setSelectedMed(m); if (m) { setDoseValue(m.doseValue); setDoseUnit(m.doseUnit); setPresentation(m.presentation) } }} onNext={next} />
      case 2:
        return <Step2DoseConfig doseValue={doseValue} setDoseValue={setDoseValue} doseUnit={doseUnit} setDoseUnit={setDoseUnit} presentation={presentation as any} setPresentation={setPresentation as any} onPrev={prev} onNext={next} medicationName={selectedMed2?.name || ''} />
      case 3:
        return <Step3Frequency frequencyType={frequencyType} setFrequencyType={setFrequencyType} timesPerDay={timesPerDay} setTimesPerDay={setTimesPerDay} specificDays={specificDays} setSpecificDays={setSpecificDays} intervalValue={intervalValue} setIntervalValue={setIntervalValue} doseValue={doseValue || selectedMed2?.doseValue || 0} doseUnit={doseUnit || selectedMed2?.doseUnit || ''} presentation={presentation} doses={doses} setDoses={setDoses} onPrev={prev} onNext={next} />
      case 4:
        return <Step4Duration startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} indefinite={indefinite} setIndefinite={setIndefinite} onPrev={prev} onSave={handleSave} />
    }
  })()

  return (
    <>
      {stepContent}
      <ConfirmDialog
        open={showConfirm}
        title={isEditing ? 'Guardar cambios' : 'Crear tratamiento'}
        message={
          isEditing
            ? 'Al guardar los cambios se eliminarán todas las dosis existentes de este tratamiento y se recrearán con la nueva configuración. ¿Estás seguro?'
            : '¿Estás seguro de guardar este tratamiento?'
        }
        confirmLabel={loading ? 'Guardando...' : 'Sí, guardar'}
        danger={isEditing}
        onConfirm={doSave}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  )
}
