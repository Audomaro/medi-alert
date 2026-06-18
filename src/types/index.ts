export type Presentation = 'pastilla' | 'capsula' | 'tableta' | 'inyeccion' | 'solucion' | 'gotas' | 'inhalador' | 'otro'

export type FrequencyType = 'daily' | 'specific_days' | 'every_x_days' | 'every_x_weeks' | 'every_x_months' | 'as_needed'

export type DoseStatus = 'pending' | 'taken' | 'skipped' | 'cancelled' | 'deleted'

export interface FrequencyConfig {
  timesPerDay?: number
  days?: number[]
  interval?: number
}

export interface DoseDefinition {
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
  updatedAt: string
}

export interface DoseSchedule {
  id: string
  medicationId: string
  frequencyType: FrequencyType
  frequencyConfig: FrequencyConfig
  doseDefinitions: DoseDefinition[]
  startDate: string
  endDate: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface DoseInstance {
  id: string
  scheduleId: string
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  doseLabel: string
  doseValue: number
  doseUnit: string
  status: DoseStatus
  takenAt?: string
  createdAt: string
  updatedAt: string
}

export interface DoseWithDetails {
  id: string
  scheduleId: string
  medicationId: string
  scheduledDate: string
  scheduledTime: string
  doseLabel: string
  status: DoseStatus
  takenAt?: string
  doseValue: number
  doseUnit: string
  medicationName: string
  medicationIcon?: string
  medicationColor?: string
  presentation: Presentation
}
