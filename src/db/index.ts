import { openDB, type IDBPDatabase } from 'idb'
import type { Medication, Treatment, DoseLog } from '../types'

const DB_NAME = 'medi-alert'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('medications')) {
          db.createObjectStore('medications', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('treatments')) {
          db.createObjectStore('treatments', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('dose_logs')) {
          const store = db.createObjectStore('dose_logs', { keyPath: 'id' })
          store.createIndex('date', 'scheduledDate')
          store.createIndex('treatment', 'treatmentId')
          store.createIndex('status', 'status')
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

export async function getAllTreatments(): Promise<Treatment[]> {
  const db = await getDB()
  return db.getAll('treatments')
}

export async function getTreatment(id: string): Promise<Treatment | undefined> {
  const db = await getDB()
  return db.get('treatments', id)
}

export async function saveTreatment(t: Treatment): Promise<void> {
  const db = await getDB()
  await db.put('treatments', t)
}

export async function deleteTreatment(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('treatments', id)
}

export async function getDoseLogsByDate(date: string): Promise<DoseLog[]> {
  const db = await getDB()
  const index = db.transaction('dose_logs').store.index('date')
  return index.getAll(date)
}

export async function getDoseLogsByTreatment(treatmentId: string): Promise<DoseLog[]> {
  const db = await getDB()
  const index = db.transaction('dose_logs').store.index('treatment')
  return index.getAll(treatmentId)
}

export async function saveDoseLog(log: DoseLog): Promise<void> {
  const db = await getDB()
  await db.put('dose_logs', log)
}

export async function updateDoseLogStatus(id: string, status: 'taken' | 'skipped' | 'cancelled'): Promise<void> {
  const db = await getDB()
  const tx = db.transaction('dose_logs', 'readwrite')
  const log = await tx.store.get(id)
  if (log) {
    log.status = status
    if (status === 'taken') log.takenAt = new Date().toISOString()
    await tx.store.put(log)
  }
  await tx.done
}
