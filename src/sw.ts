import { openDB } from 'idb'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

interface PeriodicSyncEvent extends Event {
  readonly tag: string
  waitUntil(f: Promise<unknown>): void
}

type DoseStatus = 'pending' | 'taken' | 'skipped' | 'cancelled' | 'deleted'

interface InlineDoseInstance {
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

interface InlineMedication {
  id: string
  name: string
  doseValue: number
  doseUnit: string
  icon?: string
  color?: string
}

const CACHE = 'medi-alert-v1'
const DB_NAME = 'medi-alert'

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minutesNow(): number {
  const n = new Date()
  return n.getHours() * 60 + n.getMinutes()
}

async function getPendingDosesToday(): Promise<InlineDoseInstance[]> {
  try {
    const db = await openDB(DB_NAME)
    const all = await db.getAllFromIndex('dose_instances', 'date', todayISO())
    return all.filter((d) => d.status === 'pending')
  } catch {
    return []
  }
}

async function getMedication(id: string): Promise<InlineMedication | undefined> {
  try {
    const db = await openDB(DB_NAME)
    return db.get('medications', id)
  } catch {
    return undefined
  }
}

async function updateDoseStatus(id: string, status: InlineDoseInstance['status']): Promise<void> {
  try {
    const db = await openDB(DB_NAME)
    const instance = await db.get('dose_instances', id)
    if (!instance) return
    instance.status = status
    instance.updatedAt = new Date().toISOString()
    if (status === 'taken') instance.takenAt = instance.updatedAt
    await db.put('dose_instances', instance)
  } catch {
    // SW was killed or DB unavailable — nothing actionable
  }
}

const timers = new Map<string, number>()
const notifiedDoses = new Set<string>()
let scheduling = false

function clearAllTimers(): void {
  for (const id of timers.keys()) {
    self.clearTimeout(timers.get(id)!)
  }
  timers.clear()
}

async function showDoseNotification(instance: InlineDoseInstance, medName: string): Promise<void> {
  const { id, scheduledTime, doseValue, doseUnit } = instance
  await self.registration.showNotification(`Medi-alert — ${medName}`, {
    body: `${doseValue}${doseUnit} — programada para las ${scheduledTime}`,
    tag: id,
    icon: 'icons/192.png',
    actions: [
      { action: 'taken',     title: 'Tomar' },
      { action: 'skipped',   title: 'Saltar' },
      { action: 'cancelled', title: 'Cancelar' },
    ],
    data: { doseId: id, scheduledDate: instance.scheduledDate, scheduledTime },
  } as any)
}

async function notifyDose(instance: InlineDoseInstance): Promise<void> {
  if (notifiedDoses.has(instance.id)) return
  notifiedDoses.add(instance.id)
  const med = await getMedication(instance.medicationId)
  await showDoseNotification(instance, med?.name || 'Medicamento')
  timers.delete(instance.id)
}

async function scheduleAllDoses(): Promise<void> {
  if (scheduling) return
  scheduling = true
  try {
    clearAllTimers()
    notifiedDoses.clear()
    const nowMin = minutesNow()
    const instances = await getPendingDosesToday()

    for (const inst of instances) {
      const doseMin = timeToMinutes(inst.scheduledTime)

      if (doseMin > nowMin) {
        const ms = (doseMin - nowMin) * 60_000
        const id = self.setTimeout(() => notifyDose(inst), ms)
        timers.set(inst.id, id)
      } else if (doseMin >= nowMin - 30 && doseMin <= nowMin) {
        notifyDose(inst)
      }
    }
  } finally {
    scheduling = false
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(self.__WB_MANIFEST.map((a) => a.url)))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ),
  )
  event.waitUntil(self.clients.claim())
  event.waitUntil(scheduleAllDoses())
})

self.addEventListener('fetch', (event) => {
  event.waitUntil(scheduleAllDoses())
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request)),
  )
})

async function checkMissedDoses(): Promise<void> {
  const nowMin = minutesNow()
  const instances = await getPendingDosesToday()
  for (const inst of instances) {
    const doseMin = timeToMinutes(inst.scheduledTime)
    if (doseMin >= nowMin - 30 && doseMin <= nowMin) {
      await notifyDose(inst)
    }
  }
}

self.addEventListener('periodicsync', (event: Event) => {
  const e = event as PeriodicSyncEvent
  if (e.tag === 'dose-check') {
    e.waitUntil(checkMissedDoses())
  }
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'RESCHEDULE') {
    event.waitUntil(scheduleAllDoses())
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const action = event.action
  const data = event.notification.data || {}

  if (action === 'taken' || action === 'skipped' || action === 'cancelled') {
    event.waitUntil(
      (async () => {
        await updateDoseStatus(data.doseId, action)
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        for (const c of clients) {
          c.postMessage({ type: 'DOSE_ACTION', action, doseId: data.doseId })
        }
        await scheduleAllDoses()
      })()
    )
    return
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/')
    }),
  )
})
