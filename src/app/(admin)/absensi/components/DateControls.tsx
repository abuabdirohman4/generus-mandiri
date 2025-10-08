'use client'

import { DatePicker } from 'antd'
import dayjs from 'dayjs'

interface DateControlsProps {
  selectedDate: Date
  onDateChange: (date: dayjs.Dayjs | null) => void
  onPreviousDay: () => void
  onNextDay: () => void
}

export default function DateControls({
  selectedDate,
  onDateChange,
  onPreviousDay,
  onNextDay
}: DateControlsProps) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-2">
          {/* Previous Day Button */}
          <button
            onClick={onPreviousDay}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Hari sebelumnya"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* DatePicker */}
          <DatePicker
            value={dayjs(selectedDate)}
            onChange={onDateChange}
            format="DD/MM/YYYY"
            placeholder="Pilih tanggal"
            size="middle"
          />

          {/* Next Day Button */}
          <button
            onClick={onNextDay}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            title="Hari berikutnya"
          >
            <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
