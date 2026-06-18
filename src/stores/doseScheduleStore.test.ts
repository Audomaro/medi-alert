import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DoseSchedule, Medication } from '../types'
import { useDoseScheduleStore } from './doseScheduleStore'
import {
  getAllDoseSchedules,
  getDoseSchedule,
  saveDoseSchedule,
  deleteDoseSchedule,
  getActiveSchedulesForDate,
  getDoseActionsByDate,
  getDoseActionsBySchedule,
  saveDoseAction,
  deleteDoseAction,
  deleteDoseActionsBySchedule,
  getAllMedications,
} from '../db'

vi.mock('../db')

const mockedGetAllDoseSchedules = vi.mocked(getAllDoseSchedules)
const mockedGetDoseSchedule = vi.mocked(getDoseSchedule)
const mockedSaveDoseSchedule = vi.mocked(saveDoseSchedule)
const mockedDeleteDoseSchedule = vi.mocked(deleteDoseSchedule)
const mockedGetActiveSchedulesForDate = vi.mocked(getActiveSchedulesForDate)
const mockedGetDoseActionsByDate = vi.mocked(getDoseActionsByDate)
const mockedGetDoseActionsBySchedule = vi.mocked(getDoseActionsBySchedule)
const mockedSaveDoseAction = vi.mocked(saveDoseAction)
const mockedDeleteDoseAction = vi.mocked(deleteDoseAction)
const mockedDeleteDoseActionsBySchedule = vi.mocked(deleteDoseActionsBySchedule)
const mockedGetAllMedications = vi.mocked(getAllMedications)

function makeSchedule(overrides: Partial<DoseSchedule> = {}): DoseSchedule {
  return {
    id: 'sched-1',
    medicationId: 'med-1',
    frequencyType: 'daily',
    frequencyConfig: {},
    doses: [
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

  it('creates a deleted action and removes only the targeted instance from state', async () => {
    const schedule = makeSchedule()
    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])
    mockedSaveDoseAction.mockResolvedValue(undefined)

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    const instanceId = useDoseScheduleStore.getState().doses.find((d) => d.scheduledTime === '08:00')!.id

    await store.deleteDoseSlot(instanceId, 'sched-1', 'med-1', '2026-06-15', 'Mañana', '08:00')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('14:00')

    expect(mockedSaveDoseAction).toHaveBeenCalledWith(
      expect.objectContaining({
        id: instanceId,
        scheduleId: 'sched-1',
        medicationId: 'med-1',
        scheduledDate: '2026-06-15',
        scheduledTime: '08:00',
        doseLabel: 'Mañana',
        status: 'deleted',
      })
    )
    expect(mockedSaveDoseSchedule).not.toHaveBeenCalled()
    expect(mockedDeleteDoseSchedule).not.toHaveBeenCalled()
  })
})

describe('doseScheduleStore - deleteFutureDoses', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('removes only the targeted dose instance from state, preserving other doses of the same schedule on the same date', async () => {
    const schedule = makeSchedule()
    mockedGetDoseSchedule.mockResolvedValue(schedule)
    mockedGetDoseActionsBySchedule.mockResolvedValue([])
    mockedSaveDoseSchedule.mockResolvedValue(undefined)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)
    mockedDeleteDoseAction.mockResolvedValue(undefined)

    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    const instanceId = useDoseScheduleStore.getState().doses.find((d) => d.scheduledTime === '08:00')!.id

    await store.deleteFutureDoses(instanceId, 'sched-1', '2026-06-15', 'Mañana', '08:00')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('14:00')
    expect(mockedSaveDoseSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sched-1',
        doses: [{ label: 'Tarde', time: '14:00', doseValue: 250, doseUnit: 'mg' }],
        endDate: '2026-06-14',
      })
    )
  })

  it('deletes the entire schedule when removing the last remaining dose and future dates', async () => {
    const schedule = makeSchedule({ doses: [{ label: 'Mañana', time: '08:00', doseValue: 500, doseUnit: 'mg' }] })
    mockedGetDoseSchedule.mockResolvedValue(schedule)
    mockedGetDoseActionsBySchedule.mockResolvedValue([])
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)
    mockedDeleteDoseAction.mockResolvedValue(undefined)

    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(1)

    const instanceId = useDoseScheduleStore.getState().doses[0].id
    await store.deleteFutureDoses(instanceId, 'sched-1', '2026-06-15', 'Mañana', '08:00')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(0)
    expect(useDoseScheduleStore.getState().doseSchedules).toHaveLength(0)
    expect(mockedDeleteDoseSchedule).toHaveBeenCalledWith('sched-1')
  })
})

describe('doseScheduleStore - loadDosesForDate', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('filters deleted dose actions from the doses list', async () => {
    const schedule = makeSchedule()
    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([
      {
        id: 'sched-1|2026-06-15|08:00|Mañana',
        scheduleId: 'sched-1',
        medicationId: 'med-1',
        scheduledDate: '2026-06-15',
        scheduledTime: '08:00',
        doseLabel: 'Mañana',
        status: 'deleted',
      },
    ])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    const doses = useDoseScheduleStore.getState().doses
    expect(doses).toHaveLength(1)
    expect(doses[0].scheduledTime).toBe('14:00')
  })
})

describe('doseScheduleStore - remove', () => {
  beforeEach(() => {
    resetStore()
    vi.clearAllMocks()
  })

  it('removes the schedule and all its doses from state', async () => {
    const schedule = makeSchedule()
    mockedDeleteDoseActionsBySchedule.mockResolvedValue(undefined)
    mockedDeleteDoseSchedule.mockResolvedValue(undefined)

    mockedGetActiveSchedulesForDate.mockResolvedValue([schedule])
    mockedGetDoseActionsByDate.mockResolvedValue([])
    mockedGetAllMedications.mockResolvedValue([medication])

    const store = useDoseScheduleStore.getState()
    await store.loadDosesForDate('2026-06-15')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(2)

    await store.remove('sched-1')

    expect(useDoseScheduleStore.getState().doses).toHaveLength(0)
    expect(useDoseScheduleStore.getState().doseSchedules).toHaveLength(0)
    expect(mockedDeleteDoseActionsBySchedule).toHaveBeenCalledWith('sched-1')
    expect(mockedDeleteDoseSchedule).toHaveBeenCalledWith('sched-1')
  })
})
