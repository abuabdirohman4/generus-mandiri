'use client'

import { Semester } from '../types'

interface SemesterTabsProps {
  selected: Semester
  onChange: (semester: Semester) => void
  className?: string
}

export default function SemesterTabs({ selected, onChange, className = '' }: SemesterTabsProps) {
  const semesters = [
    { value: 1 as Semester, label: 'Semester 1', months: 'Jan - Jun' },
    { value: 2 as Semester, label: 'Semester 2', months: 'Jul - Des' }
  ]

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border ${className}`}>
      <div className="flex">
        {semesters.map((semester) => (
          <button
            key={semester.value}
            onClick={() => onChange(semester.value)}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              selected === semester.value
                ? 'bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 border-b-2 border-blue-500'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <div className="text-center">
              <div className="font-semibold">{semester.label}</div>
              <div className="text-xs opacity-75">{semester.months}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
