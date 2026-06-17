export type Presentation = 'pastilla' | 'capsula' | 'tableta' | 'inyeccion' | 'solucion' | 'gotas' | 'inhalador' | 'otro'

export type FrequencyType = 'daily' | 'specific_days' | 'every_x_days' | 'every_x_weeks' | 'every_x_months' | 'as_needed'

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'cancelled'

export interface FrequencyConfig {
  type: FrequencyType
  timesPerDay?: number
  days?: number[]
  interval?: number
}

export interface Dose {
  label: string
  time: string
  doseValue: number
  doseUnit: string
}

export interface Medication {
  id: string
  name: string
  presentation: Presentation
  doseValue: number
  doseUnit: string
  icon?: string
  color?: string
  createdAt: string
}

export interface Treatment {
  id: string
  medicationId: string
  frequencyType: FrequencyType
  frequencyConfig: FrequencyConfig
  doses: Dose[]
  startDate: string
  endDate?: string
  active: boolean
  createdAt: string
}

export interface DoseLog {
  id: string
  treatmentId: string
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  doseLabel: string
  status: DoseStatus
  takenAt?: string
  doseValue: number
  doseUnit: string
}

export interface DoseWithDetails extends DoseLog {
  medicationName: string
  medicationIcon?: string
  medicationColor?: string
  presentation: Presentation
}
