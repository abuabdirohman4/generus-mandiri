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
  // Convert dayjs Sunday=0 to Monday-first: Mon=0, Tue=1, ..., Sun=6
  const firstDayOfMonth = (currentDate.startOf('month').day() + 6) % 7
  const today = dayjs()

  // Group attendance by date
  const attendanceByDate = attendanceData.reduce((acc, log) => {
    if (!acc[log.date]) acc[log.date] = []
    acc[log.date].push(log)
    return acc
  }, {} as Record<string, AttendanceLog[]>)

  // Get unique status colors for a date (ordered: A, S, I, H)
  const getDateStatusColors = (date: string): string[] => {
    const logs = attendanceByDate[date]
    if (!logs || logs.length === 0) return []

    const statusOrder: Array<keyof typeof ATTENDANCE_COLORS> = ['absen', 'sakit', 'izin', 'hadir']
    const statusMap: Record<string, keyof typeof ATTENDANCE_COLORS> = {
      A: 'absen', S: 'sakit', I: 'izin', H: 'hadir'
    }
    const presentStatuses = new Set(logs.map(log => statusMap[log.status]).filter(Boolean))
    return statusOrder.filter(s => presentStatuses.has(s)).map(s => ATTENDANCE_COLORS[s])
  }

  // Build conic-gradient string from colors (split evenly)
  const buildConicGradient = (colors: string[]): string => {
    if (colors.length === 1) return ''
    const step = 360 / colors.length
    const stops = colors.map((c, i) => `${c} ${i * step}deg ${(i + 1) * step}deg`)
    return `conic-gradient(${stops.join(', ')})`
  }

  // Render calendar days
  const renderCalendarDays = () => {
    const days = []
    const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

    for (let i = 0; i < totalCells; i++) {
      const dayNumber = i - firstDayOfMonth + 1
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth
      const date = isValidDay ? currentDate.date(dayNumber).format('YYYY-MM-DD') : null
      const isToday = date && dayjs(date).isSame(today, 'day')
      const meetings = date ? attendanceByDate[date] : null
      const statusColors = date ? getDateStatusColors(date) : []
      const isMultiple = statusColors.length > 1
      const singleColor = statusColors.length === 1 ? statusColors[0] : null
      const meetingCount = meetings?.length ?? 0

      days.push(
        <div key={i} className={`relative flex items-center justify-center ${!isValidDay ? 'invisible' : ''}`} style={{ width: '100%', maxWidth: '65px', margin: '0 auto' }}>
          <button
            onClick={() => date && meetings && onDateClick(date, meetings)}
            disabled={!isValidDay || !meetings}
            className={`
              w-full aspect-square max-w-[60px] mx-auto rounded-full flex items-center justify-center text-sm md:text-base font-medium transition-all
              ${isToday ? 'ring-2 ring-blue-500' : ''}
              ${meetings ? 'cursor-pointer hover:opacity-80 hover:scale-105' : 'text-gray-400 dark:text-gray-600 cursor-default'}
              ${singleColor ? 'text-white shadow-md' : isMultiple ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white' : 'text-gray-700 dark:text-gray-300'}
            `}
            style={{
              backgroundColor: singleColor || undefined,
              ...(isMultiple ? {
                background: `conic-gradient(from 0deg, ${statusColors.map((c, i) => {
                  const step = 360 / statusColors.length
                  return `${c} ${i * step}deg ${(i + 1) * step}deg`
                }).join(', ')})`,
                padding: '3px',
              } : {}),
            }}
          >
            {isMultiple ? (
              <span className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-gray-800 dark:text-white text-sm md:text-base font-medium">
                {isValidDay ? dayNumber : ''}
              </span>
            ) : (
              isValidDay ? dayNumber : ''
            )}
          </button>
          {/* Badge jumlah pertemuan jika > 1 */}
          {meetingCount > 1 && isValidDay && (
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gray-700 dark:bg-gray-200 text-white dark:text-gray-800 text-[10px] font-bold flex items-center justify-center shadow z-10">
              {meetingCount}
            </div>
          )}
        </div>
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
      <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
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
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full" style={{ background: `conic-gradient(${ATTENDANCE_COLORS.absen} 0deg 180deg, ${ATTENDANCE_COLORS.hadir} 180deg 360deg)` }} />
          <span className="text-gray-700 dark:text-gray-300">Campuran</span>
        </div>
      </div>
    </div>
  )
}
