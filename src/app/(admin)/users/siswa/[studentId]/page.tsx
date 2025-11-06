'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useStudentDetail } from './hooks/useStudentDetail'
import { AttendanceCalendar, MonthlyStats, MeetingDetailModal, AttendanceList } from './components'
import StudentDetailSkeleton from '@/components/ui/skeleton/StudentDetailSkeleton'
import Button from '@/components/ui/button/Button'
import { useUserProfile } from '@/stores/userProfileStore'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import type { AttendanceLog } from '@/app/(admin)/users/siswa/actions'

// Set Indonesian locale
dayjs.locale('id')

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const studentId = params.studentId as string

  // Read query parameters
  const monthParam = searchParams.get('month')
  const yearParam = searchParams.get('year')
  const fromParam = searchParams.get('from')

  // Initialize currentDate from query params or default to current month
  const [currentDate, setCurrentDate] = useState(() => {
    if (monthParam && yearParam) {
      return dayjs().year(parseInt(yearParam)).month(parseInt(monthParam) - 1)
    }
    return dayjs()
  })
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedMeeting, setSelectedMeeting] = useState<AttendanceLog | null>(null)

  // Use SWR hook for data fetching
  const { student, attendanceLogs, stats, isLoading, error } = useStudentDetail(studentId, currentDate)
  const { profile: userProfile } = useUserProfile()
  
  // Filter classes based on user role
  const displayedClasses = useMemo(() => {
    if (!student?.classes || student.classes.length === 0) {
      return null
    }
    
    // If admin, show all classes
    if (userProfile?.role === 'admin' || userProfile?.role === 'superadmin') {
      return student.classes
    }
    
    // If teacher, filter to only classes they teach
    if (userProfile?.role === 'teacher' && userProfile.classes) {
      const teacherClassIds = userProfile.classes.map(c => c.id)
      return student.classes.filter(c => teacherClassIds.includes(c.id))
    }
    
    // Default: return first class for backward compatibility
    return student.classes[0] ? [student.classes[0]] : null
  }, [student?.classes, userProfile])

  const handlePrevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'))
    setSelectedDate(null)
    setSelectedMeeting(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'))
    setSelectedDate(null)
    setSelectedMeeting(null)
  }

  const handleDateClick = (date: string, meetings: AttendanceLog[]) => {
    setSelectedDate(date)
    setSelectedMeeting(null)
  }

  const handleMeetingClick = (meeting: AttendanceLog) => {
    setSelectedMeeting(meeting)
  }

  const handleCloseAttendanceList = () => {
    setSelectedDate(null)
  }

  // Update back button handler
  const handleBack = () => {
    if (fromParam === 'laporan') {
      router.push('/laporan')
    } else {
      router.push('/users/siswa')
    }
  }

  if (isLoading) {
    return <StudentDetailSkeleton />
  }

  if (error || !student) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Siswa tidak ditemukan
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {(() => {
                if (!error) return 'Siswa yang Anda cari tidak ditemukan'
                if (error instanceof Error) return error.message
                if (typeof error === 'string') return error
                if (typeof error === 'object' && error !== null) {
                  // Handle Next.js error objects with name, environmentName, digest
                  if ('message' in error && typeof error.message === 'string') {
                    return error.message
                  }
                  if ('name' in error && typeof error.name === 'string') {
                    return error.name
                  }
                  return 'Terjadi kesalahan saat memuat data'
                }
                return 'Siswa yang Anda cari tidak ditemukan'
              })()}
            </p>
            <Button
              onClick={handleBack}
              variant="outline"
              className="px-4 py-2"
            >
              Kembali
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {student.name}
          </h1>
          <div className="text-gray-600 dark:text-gray-400">
            {displayedClasses && displayedClasses.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                {displayedClasses.map((cls, index) => (
                  <span 
                    key={cls.id} 
                    className="inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 rounded-full text-sm"
                  >
                    {cls.name}
                  </span>
                ))}
                {/* Show indicator if there are more classes (for admin) */}
                {userProfile?.role === 'admin' || userProfile?.role === 'superadmin' ? (
                  student.classes && student.classes.length > displayedClasses.length && (
                    <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-500">
                      +{student.classes.length - displayedClasses.length} kelas lainnya
                    </span>
                  )
                ) : null}
              </div>
            ) : (
              <span>Kelas tidak ditemukan</span>
            )}
          </div>
        </div>

        {/* Monthly Stats */}
        <MonthlyStats stats={stats} />

        {/* Calendar */}
        <AttendanceCalendar
          currentDate={currentDate}
          attendanceData={attendanceLogs}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onDateClick={handleDateClick}
        />

        {/* Attendance List for Selected Date */}
        {selectedDate && (
          <AttendanceList
            date={selectedDate}
            meetings={attendanceLogs.filter((log: AttendanceLog) => log.date === selectedDate)}
            onMeetingClick={handleMeetingClick}
            onClose={handleCloseAttendanceList}
          />
        )}

        {/* Meeting Detail Modal */}
        <MeetingDetailModal
          isOpen={!!selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          meeting={selectedMeeting}
        />
      </div>
    </div>
  )
}
