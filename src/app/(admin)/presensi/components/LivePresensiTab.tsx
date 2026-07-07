'use client'

import { useMemo } from 'react'
import { useAttendanceRealtime, type AttendanceMap } from '@/hooks/useAttendanceRealtime'
import { getRateStyle } from '@/lib/percentages'

interface Student {
  id: string
  name: string
  class_name?: string
}

interface LivePresensiTabProps {
  meetingId: string
  students: Student[]
  initialAttendance: AttendanceMap
}

const STATUS_LABEL: Record<string, string> = {
  H: 'Hadir',
  I: 'Izin',
  S: 'Sakit',
  A: 'Alfa',
}

const STATUS_DOT: Record<string, string> = {
  H: 'bg-green-500',
  I: 'bg-blue-500',
  S: 'bg-yellow-500',
  A: 'bg-gray-400',
}

/**
 * Read-only "Live / Infocus" view of meeting attendance. Designed for
 * projection during pengajian: large fonts, a big hadir/total counter, and a
 * name grid that updates in realtime (via useAttendanceRealtime) as teachers
 * mark attendance elsewhere — no manual refresh needed.
 */
export default function LivePresensiTab({ meetingId, students, initialAttendance }: LivePresensiTabProps) {
  const { attendanceMap, connectionStatus } = useAttendanceRealtime(meetingId, {
    initialAttendance,
  })

  const total = students.length
  const hadirCount = useMemo(
    () => students.filter((s) => attendanceMap[s.id]?.status === 'H').length,
    [students, attendanceMap]
  )
  const percentage = total > 0 ? Math.round((hadirCount / total) * 100) : 0

  const sortedStudents = useMemo(() => {
    // Hadir students first (most relevant during live roll-call), then by name.
    return [...students].sort((a, b) => {
      const aHadir = attendanceMap[a.id]?.status === 'H' ? 0 : 1
      const bHadir = attendanceMap[b.id]?.status === 'H' ? 0 : 1
      if (aHadir !== bHadir) return aHadir - bHadir
      return a.name.localeCompare(b.name)
    })
  }, [students, attendanceMap])

  return (
    <div className="space-y-6">
      {/* Big counter — designed to be readable from across a room on a projector */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-8 text-center">
        <div className="text-lg font-medium text-gray-500 dark:text-gray-400">Hadir</div>
        <div className={`text-6xl sm:text-7xl font-extrabold ${getRateStyle(percentage, 'text')}`}>
          {hadirCount} <span className="text-3xl sm:text-4xl text-gray-400 dark:text-gray-500">/ {total}</span>
        </div>
        <div className={`mt-2 inline-block px-4 py-1 rounded-full text-lg font-bold ${getRateStyle(percentage, 'bg')} ${getRateStyle(percentage, 'text')}`}>
          {percentage}%
        </div>
        {connectionStatus !== 'SUBSCRIBED' && (
          <div className="mt-3 text-sm text-yellow-600 dark:text-yellow-400">
            {connectionStatus === 'DISCONNECTED' ? 'Menghubungkan...' : `Status: ${connectionStatus}`}
          </div>
        )}
      </div>

      {/* Name grid — read-only, large text for projection legibility */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {sortedStudents.map((student) => {
          const status = attendanceMap[student.id]?.status
          const isHadir = status === 'H'
          return (
            <div
              key={student.id}
              className={`rounded-lg border px-4 py-3 flex items-center gap-3 transition-colors ${
                isHadir
                  ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <span
                className={`w-3 h-3 rounded-full shrink-0 ${status ? STATUS_DOT[status] : 'bg-gray-300 dark:bg-gray-600'}`}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {student.name}
                </div>
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                  {status ? STATUS_LABEL[status] : 'Belum absen'}
                </div>
              </div>
            </div>
          )
        })}
        {sortedStudents.length === 0 && (
          <div className="col-span-full text-center text-gray-400 dark:text-gray-500 py-8">
            Tidak ada siswa untuk pertemuan ini.
          </div>
        )}
      </div>
    </div>
  )
}
