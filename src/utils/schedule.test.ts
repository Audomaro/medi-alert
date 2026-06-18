import { describe, it, expect } from 'vitest'
import { shouldGenerateForDate, generateInstanceId } from './schedule'
import type { DoseSchedule } from '../types'

function makeSchedule(overrides: Partial<DoseSchedule> = {}): DoseSchedule {
  return {
    id: 'test-1',
    medicationId: 'med-1',
    frequencyType: 'daily',
    frequencyConfig: {},
    doseDefinitions: [{ label: 'Dosis #1', time: '08:00', doseValue: 500, doseUnit: 'mg' }],
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('generateInstanceId', () => {
  it('generates deterministic ID from scheduleId, date, time, and label', () => {
    const id = generateInstanceId('sched-1', '2026-06-15', '08:00', 'Dosis #1')
    expect(id).toBe('sched-1|2026-06-15|08:00|Dosis #1')
  })
})

describe('shouldGenerateForDate — daily', () => {
  const s = makeSchedule({ frequencyType: 'daily' })

  it('returns true for any date within range', () => {
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-06-15')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-06-30')).toBe(true)
  })

  it('returns true regardless of day of week', () => {
    expect(shouldGenerateForDate(s, '2026-06-07')).toBe(true) // Sunday
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(true) // Monday
    expect(shouldGenerateForDate(s, '2026-06-06')).toBe(true) // Saturday
  })
})

describe('shouldGenerateForDate — specific_days', () => {
  const s = makeSchedule({ frequencyType: 'specific_days', frequencyConfig: { days: [1, 3, 5] } })

  it('returns true for specified days (Mon=1, Wed=3, Fri=5)', () => {
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(true)  // Monday
    expect(shouldGenerateForDate(s, '2026-06-03')).toBe(true)  // Wednesday
    expect(shouldGenerateForDate(s, '2026-06-05')).toBe(true)  // Friday
  })

  it('returns false for non-specified days', () => {
    expect(shouldGenerateForDate(s, '2026-06-02')).toBe(false) // Tuesday
    expect(shouldGenerateForDate(s, '2026-06-04')).toBe(false) // Thursday
    expect(shouldGenerateForDate(s, '2026-06-06')).toBe(false) // Saturday
    expect(shouldGenerateForDate(s, '2026-06-07')).toBe(false) // Sunday
  })

  it('returns false when no days configured', () => {
    const s2 = makeSchedule({ frequencyType: 'specific_days', frequencyConfig: {} })
    expect(shouldGenerateForDate(s2, '2026-06-01')).toBe(false)
  })
})

describe('shouldGenerateForDate — every_x_days', () => {
  const s = makeSchedule({
    frequencyType: 'every_x_days',
    frequencyConfig: { interval: 3 },
    startDate: '2026-06-01',
  })

  it('returns true on the start date and every interval days', () => {
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-06-04')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-06-07')).toBe(true)
  })

  it('returns false on non-interval days', () => {
    expect(shouldGenerateForDate(s, '2026-06-02')).toBe(false)
    expect(shouldGenerateForDate(s, '2026-06-03')).toBe(false)
    expect(shouldGenerateForDate(s, '2026-06-05')).toBe(false)
  })
})

describe('shouldGenerateForDate — every_x_weeks', () => {
  const s = makeSchedule({
    frequencyType: 'every_x_weeks',
    frequencyConfig: { interval: 2 },
    startDate: '2026-06-01',
  })

  it('returns true on start date and every interval weeks', () => {
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(true)  // week 0
    expect(shouldGenerateForDate(s, '2026-06-15')).toBe(true)  // week 2
  })

  it('returns false on non-interval weeks', () => {
    expect(shouldGenerateForDate(s, '2026-06-08')).toBe(false) // week 1
  })
})

describe('shouldGenerateForDate — every_x_months', () => {
  const s = makeSchedule({
    frequencyType: 'every_x_months',
    frequencyConfig: { interval: 2 },
    startDate: '2026-06-01',
  })

  it('returns true on start month and every interval months', () => {
    expect(shouldGenerateForDate(s, '2026-06-15')).toBe(true)  // month 0
    expect(shouldGenerateForDate(s, '2026-08-15')).toBe(true)  // month 2
  })

  it('returns false on non-interval months', () => {
    expect(shouldGenerateForDate(s, '2026-07-15')).toBe(false)  // month 1
    expect(shouldGenerateForDate(s, '2026-09-15')).toBe(false)  // month 3
  })
})

describe('shouldGenerateForDate — as_needed', () => {
  const s = makeSchedule({ frequencyType: 'as_needed' })

  it('always returns false', () => {
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(false)
    expect(shouldGenerateForDate(s, '2026-06-15')).toBe(false)
  })
})

describe('shouldGenerateForDate — edge cases', () => {
  it('handles start date exactly', () => {
    const s = makeSchedule({ startDate: '2026-06-15', endDate: '2026-06-20' })
    expect(shouldGenerateForDate(s, '2026-06-15')).toBe(true)
  })

  it('handles end date exactly', () => {
    const s = makeSchedule({ startDate: '2026-06-15', endDate: '2026-06-20' })
    expect(shouldGenerateForDate(s, '2026-06-20')).toBe(true)
  })

  it('uses default interval of 1', () => {
    const s = makeSchedule({
      frequencyType: 'every_x_days',
      frequencyConfig: {},
      startDate: '2026-06-01',
    })
    expect(shouldGenerateForDate(s, '2026-06-01')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-06-02')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-06-03')).toBe(true)
  })

  it('handles month boundary crossing', () => {
    const s = makeSchedule({
      frequencyType: 'every_x_days',
      frequencyConfig: { interval: 5 },
      startDate: '2026-06-28',
    })
    expect(shouldGenerateForDate(s, '2026-06-28')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-07-03')).toBe(true)
    expect(shouldGenerateForDate(s, '2026-07-08')).toBe(true)
  })
})
