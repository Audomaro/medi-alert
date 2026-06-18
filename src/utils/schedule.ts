import type { DoseSchedule } from '../types'

export function shouldGenerateForDate(s: DoseSchedule, dateStr: string): boolean {
  const d = new Date(dateStr + 'T12:00:00')
  switch (s.frequencyType) {
    case 'daily':
      return true
    case 'specific_days':
      return s.frequencyConfig.days?.includes(d.getDay()) ?? false
    case 'every_x_days': {
      const start = new Date(s.startDate + 'T12:00:00')
      const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      return diff % (s.frequencyConfig.interval || 1) === 0
    }
    case 'every_x_weeks': {
      const start = new Date(s.startDate + 'T12:00:00')
      const diff = Math.floor((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7))
      return diff % (s.frequencyConfig.interval || 1) === 0
    }
    case 'every_x_months': {
      const start = new Date(s.startDate + 'T12:00:00')
      const diff = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth()
      return diff % (s.frequencyConfig.interval || 1) === 0
    }
    case 'as_needed':
      return false
  }
}

export function generateInstanceId(scheduleId: string, date: string, time: string, label: string): string {
  return `${scheduleId}|${date}|${time}|${label}`
}
