import { openDB, type IDBPDatabase } from 'idb'
import type { DoseInstance, DoseSchedule, Medication } from '../types'
import { generateDoseInstances } from '../utils/generateInstances'

const DB_NAME = 'medi-alert'
const DB_VERSION = 9

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: async (db, _oldVersion, _newVersion, transaction) => {
        if (_oldVersion < 1) {
          db.createObjectStore('medications', { keyPath: 'id' })
          db.createObjectStore('treatments', { keyPath: 'id' })
          const store = db.createObjectStore('dose_logs', { keyPath: 'id' })
          store.createIndex('date', 'scheduledDate')
          store.createIndex('treatment', 'treatmentId')
          store.createIndex('status', 'status')
        }
        if (_oldVersion < 2) {
          db.createObjectStore('deleted_dose_keys', { keyPath: 'id' })
        }
        if (_oldVersion < 3) {
          if (db.objectStoreNames.contains('treatments')) {
            db.deleteObjectStore('treatments')
          }
          const doseStore = transaction.objectStore('dose_logs')
          doseStore.deleteIndex('treatment')
          doseStore.createIndex('medication', 'medicationId')
        }
        if (_oldVersion < 4) {
          db.createObjectStore('dose_schedules', { keyPath: 'id' })
          const doseStore = transaction.objectStore('dose_logs')
          if (doseStore.indexNames.contains('medication')) {
            doseStore.deleteIndex('medication')
          }
          doseStore.createIndex('schedule', 'scheduleId')
        }
        if (_oldVersion < 5) {
          const actionStore = db.createObjectStore('dose_actions', { keyPath: 'id' })
          actionStore.createIndex('date', 'scheduledDate')
          actionStore.createIndex('schedule', 'scheduleId')

          if (db.objectStoreNames.contains('dose_logs')) {
            const oldStore = transaction.objectStore('dose_logs')
            const oldLogs = await oldStore.getAll()
            for (const log of oldLogs) {
              if (log.status !== 'pending') {
                const { doseValue, doseUnit, ...action } = log
                await actionStore.put(action)
              }
            }
            db.deleteObjectStore('dose_logs')
          }

          if (db.objectStoreNames.contains('deleted_dose_keys')) {
            db.deleteObjectStore('deleted_dose_keys')
          }

          if (db.objectStoreNames.contains('medications')) {
            const medStore = transaction.objectStore('medications')
            const allMeds = await medStore.getAll()
            for (const m of allMeds) {
              if (!m.updatedAt) {
                m.updatedAt = m.createdAt
                await medStore.put(m)
              }
            }
          }

          if (db.objectStoreNames.contains('dose_schedules')) {
            const schedStore = transaction.objectStore('dose_schedules')
            const allScheds = await schedStore.getAll()
            for (const s of allScheds) {
              if (s.frequencyConfig?.type) {
                const { type, ...rest } = s.frequencyConfig
                s.frequencyConfig = rest
              }
              if (!s.updatedAt) {
                s.updatedAt = s.createdAt
              }
              await schedStore.put(s)
            }
          }
        }
        if (_oldVersion < 6) {
          db.createObjectStore('hidden_dose_instances', { keyPath: 'id' })
        }
        if (_oldVersion < 7) {
          if (db.objectStoreNames.contains('hidden_dose_instances')) {
            db.deleteObjectStore('hidden_dose_instances')
          }
        }
        if (_oldVersion < 8) {
          const instanceStore = db.createObjectStore('dose_instances', { keyPath: 'id' })
          instanceStore.createIndex('date', 'scheduledDate')
          instanceStore.createIndex('schedule', 'scheduleId')

          // Migrate existing DoseActions to DoseInstances
          if (db.objectStoreNames.contains('dose_actions')) {
            const actionStore = transaction.objectStore('dose_actions')
            const actions = await actionStore.getAll()
            for (const a of actions) {
              await instanceStore.put({
                id: a.id,
                scheduleId: a.scheduleId,
                medicationId: a.medicationId,
                scheduledDate: a.scheduledDate,
                scheduledTime: a.scheduledTime,
                doseLabel: a.doseLabel,
                doseValue: 0,
                doseUnit: '',
                status: a.status,
                takenAt: a.takenAt,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            }
            db.deleteObjectStore('dose_actions')
          }
        }
        if (_oldVersion < 9) {
          // Reset dose_instances — clean slate, regenerate from schedules
          db.deleteObjectStore('dose_instances')
          const newStore = db.createObjectStore('dose_instances', { keyPath: 'id' })
          newStore.createIndex('date', 'scheduledDate')
          newStore.createIndex('schedule', 'scheduleId')

          const schedStore = transaction.objectStore('dose_schedules')
          const schedules = await schedStore.getAll()
          for (const s of schedules) {
            const instances = generateDoseInstances(s)
            for (const inst of instances) {
              await newStore.put(inst)
            }
          }
        }
      },
    })
  }
  return dbPromise
}

export async function getAllMedications(): Promise<Medication[]> {
  const db = await getDB()
  return db.getAll('medications')
}

export async function getMedication(id: string): Promise<Medication | undefined> {
  const db = await getDB()
  return db.get('medications', id)
}

export async function saveMedication(m: Medication): Promise<void> {
  const db = await getDB()
  await db.put('medications', m)
}

export async function deleteMedication(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('medications', id)
}

export async function getAllDoseSchedules(): Promise<DoseSchedule[]> {
  const db = await getDB()
  return db.getAll('dose_schedules')
}

export async function getDoseSchedule(id: string): Promise<DoseSchedule | undefined> {
  const db = await getDB()
  return db.get('dose_schedules', id)
}

export async function saveDoseSchedule(s: DoseSchedule): Promise<void> {
  const db = await getDB()
  await db.put('dose_schedules', s)
}

export async function deleteDoseSchedule(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('dose_schedules', id)
}

export async function deleteAllData(): Promise<void> {
  const db = await getDB()
  const stores = Array.from(db.objectStoreNames)
  const tx = db.transaction(stores, 'readwrite')
  await Promise.all(stores.map((s) => tx.objectStore(s).clear()))
  await tx.done
}

export async function getActiveSchedulesForDate(date: string): Promise<DoseSchedule[]> {
  const db = await getDB()
  const all = await db.getAll('dose_schedules')
  return all.filter((s) => s.active && s.startDate <= date && s.endDate >= date)
}

export async function getDoseInstancesByDate(date: string): Promise<DoseInstance[]> {
  const db = await getDB()
  return db.getAllFromIndex('dose_instances', 'date', date)
}

export async function getDoseInstancesBySchedule(scheduleId: string): Promise<DoseInstance[]> {
  const db = await getDB()
  return db.getAllFromIndex('dose_instances', 'schedule', scheduleId)
}

export async function getDoseInstance(id: string): Promise<DoseInstance | undefined> {
  const db = await getDB()
  return db.get('dose_instances', id)
}

export async function saveDoseInstance(instance: DoseInstance): Promise<void> {
  const db = await getDB()
  await db.put('dose_instances', instance)
}

export async function saveDoseInstances(instances: DoseInstance[]): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('dose_instances', 'readwrite')
  for (const i of instances) {
    tx.store.put(i)
  }
  await tx.done
}

export async function deleteDoseInstance(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('dose_instances', id)
}

export async function deleteDoseInstancesBySchedule(scheduleId: string): Promise<void> {
  const db = await getDB()
  const instances = await db.getAllFromIndex('dose_instances', 'schedule', scheduleId)
  const tx = db.transaction('dose_instances', 'readwrite')
  for (const i of instances) {
    tx.store.delete(i.id)
  }
  await tx.done
}
