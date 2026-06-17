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
