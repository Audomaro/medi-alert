import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DoseSchedule, Medication, DoseInstance } from '../types'
import { useDoseScheduleStore } from './doseScheduleStore'
import {
  saveDoseSchedule,
  deleteDoseSchedule,
  getActiveSchedulesForDate,
  getDoseInstancesByDate,
  getDoseInstancesBySchedule,
  saveDoseInstances,
  saveDoseInstance,
  getDoseInstance,
  deleteDoseInstance,
  deleteDoseInstancesBySchedule,
  getAllMedications,
} from '../db'

vi.mock('../db')

vi.mock('../utils/generateInstances', () => ({
  generateDoseInstances: vi.fn((s) => {
    const now = new Date().toISOString()
    const start = new Date(s.startDate + 'T00:00:00')
    const end = new Date(s.endDate + 'T00:00:00')
    const instances: DoseInstance[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      for (const def of s.doseDefinitions) {
        instances.push({
          id: `${s.id}|${dateStr}|${def.time}|${def.label}`,
          scheduleId: s.id,
          medicationId: s.medicationId,
          scheduledDate: dateStr,
          scheduledTime: def.time,
          doseLabel: def.label,
          doseValue: def.doseValue,
          doseUnit: def.doseUnit,
          status: 'pending',
          createdAt: now,
          updatedAt: now,
        })
      }
    }
    return instances
  }),
}))


const mockedSaveDoseSchedule = vi.mocked(saveDoseSchedule)
const mockedDeleteDoseSchedule = vi.mocked(deleteDoseSchedule)
const mockedGetActiveSchedulesForDate = vi.mocked(getActiveSchedulesForDate)
const mockedGetDoseInstancesByDate = vi.mocked(getDoseInstancesByDate)
const mockedGetDoseInstancesBySchedule = vi.mocked(getDoseInstancesBySchedule)
const mockedSaveDoseInstances = vi.mocked(saveDoseInstances)
const mockedSaveDoseInstance = vi.mocked(saveDoseInstance)
const mockedGetDoseInstance = vi.mocked(getDoseInstance)
const mockedDeleteDoseInstance = vi.mocked(deleteDoseInstance)
const mockedDeleteDoseInstancesBySchedule = vi.mocked(deleteDoseInstancesBySchedule)
const mockedGetAllMedications = vi.mocked(getAllMedications)

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
    startDate: '2026-06-01',
    endDate: '2026-06-30',
    active: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

const medication: Medication = {
  id: 'med-1',
  name: 'Paracetamol',
  presentation: 'pastilla',
  doseValue: 500,
  doseUnit: 'mg',
  icon: 'pill',
  color: '#ff0000',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function resetStore() {
  useDoseScheduleStore.setState({
    doseSchedules: [],
    doses: [],
  })
}

describe('doseScheduleStore - deleteDoseSlot (Solo esta)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('deletes the exact instance from DB and removes it from state', async () => {
    const instance: DoseInstance = {
      id: 'sched-1|2026-06-15|08:00|Mañana',
      scheduleId: 'sched-1',
      medicationId: 'med-1',
      scheduledDate: '2026-06-15',
      scheduledTime: '08:00',
      doseLabel: 'Mañana',
      doseValue: 500,
      doseUnit: 'mg',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    useDoseScheduleStore.setState({
      doses: [
        { ...instance, medicationName: 'Paracetamol', presentation: 'pastilla' },
        { id: 'sched-1|2026-06-15|14:00|Tarde', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '14:00', doseLabel: 'Tarde', doseValue: 250, doseUnit: 'mg', status: 'pending', medicationName: 'Paracetamol', presentation: 'pastilla' },
      ],
    })

    mockedDeleteDoseInstance.mockResolvedValue(undefined)
    const store = useDoseScheduleStore.getState()
    await store.deleteDoseSlot(instance.id)

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('14:00')
    expect(mockedDeleteDoseInstance).toHaveBeenCalledWith(instance.id)
    expect(mockedDeleteDoseInstancesBySchedule).not.toHaveBeenCalled()
    expect(mockedDeleteDoseSchedule).not.toHaveBeenCalled()
  })
})

describe('doseScheduleStore - deleteFutureDoses (Esta y futuras)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('deletes all doses on future dates + same date from time onwards', async () => {
    const allInstances: DoseInstance[] = [
      { id: 'sched-1|2026-06-14|08:00|Mañana', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-14', scheduledTime: '08:00', doseLabel: 'Mañana', doseValue: 500, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
      { id: 'sched-1|2026-06-15|08:00|Mañana', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '08:00', doseLabel: 'Mañana', doseValue: 500, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
      { id: 'sched-1|2026-06-15|14:00|Tarde', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '14:00', doseLabel: 'Tarde', doseValue: 250, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
      { id: 'sched-1|2026-06-16|08:00|Mañana', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-16', scheduledTime: '08:00', doseLabel: 'Mañana', doseValue: 500, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
    ]
    mockedGetDoseInstancesBySchedule.mockResolvedValue(allInstances)
    mockedDeleteDoseInstance.mockResolvedValue(undefined)

    useDoseScheduleStore.setState({
      doses: allInstances.map((i) => ({ ...i, medicationName: 'Paracetamol', presentation: 'pastilla' })),
    })

    const store = useDoseScheduleStore.getState()
    await store.deleteFutureDoses('sched-1', '2026-06-15', '08:00')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses.find((d) => d.scheduledDate === '2026-06-14')).toBeTruthy() // past kept
    expect(doses.find((d) => d.scheduledDate === '2026-06-15' && d.scheduledTime === '08:00')).toBeFalsy() // same date, time >= 08:00 → deleted
    expect(doses.find((d) => d.scheduledDate === '2026-06-15' && d.scheduledTime === '14:00')).toBeFalsy() // same date, time >= 08:00 → deleted
    expect(doses.find((d) => d.scheduledDate === '2026-06-16')).toBeFalsy() // future date → all deleted
    expect(mockedDeleteDoseInstance).toHaveBeenCalledTimes(3)
    expect(mockedDeleteDoseInstancesBySchedule).not.toHaveBeenCalled()
    expect(mockedDeleteDoseSchedule).not.toHaveBeenCalled()
  })
})

describe('doseScheduleStore - loadDosesForDate', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('loads instances from DB and joins with medication names', async () => {
    const schedule = makeSchedule()
    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseInstancesByDate.mockResolvedValue([
      { id: 'sched-1|2026-06-15|08:00|Mañana', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '08:00', doseLabel: 'Mañana', doseValue: 500, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
      { id: 'sched-1|2026-06-15|14:00|Tarde', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '14:00', doseLabel: 'Tarde', doseValue: 250, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
    ])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(2)
    expect(doses[0].medicationName).toBe('Paracetamol')
    expect(doses[0].status).toBe('pending')
  })

  it('excludes instances from inactive schedules', async () => {
    mockedGetActiveSchedulesForDate.mockResolvedValue([])
    mockedGetDoseInstancesByDate.mockResolvedValue([
      { id: 'sched-1|2026-06-15|08:00|Mañana', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '08:00', doseLabel: 'Mañana', doseValue: 500, doseUnit: 'mg', status: 'pending', createdAt: '', updatedAt: '' },
    ])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(0)
  })
})

describe('doseScheduleStore - remove (Todas)', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('removes the schedule and all its instances from DB and state', async () => {
    mockedDeleteDoseInstancesBySchedule.mockResolvedValue(undefined)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)

    useDoseScheduleStore.setState({
      doseSchedules: [makeSchedule()],
      doses: [
        { id: 'sched-1|2026-06-15|08:00|Mañana', scheduleId: 'sched-1', medicationId: 'med-1', scheduledDate: '2026-06-15', scheduledTime: '08:00', doseLabel: 'Mañana', doseValue: 500, doseUnit: 'mg', status: 'pending', medicationName: 'Paracetamol', presentation: 'pastilla' },
      ],
    })

    const store = useDoseScheduleStore.getState()
    await store.remove('sched-1')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(0)
    expect(useDoseScheduleStore.getState().doseSchedules).toHaveLength(0)
    expect(mockedDeleteDoseInstancesBySchedule).toHaveBeenCalledWith('sched-1')
    expect(mockedDeleteDoseSchedule).toHaveBeenCalledWith('sched-1')
  })
})

describe('doseScheduleStore - add', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('saves schedule and generates + saves instances', async () => {
    const schedule = makeSchedule()
    mockedSaveDoseSchedule.mockResolvedValue(undefined)
    mockedSaveDoseInstances.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.add(schedule)

    expect(mockedSaveDoseSchedule).toHaveBeenCalledWith(schedule)
    expect(mockedSaveDoseInstances).toHaveBeenCalled()
    const savedInstances = mockedSaveDoseInstances.mock.calls[0][0]
    expect(savedInstances).toHaveLength(60) // 30 days × 2 doses
    expect(useDoseScheduleStore.getState().doseSchedules).toHaveLength(1)
  })
})

describe('doseScheduleStore - updateDoseStatus', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('fetches instance, updates status, and saves', async () => {
    const instance: DoseInstance = {
      id: 'sched-1|2026-06-15|08:00|Mañana',
      scheduleId: 'sched-1',
      medicationId: 'med-1',
      scheduledDate: '2026-06-15',
      scheduledTime: '08:00',
      doseLabel: 'Mañana',
      doseValue: 500,
      doseUnit: 'mg',
      status: 'pending',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    }

    mockedGetDoseInstance.mockResolvedValue(instance)
    mockedSaveDoseInstance.mockResolvedValue(undefined)

    useDoseScheduleStore.setState({
      doses: [
        { ...instance, medicationName: 'Paracetamol', presentation: 'pastilla' },
      ],
    })

    const store = useDoseScheduleStore.getState()
    await store.updateDoseStatus(instance.id, 'taken')

    expect(mockedGetDoseInstance).toHaveBeenCalledWith(instance.id)
    expect(mockedSaveDoseInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        id: instance.id,
        status: 'taken',
        takenAt: expect.any(String),
      })
    )

    const doses = useDoseScheduleStore.getState().doses
    expect(doses[0].status).toBe('taken')
    expect(doses[0].takenAt).toBeDefined()
  })
})
