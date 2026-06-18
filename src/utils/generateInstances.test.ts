import { describe, it, expect } from 'vitest'
import { generateDoseInstances } from './generateInstances'
import type { DoseSchedule } from '../types'

function makeSchedule(overrides: Partial<DoseSchedule> = {}): DoseSchedule {
  return {
    id: 'sched-1',
    medicationId: 'med-1',
    frequencyType: 'daily',
    frequencyConfig: {},
    doseDefinitions: [
      { label: 'Mañana', time: '08:00', doseValue: 500, doseUnit: 'mg' },
      { label: 'Tarde', time: '14:00', doseValue: 250, doseUnit: 'mg' },
    ],
    startDate: '2026-06-15',
    endDate: '2026-06-17',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('generateDoseInstances', () => {
  it('generates all doses for each day in range', () => {
    const schedule = makeSchedule()
    const instances = generateDoseInstances(schedule)

    expect(instances).toHaveLength(6)

    const dates = [...new Set(instances.map((i) => i.scheduledDate))]
    expect(dates).toEqual(['2026-06-15', '2026-06-16', '2026-06-17'])
  })

  it('skips days not matching frequency', () => {
    const schedule = makeSchedule({
      frequencyType: 'specific_days',
      frequencyConfig: { days: [1] },
      startDate: '2026-06-15',
      endDate: '2026-06-21',
    })
    const instances = generateDoseInstances(schedule)
    expect(instances).toHaveLength(2)
    expect(instances[0].scheduledDate).toBe('2026-06-15')
  })

  it('assigns correct metadata to each instance', () => {
    const schedule = makeSchedule()
    const instances = generateDoseInstances(schedule)

    const morning = instances.find((i) => i.scheduledTime === '08:00')
    expect(morning).toBeDefined()
    expect(morning!.doseValue).toBe(500)
    expect(morning!.doseUnit).toBe('mg')
    expect(morning!.status).toBe('pending')
  })
})
