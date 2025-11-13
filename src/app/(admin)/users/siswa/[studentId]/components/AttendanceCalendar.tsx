'use client'

import dayjs from 'dayjs'
import { ATTENDANCE_COLORS } from '@/lib/constants/colors'
import type { AttendanceLog } from '@/app/(admin)/users/siswa/actions'

interface AttendanceCalendarProps {
  currentDate: dayjs.Dayjs
  attendanceData: AttendanceLog[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onDateClick: (date: string, meetings: AttendanceLog[]) => void
}

export default function AttendanceCalendar({
  currentDate,
  attendanceData,
  onPrevMonth,
  onNextMonth,
  onDateClick
}: AttendanceCalendarProps) {
  const daysInMonth = currentDate.daysInMonth()
  const firstDayOfMonth = currentDate.startOf('month').day()
  const today = dayjs()

  // Group attendance by date
  const attendanceByDate = attendanceData.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {} as Record<string, AttendanceLog[]>)

  // Get color for date based on attendance status
  const getDateColor = (date: string) => {
    const logs = attendanceByDate[date]
    if (!logs || logs.length === 0) return null
    
    // If multiple meetings on same day, prioritize: A > I/S > H
    const hasAbsen = logs.some(log => log.status === 'A')
    const hasIzin = logs.some(log => log.status === 'I')
    const hasSakit = logs.some(log => log.status === 'S')
    const hasHadir = logs.some(log => log.status === 'H')

    if (hasAbsen) return ATTENDANCE_COLORS.absen
    if (hasIzin) return ATTENDANCE_COLORS.izin
    if (hasSakit) return ATTENDANCE_COLORS.sakit
    if (hasHadir) return ATTENDANCE_COLORS.hadir
    return null
  }

  // Render calendar days
  const renderCalendarDays = () => {
    const days = []
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayOfMonth + 2
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
      const date = isValidDay ? currentDate.date(dayNumber).format('YYYY-MM-DD') : null
      const isToday = date && dayjs(date).isSame(today, 'day')
      const color = date ? getDateColor(date) : null
      const meetings = date ? attendanceByDate[date] : null

      days.push(
        <button
          key={i}
          onClick={() => date && meetings && onDateClick(date, meetings)}
          disabled={!isValidDay || !meetings}
          className={`
            w-full aspect-square max-w-[60px] mx-auto rounded-full flex items-center justify-center text-sm md:text-base font-medium transition-all
            ${!isValidDay ? 'invisible' : ''}
            ${isToday ? 'ring-2 ring-blue-500' : ''}
            ${meetings ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'text-gray-400 dark:text-gray-600 cursor-default'}
            ${color ? 'text-white shadow-md' : 'text-gray-700 dark:text-gray-300'}
          `}
          style={{
            backgroundColor: color || 'transparent',
          }}
        >
          {isValidDay ? dayNumber : ''}
        </button>
      )
    }

    return days
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Bulan sebelumnya"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {currentDate.format('MMMM YYYY')}
        </h2>
        <button
          onClick={onNextMonth}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Bulan berikutnya"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {['S', 'S', 'R', 'K', 'J', 'S', 'M'].map((day, i) => (
          <div key={i} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        {renderCalendarDays()}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.hadir }} />
          <span className="text-gray-700 dark:text-gray-300">Hadir</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.izin }} />
          <span className="text-gray-700 dark:text-gray-300">Izin</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.sakit }} />
          <span className="text-gray-700 dark:text-gray-300">Sakit</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: ATTENDANCE_COLORS.absen }} />
          <span className="text-gray-700 dark:text-gray-300">Alfa</span>
        </div>
      </div>
    </div>
  )
}
