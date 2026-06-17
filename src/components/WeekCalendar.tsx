import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getWeekDates } from '../utils/date'

interface Props {
  selectedDate: string
  onSelectDate: (date: string) => void
}

export function WeekCalendar({ selectedDate, onSelectDate }: Props) {
  const [weekOffset, setWeekOffset] = useState(0)
  const week = getWeekDates(weekOffset)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setWeekOffset((o) => o - 1)}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-text/60 dark:text-gray-400" />
        </button>
        <div className="grid grid-cols-7 gap-1.5 text-center flex-1">
          {week.map((d) => {
            const isSelected = d.iso === selectedDate
            const isToday = d.active
            return (
              <div
                key={d.iso}
                onClick={() => onSelectDate(d.iso)}
                className={`rounded-xl py-2 transition-all duration-200 cursor-pointer ${
                  isToday && !isSelected
                    ? 'bg-primary text-white shadow-lg shadow-primary/30'
                    : isSelected
                      ? 'ring-2 ring-primary bg-primary/10 text-primary dark:text-white font-bold'
                      : 'text-text/70 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="text-xs font-medium">{d.day}</div>
                <div className={`font-semibold ${isToday || isSelected ? 'text-lg' : 'text-base'}`}>{d.date}</div>
              </div>
            )
          })}
        </div>
        <button
          onClick={() => setWeekOffset((o) => o + 1)}
          className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-text/60 dark:text-gray-400" />
        </button>
      </div>
    </div>
  )
}
