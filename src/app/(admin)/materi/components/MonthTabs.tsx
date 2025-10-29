'use client'

import { Month, Semester, getSemesterMonths, getMonthName } from '../types'

interface MonthTabsProps {
  semester: Semester
  selected: Month
  onChange: (month: Month) => void
  className?: string
}

export default function MonthTabs({ semester, selected, onChange, className = '' }: MonthTabsProps) {
  const availableMonths = getSemesterMonths(semester)

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${className}`}>
      <div className="flex overflow-x-auto">
        {availableMonths.map((month) => (
          <button
            key={month}
            onClick={() => onChange(month)}
            className={`flex-1 px-3 py-2 text-sm font-medium transition-colors ${
              selected === month
                ? 'bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-200 border-b-2 border-green-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {getMonthName(month)}
          </button>
        ))}
      </div>
    </div>
  )
}
