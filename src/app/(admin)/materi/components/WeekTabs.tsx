'use client'

import { Week, romanNumeral } from '../types'

interface WeekTabsProps {
  selected: Week
  onChange: (week: Week) => void
  className?: string
}

export default function WeekTabs({ selected, onChange, className = '' }: WeekTabsProps) {
  const weeks = [1, 2, 3, 4] as Week[]

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${className}`}>
      <div className="flex">
        {weeks.map((week) => (
          <button
            key={week}
            onClick={() => onChange(week)}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
              selected === week
                ? 'bg-purple-50 dark:bg-purple-900 text-purple-700 dark:text-purple-200 border-b-2 border-purple-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Minggu {romanNumeral(week)}
          </button>
        ))}
      </div>
    </div>
  )
}
