'use client'

import { DayOfWeek, getDayName } from '../types'

interface DayTabsProps {
  selected: DayOfWeek
  onChange: (day: DayOfWeek) => void
  className?: string
}

export default function DayTabs({ selected, onChange, className = '' }: DayTabsProps) {
  const days = [1, 2, 3, 4, 5, 6] as DayOfWeek[]
  const dayIcons = ['☀️', '☀️', '☀️', '☀️', '☀️', '☀️'] // All sunny for now

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${className}`}>
      <div className="flex overflow-x-auto">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => onChange(day)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              selected === day
                ? 'bg-orange-50 dark:bg-orange-900 text-orange-700 dark:text-orange-200 border-b-2 border-orange-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span className="text-sm">{dayIcons[day - 1]} {getDayName(day)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
