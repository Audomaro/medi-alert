# Medi-alert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Build a PWA medication reminder app with treatment/medication management and push notifications.

**Architecture:** React 19 + Vite 6 + TypeScript SPA with local IndexedDB persistence via idb, Zustand for state, Tailwind CSS 4 for theming, and Workbox-based PWA with service worker notifications.

**Tech Stack:** Vite 6, React 19, TypeScript 5.7+, Tailwind CSS 4, Zustand 5, idb 8, React Router 7, Lucide React, vite-plugin-pwa (Workbox)

---

### Task 1: Scaffold project with Vite + React + TypeScript + Tailwind

**Files:**
- Create: project root (package.json, vite.config.ts, tsconfig.json, index.html, etc.)

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /c/Users/jose_/Desktop/medi-alert
npm create vite@latest . -- --template react-ts
```

Run: `npm install`

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom@7 zustand idb lucide-react
npm install -D tailwindcss @tailwindcss/vite vite-plugin-pwa
```

- [ ] **Step 3: Configure Tailwind CSS 4**

Edit `src/index.css`:
```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --color-primary: #0891B2;
  --color-secondary: #22D3EE;
  --color-cta: #22C55E;
  --color-bg: #F0FDFA;
  --color-text: #134E4A;
  --color-warning-bg: #FEF3C7;
  --color-warning-text: #B45309;
  --color-danger-bg: #FEE2E2;
  --color-danger-text: #DC2626;
  --color-success-bg: #DCFCE7;
  --color-success-text: #15803D;
}
```

- [ ] **Step 4: Configure vite-plugin-pwa**

Edit `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Medi-alert',
        short_name: 'Medi-alert',
        description: 'Recordatorio de medicamentos',
        theme_color: '#0891B2',
        background_color: '#F0FDFA',
        display: 'standalone',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2}'],
        runtimeCaching: [],
      },
    }),
  ],
})
```

- [ ] **Step 5: Create public icons directory**

```bash
mkdir -p public/icons
```

Create `public/icons/192.png` and `public/icons/512.png` as simple SVG or PNG placeholders.

- [ ] **Step 6: Verify setup**

Run: `npm run dev`
Expected: Vite dev server starts on localhost:5173, React app renders.

---

### Task 2: Define TypeScript types and data layer

**Files:**
- Create: `src/types/index.ts`
- Create: `src/db/index.ts`

- [ ] **Step 1: Write types**

`src/types/index.ts`:
```ts
export type Presentation = 'pastilla' | 'capsula' | 'tableta' | 'inyeccion' | 'solucion' | 'gotas' | 'inhalador' | 'otro'

export type FrequencyType = 'daily' | 'specific_days' | 'every_x_days' | 'every_x_weeks' | 'every_x_months' | 'as_needed'

export type DoseStatus = 'pending' | 'taken' | 'skipped'

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
```

- [ ] **Step 2: Write IndexedDB layer**

`src/db/index.ts`:
```ts
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

export async function updateDoseLogStatus(id: string, status: 'taken' | 'skipped'): Promise<void> {
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
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

---

### Task 3: Create Zustand stores

**Files:**
- Create: `src/stores/themeStore.ts`
- Create: `src/stores/medicationStore.ts`
- Create: `src/stores/treatmentStore.ts`

- [ ] **Step 1: Theme store**

`src/stores/themeStore.ts`:
```ts
import { create } from 'zustand'

interface ThemeState {
  dark: boolean
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  dark: localStorage.getItem('theme') === 'dark',
  toggle: () =>
    set((state) => {
      const next = !state.dark
      localStorage.setItem('theme', next ? 'dark' : 'light')
      document.documentElement.classList.toggle('dark', next)
      return { dark: next }
    }),
}))
```

- [ ] **Step 2: Medication store**

`src/stores/medicationStore.ts`:
```ts
import { create } from 'zustand'
import type { Medication } from '../types'
import { getAllMedications, saveMedication, deleteMedication } from '../db'

interface MedicationState {
  medications: Medication[]
  load: () => Promise<void>
  add: (m: Medication) => Promise<void>
  remove: (id: string) => Promise<void>
}

export const useMedicationStore = create<MedicationState>((set) => ({
  medications: [],
  load: async () => {
    const meds = await getAllMedications()
    set({ medications: meds })
  },
  add: async (m) => {
    await saveMedication(m)
    set((s) => ({ medications: [...s.medications, m] }))
  },
  remove: async (id) => {
    await deleteMedication(id)
    set((s) => ({ medications: s.medications.filter((m) => m.id !== id) }))
  },
}))
```

- [ ] **Step 3: Treatment store**

`src/stores/treatmentStore.ts`:
```ts
import { create } from 'zustand'
import type { Treatment, DoseLog } from '../types'
import {
  getAllTreatments,
  saveTreatment,
  deleteTreatment,
  getDoseLogsByDate,
  saveDoseLog,
} from '../db'

interface TreatmentState {
  treatments: Treatment[]
  doseLogs: DoseLog[]
  loadTreatments: () => Promise<void>
  loadDoseLogs: (date: string) => Promise<void>
  add: (t: Treatment) => Promise<void>
  remove: (id: string) => Promise<void>
  updateDoseStatus: (id: string, status: 'taken' | 'skipped') => Promise<void>
}

export const useTreatmentStore = create<TreatmentState>((set) => ({
  treatments: [],
  doseLogs: [],
  loadTreatments: async () => {
    const ts = await getAllTreatments()
    set({ treatments: ts })
  },
  loadDoseLogs: async (date) => {
    const logs = await getDoseLogsByDate(date)
    set({ doseLogs: logs })
  },
  add: async (t) => {
    await saveTreatment(t)
    set((s) => ({ treatments: [...s.treatments, t] }))
  },
  remove: async (id) => {
    await deleteTreatment(id)
    set((s) => ({ treatments: s.treatments.filter((t) => t.id !== id) }))
  },
  updateDoseStatus: async (id, status) => {
    const { updateDoseLogStatus } = await import('../db')
    await updateDoseLogStatus(id, status)
    set((s) => ({
      doseLogs: s.doseLogs.map((l) =>
        l.id === id
          ? { ...l, status, takenAt: status === 'taken' ? new Date().toISOString() : undefined }
          : l
      ),
    }))
  },
}))
```

- [ ] **Step 4: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

---

### Task 4: Implement utility functions

**Files:**
- Create: `src/utils/id.ts`
- Create: `src/utils/date.ts`

- [ ] **Step 1: ID generation**

`src/utils/id.ts`:
```ts
export function generateId(): string {
  return crypto.randomUUID()
}
```

- [ ] **Step 2: Date helpers**

`src/utils/date.ts`:
```ts
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDateDisplay(iso: string): string {
  const d = new Date(iso + 'T12:00:00')
  const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `Hoy es ${days[d.getDay()]}, ${d.getDate()} de ${months[d.getMonth()]}`
}

export function getWeekDates(): { day: string; date: number; iso: string; active: boolean }[] {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const week: { day: string; date: number; iso: string; active: boolean }[] = []
  const labels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - dayOfWeek + i)
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    week.push({
      day: labels[i],
      date: d.getDate(),
      iso,
      active: iso === todayISO(),
    })
  }
  return week
}

export function formatTime24to12(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const ampm = h >= 12 ? 'p.m.' : 'a.m.'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}
```

---

### Task 5: Build shared UI components

**Files:**
- Create: `src/components/ThemeToggle.tsx`
- Create: `src/components/StatusBadge.tsx`
- Create: `src/components/WeekCalendar.tsx`
- Create: `src/components/DoseCard.tsx`
- Create: `src/components/FabMenu.tsx`
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/Layout.tsx`

- [ ] **Step 1: ThemeToggle**

`src/components/ThemeToggle.tsx`:
```tsx
import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'

export function ThemeToggle() {
  const { dark, toggle } = useThemeStore()
  return (
    <button onClick={toggle} className="cursor-pointer p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
      {dark ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-primary" />}
    </button>
  )
}
```

- [ ] **Step 2: StatusBadge**

`src/components/StatusBadge.tsx`:
```tsx
import type { DoseStatus } from '../types'

const config: Record<DoseStatus, { label: string; classes: string }> = {
  pending: { label: 'Pendiente', classes: 'bg-warning-bg text-warning-text' },
  taken: { label: 'Tomada ✓', classes: 'bg-success-bg text-success-text' },
  skipped: { label: 'Saltada ✕', classes: 'bg-danger-bg text-danger-text' },
}

export function StatusBadge({ status }: { status: DoseStatus }) {
  const c = config[status]
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${c.classes}`}>{c.label}</span>
}
```

- [ ] **Step 3: WeekCalendar**

`src/components/WeekCalendar.tsx`:
```tsx
import { getWeekDates } from '../utils/date'

export function WeekCalendar() {
  const week = getWeekDates()
  return (
    <div className="grid grid-cols-7 gap-1.5 text-center">
      {week.map((d) => (
        <div
          key={d.iso}
          className={`rounded-xl py-2 transition-colors duration-200 ${
            d.active
              ? 'bg-primary text-white shadow-lg shadow-primary/30'
              : 'text-text/70 dark:text-gray-400'
          }`}
        >
          <div className="text-xs font-medium">{d.day}</div>
          <div className={`font-semibold ${d.active ? 'text-lg' : 'text-base'}`}>{d.date}</div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: DoseCard**

`src/components/DoseCard.tsx`:
```tsx
import { Pill, FlaskRound, Syringe, Wind, Droplets } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { formatTime24to12 } from '../utils/date'
import type { Presentation, DoseStatus } from '../types'

const iconMap: Record<Presentation, typeof Pill> = {
  pastilla: Pill, capsula: Pill, tableta: Pill, inyeccion: Syringe,
  solucion: FlaskRound, gotas: Droplets, inhalador: Wind, otro: Pill,
}

interface Props {
  time: string
  medicationName: string
  doseValue: number
  doseUnit: string
  presentation: Presentation
  status: DoseStatus
  icon?: string
  color?: string
  onMark: () => void
}

export function DoseCard({ time, medicationName, doseValue, doseUnit, presentation, status, color, onMark }: Props) {
  const Icon = iconMap[presentation] || Pill
  const isDone = status !== 'pending'
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="text-xs font-semibold" style={{ color: color || 'var(--color-primary)' }}>
            {formatTime24to12(time)}
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: color ? `${color}20` : '#E0F2FE', color: color || 'var(--color-primary)' }}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-text dark:text-white">{medicationName}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {presentation === 'gotas' ? `Aplicar ${doseValue} gotas` : `Tomar ${doseValue} ${doseUnit}`}
              </div>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={status} />
          <button
            onClick={onMark}
            disabled={isDone}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
              isDone
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90 active:scale-95'
            }`}
          >
            {isDone ? 'Completada' : 'Marcar dosis'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: FabMenu**

`src/components/FabMenu.tsx`:
```tsx
import { useState } from 'react'
import { Plus, Pill, CalendarPlus } from 'lucide-react'

interface Props {
  onAddTreatment: () => void
  onAddMedication: () => void
}

export function FabMenu({ onAddTreatment, onAddMedication }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className="fixed bottom-24 right-6 flex flex-col items-end gap-3 z-50">
      {open && (
        <>
          <button onClick={() => { onAddTreatment(); setOpen(false) }} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-text dark:text-white px-4 py-2.5 rounded-xl shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium">
            <CalendarPlus className="w-4 h-4 text-primary" /> Agregar tratamiento
          </button>
          <button onClick={() => { onAddMedication(); setOpen(false) }} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-text dark:text-white px-4 py-2.5 rounded-xl shadow-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 text-sm font-medium">
            <Pill className="w-4 h-4 text-primary" /> Agregar medicamento
          </button>
        </>
      )}
      <button onClick={() => setOpen(!open)} className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 cursor-pointer hover:bg-primary/90 active:scale-95 transition-all duration-200">
        <Plus className={`w-7 h-7 transition-transform duration-200 ${open ? 'rotate-45' : ''}`} />
      </button>
    </div>
  )
}
```

- [ ] **Step 6: BottomNav**

`src/components/BottomNav.tsx`:
```tsx
import { House, Pill, Ellipsis } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  { path: '/', label: 'Inicio', icon: House },
  { path: '/meds', label: 'Medicamentos', icon: Pill },
  { path: '/more', label: 'Más', icon: Ellipsis },
]

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-safe">
      <div className="grid grid-cols-3 max-w-lg mx-auto">
        {tabs.map((t) => {
          const active = location.pathname === t.path
          const Icon = t.icon
          return (
            <button key={t.path} onClick={() => navigate(t.path)} className={`flex flex-col items-center py-3 cursor-pointer transition-colors duration-200 ${active ? 'text-primary' : 'text-gray-400 dark:text-gray-500'}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium mt-0.5">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
```

- [ ] **Step 7: Layout**

`src/components/Layout.tsx`:
```tsx
import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function Layout() {
  return (
    <div className="min-h-screen bg-bg dark:bg-gray-900 text-text dark:text-gray-100 font-sans pb-20">
      <div className="max-w-lg mx-auto px-4 pt-4">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}
```

---

### Task 6: Build HomePage (main view)

**Files:**
- Create: `src/pages/HomePage.tsx`
- Modify: `src/components/WeekCalendar.tsx` (already done)

- [ ] **Step 1: Write HomePage**

`src/pages/HomePage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { WeekCalendar } from '../components/WeekCalendar'
import { DoseCard } from '../components/DoseCard'
import { FabMenu } from '../components/FabMenu'
import { ThemeToggle } from '../components/ThemeToggle'
import { useThemeStore } from '../stores/themeStore'
import { useTreatmentStore } from '../stores/treatmentStore'
import { useMedicationStore } from '../stores/medicationStore'
import { todayISO, formatDateDisplay } from '../utils/date'
import type { DoseWithDetails } from '../types'

export function HomePage() {
  const navigate = useNavigate()
  const dark = useThemeStore((s) => s.dark)
  const { treatments, doseLogs, loadTreatments, loadDoseLogs, updateDoseStatus } = useTreatmentStore()
  const { medications, load } = useMedicationStore()
  const [today] = useState(todayISO())

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  useEffect(() => {
    loadTreatments().then(() => load())
    loadDoseLogs(todayISO())
  }, [])

  useEffect(() => {
    if (treatments.length > 0 && medications.length > 0) {
      loadDoseLogs(todayISO())
    }
  }, [treatments, medications])

  const dosesWithDetails: DoseWithDetails[] = doseLogs.map((log) => {
    const med = medications.find((m) => m.id === log.medicationId)
    return {
      ...log,
      medicationName: med?.name || 'Desconocido',
      medicationIcon: med?.icon,
      medicationColor: med?.color,
      presentation: med?.presentation || 'otro',
    }
  })

  const sortedDoses = [...dosesWithDetails].sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime))

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-text dark:text-white">Medi-alert</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 cursor-pointer">
            <Bell className="w-5 h-5 text-primary" />
          </button>
        </div>
      </div>

      <WeekCalendar />

      <p className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 mt-2 mb-5">
        {formatDateDisplay(today)}
      </p>

      <div className="flex flex-col gap-3">
        {sortedDoses.length === 0 && (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <p className="text-lg font-medium mb-1">Sin dosis hoy</p>
            <p className="text-sm">Agrega un tratamiento para empezar</p>
          </div>
        )}
        {sortedDoses.map((dose) => (
          <DoseCard
            key={dose.id}
            time={dose.scheduledTime}
            medicationName={dose.medicationName}
            doseValue={dose.doseValue}
            doseUnit={dose.doseUnit}
            presentation={dose.presentation}
            status={dose.status}
            color={dose.medicationColor}
            onMark={() => updateDoseStatus(dose.id, 'taken')}
          />
        ))}
      </div>

      <FabMenu onAddTreatment={() => navigate('/treatment/new')} onAddMedication={() => navigate('/medication/new')} />
    </div>
  )
}
```

---

### Task 7: Build MedicationsPage + MedicationWizard

**Files:**
- Create: `src/pages/MedicationsPage.tsx`
- Create: `src/wizard/MedicationWizard.tsx`

- [ ] **Step 1: MedicationsPage**

`src/pages/MedicationsPage.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Pill, FlaskRound, Syringe, Wind, Droplets } from 'lucide-react'
import { useMedicationStore } from '../stores/medicationStore'
import type { Presentation } from '../types'

const iconMap: Record<Presentation, typeof Pill> = {
  pastilla: Pill, capsula: Pill, tableta: Pill, inyeccion: Syringe,
  solucion: FlaskRound, gotas: Droplets, inhalador: Wind, otro: Pill,
}

const labels: Record<Presentation, string> = {
  pastilla: 'Pastilla', capsula: 'Cápsula', tableta: 'Tableta',
  inyeccion: 'Inyección', solucion: 'Solución', gotas: 'Gotas',
  inhalador: 'Inhalador', otro: 'Otro',
}

export function MedicationsPage() {
  const navigate = useNavigate()
  const { medications, load } = useMedicationStore()
  const [search, setSearch] = useState('')

  useEffect(() => { load() }, [])

  const filtered = medications.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-text dark:text-white">Medicamentos</h1>
        <button onClick={() => navigate('/medication/new')} className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors duration-200">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar medicamento..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-primary/30 transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((m) => {
          const Icon = iconMap[m.presentation]
          return (
            <div key={m.id} className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] cursor-pointer hover:shadow-md transition-shadow duration-200">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: m.color ? `${m.color}20` : '#E0F2FE' }}>
                <Icon className="w-5 h-5" style={{ color: m.color || '#0891B2' }} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-text dark:text-white">{m.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{m.doseValue} {m.doseUnit} · {labels[m.presentation]}</div>
              </div>
              <Pencil className="w-4 h-4 text-primary cursor-pointer" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: MedicationWizard**

`src/wizard/MedicationWizard.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useMedicationStore } from '../stores/medicationStore'
import { generateId } from '../utils/id'
import type { Presentation } from '../types'

const presentations: { value: Presentation; label: string }[] = [
  { value: 'pastilla', label: 'Pastilla' },
  { value: 'capsula', label: 'Cápsula' },
  { value: 'tableta', label: 'Tableta' },
  { value: 'inyeccion', label: 'Inyección' },
  { value: 'solucion', label: 'Solución' },
  { value: 'gotas', label: 'Gotas' },
  { value: 'inhalador', label: 'Inhalador' },
  { value: 'otro', label: 'Otro' },
]

const colors = ['#0891B2', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6']

export function MedicationWizard() {
  const navigate = useNavigate()
  const { medications, add } = useMedicationStore()
  const [name, setName] = useState('')
  const [presentation, setPresentation] = useState<Presentation>('pastilla')
  const [doseValue, setDoseValue] = useState('500')
  const [doseUnit, setDoseUnit] = useState('mg')
  const [color, setColor] = useState<string | undefined>(undefined)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('El nombre es obligatorio'); return }
    if (medications.some((m) => m.name.toLowerCase() === name.trim().toLowerCase())) {
      setError('Este medicamento ya existe')
      return
    }
    await add({
      id: generateId(),
      name: name.trim(),
      presentation,
      doseValue: Number(doseValue) || 0,
      doseUnit: doseUnit.trim(),
      color,
      createdAt: new Date().toISOString(),
    })
    navigate('/meds')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5 text-text dark:text-white" /></button>
        <h1 className="text-lg font-bold text-text dark:text-white">Nuevo medicamento</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Nombre</label>
          <input value={name} onChange={(e) => { setName(e.target.value); setError('') }} placeholder="Nombre del medicamento" className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          {error && <p className="text-xs text-danger-text mt-1">{error}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Presentación</label>
          <div className="grid grid-cols-4 gap-2">
            {presentations.map((p) => (
              <button key={p.value} onClick={() => setPresentation(p.value)}
                className={`py-2 px-1 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                  presentation === p.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}>{p.label}</button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Dosis</label>
            <input value={doseValue} onChange={(e) => setDoseValue(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Unidad</label>
            <input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text dark:text-gray-300 mb-1.5 block">Color (opcional)</label>
          <div className="flex gap-2 items-center">
            {colors.map((c) => (
              <button key={c} onClick={() => setColor(c === color ? undefined : c)}
                className={`w-7 h-7 rounded-full cursor-pointer transition-all duration-200 ${c === color ? 'ring-2 ring-offset-2 ring-primary' : ''}`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>
      </div>

      <button onClick={handleSave} className="w-full mt-6 py-3 rounded-xl bg-cta text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-cta/90 active:scale-[0.98] transition-all duration-200">
        <Check className="w-4 h-4" /> Guardar medicamento
      </button>
    </div>
  )
}
```

---

### Task 8: Build Treatment Wizard

**Files:**
- Create: `src/wizard/TreatmentWizard.tsx`
- Create: `src/wizard/Step1SelectMedication.tsx`
- Create: `src/wizard/Step2DoseConfig.tsx`
- Create: `src/wizard/Step3Frequency.tsx`
- Create: `src/wizard/Step4Duration.tsx`

- [ ] **Step 1: TreatmentWizard container**

`src/wizard/TreatmentWizard.tsx`:
```tsx
import { useState } from 'react'
import { useMedicationStore } from '../stores/medicationStore'
import { useTreatmentStore } from '../stores/treatmentStore'
import { generateId } from '../utils/id'
import { Step1SelectMedication } from './Step1SelectMedication'
import { Step2DoseConfig } from './Step2DoseConfig'
import { Step3Frequency } from './Step3Frequency'
import { Step4Duration } from './Step4Duration'
import type { Medication, FrequencyType, Dose } from '../types'

type Step = 1 | 2 | 3 | 4

export function TreatmentWizard() {
  const { medications } = useMedicationStore()
  const { add: addTreatment } = useTreatmentStore()

  const [step, setStep] = useState<Step>(1)
  const [selectedMed, setSelectedMed] = useState<Medication | null>(null)

  const [doseValue, setDoseValue] = useState<number>(0)
  const [doseUnit, setDoseUnit] = useState('')
  const [presentation, setPresentation] = useState(selectedMed?.presentation || 'pastilla')

  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily')
  const [timesPerDay, setTimesPerDay] = useState(1)
  const [specificDays, setSpecificDays] = useState<number[]>([])
  const [intervalValue, setIntervalValue] = useState(1)
  const [doses, setDoses] = useState<Dose[]>([{ label: 'Dosis #1', time: '08:00', doseValue: 0, doseUnit: '' }])

  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [indefinite, setIndefinite] = useState(true)

  const handleSave = async () => {
    if (!selectedMed) return
    const frequencyConfig = { type: frequencyType, timesPerDay, days: specificDays, interval: intervalValue }
    await addTreatment({
      id: generateId(),
      medicationId: selectedMed.id,
      frequencyType,
      frequencyConfig: frequencyConfig as any,
      doses: doses.map((d) => ({ ...d, doseValue: doseValue || selectedMed.doseValue, doseUnit: doseUnit || selectedMed.doseUnit })),
      startDate,
      endDate: indefinite ? undefined : endDate || undefined,
      active: true,
      createdAt: new Date().toISOString(),
    })
  }

  const next = () => setStep((step + 1) as Step)
  const prev = () => setStep((step - 1) as Step)

  switch (step) {
    case 1:
      return <Step1SelectMedication medications={medications} selected={selectedMed} onSelect={(m) => { setSelectedMed(m); if (m) { setDoseValue(m.doseValue); setDoseUnit(m.doseUnit); setPresentation(m.presentation) } }} onNext={next} />
    case 2:
      return <Step2DoseConfig doseValue={doseValue} setDoseValue={setDoseValue} doseUnit={doseUnit} setDoseUnit={setDoseUnit} presentation={presentation} setPresentation={setPresentation} onPrev={prev} onNext={next} medicationName={selectedMed?.name || ''} />
    case 3:
      return <Step3Frequency frequencyType={frequencyType} setFrequencyType={setFrequencyType} timesPerDay={timesPerDay} setTimesPerDay={setTimesPerDay} specificDays={specificDays} setSpecificDays={setSpecificDays} intervalValue={intervalValue} setIntervalValue={setIntervalValue} doseValue={doseValue || selectedMed?.doseValue || 0} doseUnit={doseUnit || selectedMed?.doseUnit || ''} presentation={presentation} doses={doses} setDoses={setDoses} onPrev={prev} onNext={next} />
    case 4:
      return <Step4Duration startDate={startDate} setStartDate={setStartDate} endDate={endDate} setEndDate={setEndDate} indefinite={indefinite} setIndefinite={setIndefinite} onPrev={prev} onSave={handleSave} />
  }
}
```

- [ ] **Step 2: Step1SelectMedication**

`src/wizard/Step1SelectMedication.tsx`:
```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ArrowRight } from 'lucide-react'
import type { Medication } from '../types'

interface Props {
  medications: Medication[]
  selected: Medication | null
  onSelect: (m: Medication | null) => void
  onNext: () => void
}

export function Step1SelectMedication({ medications, selected, onSelect, onNext }: Props) {
  const [search, setSearch] = useState('')
  const filtered = medications.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <h2 className="text-lg font-bold mb-3 text-text dark:text-white">Nuevo tratamiento</h2>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <p className="text-xs font-medium text-gray-500 mb-2">Medicamento</p>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar medicamento..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex flex-col gap-1.5 max-h-60 overflow-y-auto">
          {filtered.map((m) => (
            <div key={m.id} onClick={() => onSelect(m)}
              className={`p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all duration-200 ${
                selected?.id === m.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: m.color || '#0891B2' }}>{m.name[0]}</div>
              <div>
                <div className="font-medium text-sm text-text dark:text-white">{m.name}</div>
                <div className="text-xs text-gray-400">{m.doseValue} {m.doseUnit}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => {}} className="w-full mt-2 p-3 rounded-xl text-primary font-medium text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-primary/5 transition-colors">
          + Agregar medicamento nuevo
        </button>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onNext} disabled={!selected} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all duration-200">
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Step2DoseConfig**

`src/wizard/Step2DoseConfig.tsx`:
```tsx
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { Presentation } from '../types'

const presentations: { value: Presentation; label: string }[] = [
  { value: 'pastilla', label: 'Pastilla' }, { value: 'capsula', label: 'Cápsula' },
  { value: 'tableta', label: 'Tableta' }, { value: 'inyeccion', label: 'Inyección' },
  { value: 'solucion', label: 'Solución' }, { value: 'gotas', label: 'Gotas' },
  { value: 'inhalador', label: 'Inhalador' }, { value: 'otro', label: 'Otro' },
]

interface Props {
  doseValue: number; setDoseValue: (v: number) => void
  doseUnit: string; setDoseUnit: (v: string) => void
  presentation: Presentation; setPresentation: (v: Presentation) => void
  onPrev: () => void; onNext: () => void; medicationName: string
}

export function Step2DoseConfig({ doseValue, setDoseValue, doseUnit, setDoseUnit, presentation, setPresentation, onPrev, onNext, medicationName }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onPrev} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-text dark:text-white">{medicationName}</h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium mb-2 block">Presentación</label>
          <div className="grid grid-cols-4 gap-2">
            {presentations.map((p) => (
              <button key={p.value} onClick={() => setPresentation(p.value)}
                className={`py-2 px-1 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                  presentation === p.value ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                }`}>{p.label}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block">Dosis por toma</label>
          <div className="flex gap-3 items-center">
            <input type="number" value={doseValue} onChange={(e) => setDoseValue(Number(e.target.value))}
              className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            <input value={doseUnit} onChange={(e) => setDoseUnit(e.target.value)}
              className="w-24 px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>
      <div className="flex justify-end mt-4">
        <button onClick={onNext} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-primary/90 transition-all">
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Step3Frequency**

`src/wizard/Step3Frequency.tsx`:
```tsx
import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { FrequencyType, Dose } from '../types'

interface Props {
  frequencyType: FrequencyType; setFrequencyType: (v: FrequencyType) => void
  timesPerDay: number; setTimesPerDay: (v: number) => void
  specificDays: number[]; setSpecificDays: (v: number[]) => void
  intervalValue: number; setIntervalValue: (v: number) => void
  doseValue: number; doseUnit: string; presentation: string
  doses: Dose[]; setDoses: (v: Dose[]) => void
  onPrev: () => void; onNext: () => void
}

const freqOptions: { value: FrequencyType; label: string; icon: string }[] = [
  { value: 'daily', label: 'Cada día', icon: '📅' },
  { value: 'specific_days', label: 'Días específicos', icon: '📆' },
  { value: 'every_x_days', label: 'Cada X días', icon: '🔄' },
  { value: 'every_x_weeks', label: 'Cada X semanas', icon: '📆' },
  { value: 'every_x_months', label: 'Cada X meses', icon: '📅' },
  { value: 'as_needed', label: 'Según sea necesario', icon: '⚡' },
]

const dayLabels = ['D', 'L', 'M', 'X', 'J', 'V', 'S']

export function Step3Frequency(props: Props) {
  const { frequencyType, setFrequencyType, timesPerDay, setTimesPerDay, specificDays, setSpecificDays, intervalValue, setIntervalValue, doseValue, doseUnit, presentation, doses, setDoses, onPrev, onNext } = props

  const updateDoseTime = (index: number, time: string) => {
    const next = [...doses]
    next[index] = { ...next[index], time }
    setDoses(next)
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onPrev} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-text dark:text-white">Frecuencia</h2>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        {freqOptions.map((opt) => (
          <button key={opt.value} onClick={() => { setFrequencyType(opt.value); if (opt.value !== 'daily') setTimesPerDay(1) }}
            className={`w-full p-3 rounded-xl flex items-center gap-3 mb-1.5 cursor-pointer transition-all ${
              frequencyType === opt.value ? 'bg-primary/10 text-primary font-medium' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <span>{opt.icon}</span><span className="text-sm">{opt.label}</span>
          </button>
        ))}
      </div>

      {frequencyType === 'daily' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <label className="text-xs font-medium mb-3 block">Veces al día</label>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((n) => (
              <button key={n} onClick={() => {
                setTimesPerDay(n)
                setDoses(Array.from({ length: n }, (_, i) => ({ label: `Dosis #${i + 1}`, time: `${String(8 + i * 4).padStart(2, '0')}:00`, doseValue, doseUnit })))
              }}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all ${
                  timesPerDay === n ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                }`}>{n} vez</button>
            ))}
            <input type="number" min={5} max={25} value={timesPerDay > 4 ? timesPerDay : ''} placeholder="N"
              onChange={(e) => {
                const n = Number(e.target.value)
                if (n >= 5 && n <= 25) { setTimesPerDay(n); setDoses(Array.from({ length: n }, (_, i) => ({ label: `Dosis #${i + 1}`, time: `${String(8 + Math.floor(i * 24 / n)).padStart(2, '0')}:00`, doseValue, doseUnit }))) }
              }}
              className="w-16 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
          </div>
          {doses.slice(0, timesPerDay).map((d, i) => (
            <div key={i} className="flex items-center gap-3 mb-2">
              <span className="text-xs font-medium w-16">{d.label}</span>
              <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              <span className="text-xs text-gray-400">{doseValue} {doseUnit}</span>
            </div>
          ))}
        </div>
      )}

      {frequencyType === 'specific_days' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <label className="text-xs font-medium mb-3 block">Selecciona los días</label>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {dayLabels.map((l, i) => (
              <button key={l} onClick={() => setSpecificDays(specificDays.includes(i) ? specificDays.filter((d) => d !== i) : [...specificDays, i])}
                className={`p-3 rounded-xl text-sm font-medium cursor-pointer transition-all ${
                  specificDays.includes(i) ? 'bg-primary text-white' : 'bg-gray-100 dark:bg-gray-700'
                }`}>{l}</button>
            ))}
          </div>
          {doses.slice(0, 1).map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium">Dosis</span>
              <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              <span className="text-xs text-gray-400">{doseValue} {doseUnit}</span>
            </div>
          ))}
        </div>
      )}

      {(frequencyType === 'every_x_days' || frequencyType === 'every_x_weeks' || frequencyType === 'every_x_months') && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <label className="text-xs font-medium mb-3 block">
            Cada <input type="number" min={1} max={frequencyType === 'every_x_months' ? 12 : frequencyType === 'every_x_weeks' ? 25 : 31}
              value={intervalValue} onChange={(e) => setIntervalValue(Number(e.target.value))}
              className="w-16 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none text-center" />
            {' '}{{ every_x_days: 'días', every_x_weeks: 'semanas', every_x_months: 'meses' }[frequencyType]}
          </label>
          {doses.slice(0, 1).map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xs font-medium">Dosis</span>
              <input type="time" value={d.time} onChange={(e) => updateDoseTime(i, e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none" />
              <span className="text-xs text-gray-400">{doseValue} {doseUnit}</span>
            </div>
          ))}
        </div>
      )}

      {frequencyType === 'as_needed' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 mt-3 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <p className="text-sm text-gray-500 text-center py-4">Sin alertas programadas. Tú marcas cuándo tomas la dosis.</p>
        </div>
      )}

      <div className="flex justify-end mt-4">
        <button onClick={onNext} className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center gap-2 cursor-pointer hover:bg-primary/90 transition-all">
          Siguiente <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Step4Duration**

`src/wizard/Step4Duration.tsx`:
```tsx
import { ArrowLeft, Check } from 'lucide-react'

interface Props {
  startDate: string; setStartDate: (v: string) => void
  endDate: string; setEndDate: (v: string) => void
  indefinite: boolean; setIndefinite: (v: boolean) => void
  onPrev: () => void; onSave: () => void
}

export function Step4Duration({ startDate, setStartDate, endDate, setEndDate, indefinite, setIndefinite, onPrev, onSave }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onPrev} className="p-1 cursor-pointer"><ArrowLeft className="w-5 h-5" /></button>
        <h2 className="text-lg font-bold text-text dark:text-white">Duración</h2>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block">Fecha de inicio</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div>
          <label className="text-xs font-medium mb-2 block">¿Cuándo termina?</label>
          <div className="flex flex-col gap-2 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!indefinite} onChange={() => setIndefinite(false)} className="accent-primary" />
              <span className="text-sm">Fecha específica</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={indefinite} onChange={() => setIndefinite(true)} className="accent-primary" />
              <span className="text-sm">Indefinido (hasta que lo cancele)</span>
            </label>
          </div>
          {!indefinite && (
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          )}
        </div>
      </div>
      <button onClick={onSave} className="w-full mt-6 py-3 rounded-xl bg-cta text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer hover:bg-cta/90 active:scale-[0.98] transition-all">
        <Check className="w-4 h-4" /> Guardar tratamiento
      </button>
    </div>
  )
}
```

---

### Task 9: Build MorePage (placeholder)

**Files:**
- Create: `src/pages/MorePage.tsx`

- [ ] **Step 1: Write placeholder**

`src/pages/MorePage.tsx`:
```tsx
import { Construction } from 'lucide-react'

export function MorePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 dark:text-gray-500">
      <Construction className="w-16 h-16 mb-4" />
      <p className="text-lg font-medium">En construcción</p>
      <p className="text-sm mt-1">Próximamente más funciones</p>
    </div>
  )
}
```

---

### Task 10: Set up routing and App shell

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/main.tsx`

- [ ] **Step 1: App.tsx with Router**

`src/App.tsx`:
```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { MedicationsPage } from './pages/MedicationsPage'
import { MorePage } from './pages/MorePage'
import { TreatmentWizard } from './wizard/TreatmentWizard'
import { MedicationWizard } from './wizard/MedicationWizard'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/meds" element={<MedicationsPage />} />
          <Route path="/more" element={<MorePage />} />
          <Route path="/treatment/new" element={<TreatmentWizard />} />
          <Route path="/medication/new" element={<MedicationWizard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 2: main.tsx with theme initialization**

`src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

const theme = localStorage.getItem('theme')
if (theme === 'dark') document.documentElement.classList.add('dark')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Run dev server to verify**

Run: `npm run dev`
Expected: Full app renders with routing.

---

### Task 11: Implement dose auto-generation and notification checker

**Files:**
- Create: `src/hooks/useDoseChecker.ts`

- [ ] **Step 1: Write useDoseChecker hook**

`src/hooks/useDoseChecker.ts`:
```ts
import { useEffect } from 'react'
import { useTreatmentStore } from '../stores/treatmentStore'
import { getDoseLogsByDate, saveDoseLog } from '../db'
import { generateId } from '../utils/id'
import { todayISO } from '../utils/date'
import type { Treatment, Dose } from '../types'

function generateDoseLogsForTreatment(t: Treatment, date: string) {
  const logs: { treatmentId: string; medicationId: string; scheduledDate: string; scheduledTime: string; doseValue: number; doseUnit: string }[] = []
  const dateObj = new Date(date + 'T12:00:00')

  // Skip if outside treatment date range
  if (date < t.startDate) return logs
  if (t.endDate && date > t.endDate) return logs
  if (!t.active) return logs

  let shouldAdd = false
  switch (t.frequencyType) {
    case 'daily':
      shouldAdd = true
      break
    case 'specific_days':
      shouldAdd = t.frequencyConfig.days?.includes(dateObj.getDay()) ?? false
      break
    case 'every_x_days': {
      const diff = Math.floor((dateObj.getTime() - new Date(t.startDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24))
      shouldAdd = diff % (t.frequencyConfig.interval || 1) === 0
      break
    }
    case 'every_x_weeks': {
      const diffW = Math.floor((dateObj.getTime() - new Date(t.startDate + 'T12:00:00').getTime()) / (1000 * 60 * 60 * 24 * 7))
      shouldAdd = diffW % (t.frequencyConfig.interval || 1) === 0
      break
    }
    case 'every_x_months': {
      const start = new Date(t.startDate + 'T12:00:00')
      const diffM = (dateObj.getFullYear() - start.getFullYear()) * 12 + dateObj.getMonth() - start.getMonth()
      shouldAdd = diffM % (t.frequencyConfig.interval || 1) === 0
      break
    }
    case 'as_needed':
      break
  }

  if (shouldAdd) {
    for (const dose of t.doses) {
      logs.push({
        treatmentId: t.id,
        medicationId: t.medicationId,
        scheduledDate: date,
        scheduledTime: dose.time,
        doseValue: dose.doseValue,
        doseUnit: dose.doseUnit,
      })
    }
  }
  return logs
}

export function useDoseChecker() {
  const { treatments } = useTreatmentStore()

  useEffect(() => {
    if (treatments.length === 0) return
    const check = async () => {
      const date = todayISO()
      const existing = await getDoseLogsByDate(date)
      const existingKeys = new Set(existing.map((l) => `${l.treatmentId}|${l.scheduledTime}`))
      for (const t of treatments) {
        const newLogs = generateDoseLogsForTreatment(t, date)
        for (const log of newLogs) {
          const key = `${log.treatmentId}|${log.scheduledTime}`
          if (!existingKeys.has(key)) {
            await saveDoseLog({ ...log, id: generateId(), status: 'pending', scheduledDate: date })
          }
        }
      }
    }
    check()
    const interval = setInterval(check, 60000)
    return () => clearInterval(interval)
  }, [treatments])
}
```

---

### Task 12: Service worker notifications

**Files:**
- Modify: `vite.config.ts` (add custom service worker)
- Create: `public/sw.js`

- [ ] **Step 1: Configure PWA with custom SW**

Update VitePWA config in `vite.config.ts`:
```ts
VitePWA({
  registerType: 'autoUpdate',
  srcDir: 'src',
  filename: 'sw.ts',
  strategies: 'injectManifest',
  includeAssets: ['favicon.svg'],
  manifest: {
    name: 'Medi-alert',
    short_name: 'Medi-alert',
    description: 'Recordatorio de medicamentos',
    theme_color: '#0891B2',
    background_color: '#F0FDFA',
    display: 'standalone',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
})
```

- [ ] **Step 2: Request notification permission in HomePage**

Add this to HomePage's useEffect:
```ts
useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}, [])
```

Also add app badge support. After dose logs load:
```ts
useEffect(() => {
  const pending = doseLogs.filter((l) => l.status === 'pending').length
  if ('setAppBadge' in navigator) {
    navigator.setAppBadge(pending).catch(() => {})
  }
}, [doseLogs])
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Successful production build with PWA assets.

---

### Task 13: Final polish - index.html, favicon, meta tags

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Update index.html**

Update `index.html` with mobile viewport meta, theme-color, and font imports:
```html
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#0891B2" />
    <meta name="description" content="Recordatorio de medicamentos" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="apple-touch-icon" href="/icons/192.png" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&family=Noto+Sans:wght@300;400;500;700&display=swap" rel="stylesheet" />
    <title>Medi-alert</title>
  </head>
  <body class="font-figtree antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 2: Final build test**

Run: `npm run build && npm run preview`
Expected: App works, PWA install prompt available.
