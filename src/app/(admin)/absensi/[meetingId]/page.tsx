'use client'

import React, { useState, useRef, useMemo, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMeetingAttendance } from '../hooks/useMeetingAttendance'
import { saveAttendanceForMeeting } from '../actions'
import AttendanceTable from '../components/AttendanceTable'
import ReasonModal from '../components/ReasonModal'
import SummaryCard from '../components/SummaryCard'
import LoadingState from '../components/LoadingState'
import Button from '@/components/ui/button/Button'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import 'dayjs/locale/id' // Import Indonesian locale
import { getCurrentUserId } from '@/lib/userUtils'
import { invalidateMeetingsCache } from '../utils/cache'
import { useUserProfile } from '@/stores/userProfileStore'
import { canUserEditMeetingAttendance } from '@/app/(admin)/absensi/utils/meetingHelpersClient'
import DataFilter from '@/components/shared/DataFilter'
import { useClasses } from '@/hooks/useClasses'
import { useKelompok } from '@/hooks/useKelompok'
import { isCaberawitClass, isTeacherClass, isSambungDesaEligible } from '@/lib/utils/classHelpers'

// Set Indonesian locale
dayjs.locale('id')

export default function MeetingAttendancePage() {
  const params = useParams()
  const router = useRouter()
  const meetingId = params.meetingId as string

  const {
    meeting,
    attendance,
    students,
    loading,
    error,
    mutate,
    calculateAttendancePercentage,
    getAttendanceStats
  } = useMeetingAttendance(meetingId)

  const [saving, setSaving] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [localAttendance, setLocalAttendance] = useState(attendance)
  const hasInitialized = useRef(false)
  const { profile: userProfile } = useUserProfile()
  const { classes: classesData } = useClasses()
  const { kelompok: kelompokData } = useKelompok()

  // DataFilter state
  const [filters, setFilters] = useState<{
    daerah: string[]
    desa: string[]
    kelompok: string[]
    kelas: string[]
    gender?: string
  }>({
    daerah: [],
    desa: [],
    kelompok: [],
    kelas: [],
    gender: ''
  })

  // Update local attendance when data changes (only once when data loads)
  React.useEffect(() => {
    if (attendance && Object.keys(attendance).length > 0 && !hasInitialized.current) {
      setLocalAttendance(attendance)
      hasInitialized.current = true
    }
  }, [attendance])

  const handleStatusChange = (studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    if (status === 'I') {
      setSelectedStudent(studentId)
      setShowReasonModal(true)
    } else {
      setLocalAttendance(prev => ({
        ...prev,
        [studentId]: { status, reason: undefined }
      }))
    }
  }

  const handleReasonSubmit = (reason: string) => {
    if (selectedStudent) {
      setLocalAttendance(prev => ({
        ...prev,
        [selectedStudent]: { status: 'I', reason }
      }))
    }
    setShowReasonModal(false)
    setSelectedStudent(null)
  }

  const handleSave = async () => {
    if (!meeting) return

    setSaving(true)
    try {
      const attendanceData = Object.entries(localAttendance).map(([studentId, data]) => ({
        student_id: studentId,
        date: meeting.date, // Keep for compatibility
        status: data.status,
        reason: data.reason || null
      }))

      const result = await saveAttendanceForMeeting(meetingId, attendanceData)

      if (result.success) {
        toast.success('Data absensi berhasil disimpan!')
        mutate() // Refresh current page data

        // Revalidate meetings cache for main absensi page
        const userId = await getCurrentUserId()
        if (userId) {
          // Get classId from meeting data to invalidate the correct cache
          const classId = meeting?.class_id
          await invalidateMeetingsCache(userId, classId)
        }
      } else {
        toast.error('Gagal menyimpan data absensi: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }

  // Calculate stats from local attendance state (real-time updates)
  const calculateLocalStats = () => {
    // Only count stats for visible students
    const visibleStudentIds = new Set(visibleStudents.map(s => s.id))
    const records = Object.entries(localAttendance)
      .filter(([studentId]) => visibleStudentIds.has(studentId))
      .map(([_, data]) => data)

    return {
      total: records.length,
      hadir: records.filter(record => record.status === 'H').length,
      izin: records.filter(record => record.status === 'I').length,
      sakit: records.filter(record => record.status === 'S').length,
      absen: records.filter(record => record.status === 'A').length
    }
  }

  const calculateLocalAttendancePercentage = () => {
    if (!meeting || visibleStudents.length === 0) {
      return 0
    }

    const totalStudents = visibleStudents.length
    const visibleStudentIds = new Set(visibleStudents.map(s => s.id))

    const presentCount = Object.entries(localAttendance)
      .filter(([studentId, record]) => {
        const isVisible = visibleStudentIds.has(studentId)
        const isPresent = record.status === 'H'
        return isVisible && isPresent
      }).length

    const percentage = Math.round((presentCount / totalStudents) * 100)
    return percentage
  }

  // Check if current user is meeting creator
  const isMeetingCreator = meeting?.teacher_id === userProfile?.id

  // Check if meeting is for "Pengajar" class
  const isPengajarMeeting = useMemo(() => {
    if (!meeting) return false

    // Check from primary class
    if (meeting.classes && isTeacherClass(meeting.classes)) {
      return true
    }

    // Check from class_ids array (for multi-class meetings)
    // Note: For simplicity, we rely on primary class check first
    // If needed, we can enhance this to fetch class details for class_ids array
    return false
  }, [meeting])

  // Check if teacher teaches Paud or Kelas 1-6
  const teacherCaberawit = useMemo(() => {
    if (!userProfile?.classes) return false
    return userProfile.classes.some(c => isCaberawitClass(c))
  }, [userProfile?.classes])

  // Filter students based on user role and filters
  const visibleStudents = useMemo(() => {
    let filtered = students

    // Role-based filtering (existing logic) - support multiple classes
    // Skip filtering for Pengajar meetings (students should be visible to Paud/Kelas 1-6 teachers)
    if (userProfile?.role === 'teacher' && !isMeetingCreator && !isPengajarMeeting) {
      const myClassIds = userProfile.classes?.map(c => c.id) || []
      // Note: For meeting attendance, we filter by class_id (primary class)
      // This is because students in meeting snapshot are already filtered by meeting's classes
      filtered = filtered.filter(s => myClassIds.includes(s.class_id))
    }

    // Kelompok-based filtering (for Admin Kelompok and single-kelompok Teachers)
    if (!isMeetingCreator && (userProfile?.role === 'admin' || userProfile?.role === 'teacher')) {
      // Get user's kelompok IDs from their classes (for teachers) or direct kelompok_id (for admin kelompok)
      let userKelompokIds: string[] = []

      if (userProfile.role === 'teacher' && userProfile.classes) {
        // For teachers: get kelompok IDs from all their classes
        userKelompokIds = userProfile.classes
          .map((c: any) => {
            // Try to get kelompok_id from the class object
            if (c.kelompok_id) return c.kelompok_id
            // Otherwise lookup from classesData
            const fullClass = classesData.find(cls => cls.id === c.id)
            return fullClass?.kelompok_id
          })
          .filter(Boolean) as string[]
      } else if (userProfile.role === 'admin' && userProfile.kelompok_id) {
        // For admin kelompok: use their kelompok_id
        userKelompokIds = [userProfile.kelompok_id]
      }

      // Check if user has multiple kelompok (special case for teachers teaching multiple kelompok)
      const uniqueKelompokIds = [...new Set(userKelompokIds)]
      const hasMultipleKelompok = uniqueKelompokIds.length > 1

      // Apply kelompok filter only if user has kelompok restrictions
      if (uniqueKelompokIds.length > 0) {
        filtered = filtered.filter(student => {
          // Check if student belongs to any of user's kelompok
          // Get student's kelompok from their classes
          const studentKelompokIds = new Set<string>()

          // Check from primary class
          const primaryClass = classesData.find(c => c.id === student.class_id)
          if (primaryClass?.kelompok_id) {
            studentKelompokIds.add(primaryClass.kelompok_id)
          }

          // Check from junction table classes
          if (student.classes && Array.isArray(student.classes)) {
            student.classes.forEach(cls => {
              const fullClass = classesData.find(c => c.id === cls.id)
              if (fullClass?.kelompok_id) {
                studentKelompokIds.add(fullClass.kelompok_id)
              }
            })
          }

          // Student is visible if they belong to any of user's kelompok
          return uniqueKelompokIds.some(kelompokId => studentKelompokIds.has(kelompokId))
        })
      }
    }

    // Gender filter
    if (filters.gender) {
      filtered = filtered.filter(s => s.gender === filters.gender)
    }

    // Kelompok filter (from UI filter dropdown)
    if (filters.kelompok && filters.kelompok.length > 0) {
      filtered = filtered.filter(student => {
        // Get student's kelompok IDs
        const studentKelompokIds = new Set<string>()

        // Check from primary class
        const primaryClass = classesData.find(c => c.id === student.class_id)
        if (primaryClass?.kelompok_id) {
          studentKelompokIds.add(primaryClass.kelompok_id)
        }

        // Check from junction table classes
        if (student.classes && Array.isArray(student.classes)) {
          student.classes.forEach(cls => {
            const fullClass = classesData.find(c => c.id === cls.id)
            if (fullClass?.kelompok_id) {
              studentKelompokIds.add(fullClass.kelompok_id)
            }
          })
        }

        // Student matches if any of their kelompok is in the filter
        return filters.kelompok.some(kelompokId => studentKelompokIds.has(kelompokId))
      })
    }

    // Class filter (for multi-class meetings) - support multiple classes per student
    if (filters.kelas && filters.kelas.length > 0) {
      // Support comma-separated class IDs from DataFilter
      const selectedClassIds = filters.kelas.flatMap(k => k.split(','))
      filtered = filtered.filter(s => {
        // Check primary class_id (for backward compatibility)
        if (selectedClassIds.includes(s.class_id)) return true

        // Check all classes from junction table (for multi-class students)
        if (s.classes && Array.isArray(s.classes)) {
          return s.classes.some(cls => selectedClassIds.includes(cls.id))
        }

        return false
      })
    }

    return filtered
  }, [students, userProfile, isMeetingCreator, isPengajarMeeting, filters, classesData])

  // Determine if a specific student's attendance can be edited
  const canEditStudent = useCallback((studentId: string) => {
    if (!userProfile || !meeting) return false

    const student = students.find(s => s.id === studentId)
    if (!student) return false

    // Special case: Allow teachers (Paud/Kelas 1-6) to edit "Pengajar" meeting attendance
    if (isPengajarMeeting && teacherCaberawit) {
      return true
    }

    return canUserEditMeetingAttendance(
      userProfile.role,
      isMeetingCreator,
      student.class_id,
      userProfile.classes?.map(c => c.id) || []
    )
  }, [userProfile, meeting, students, isMeetingCreator, isPengajarMeeting, teacherCaberawit])

  // Prepare class list for filter - only for multi-class meetings
  const classListForFilter = useMemo(() => {
    if (!meeting?.class_ids || meeting.class_ids.length <= 1) return []

    // Get all unique class IDs from students (including from junction table)
    const classIds = new Set<string>()
    students.forEach(s => {
      // Add primary class_id
      if (s.class_id) classIds.add(s.class_id)

      // Add all classes from junction table
      if (s.classes && Array.isArray(s.classes)) {
        s.classes.forEach(cls => classIds.add(cls.id))
      }
    })

    // Filter to only classes that are in meeting.class_ids
    const meetingClassIds = new Set(meeting.class_ids)
    const relevantClassIds = Array.from(classIds).filter(id => meetingClassIds.has(id))

    // For teacher non-creator, only show their classes
    if (userProfile?.role === 'teacher' && !isMeetingCreator) {
      const myClassIds = userProfile.classes?.map(c => c.id) || []
      const teacherRelevantClassIds = relevantClassIds.filter(id => myClassIds.includes(id))

      // Only show filter if teacher has more than 1 class in this meeting
      if (teacherRelevantClassIds.length <= 1) return []

      // Get class details with kelompok info
      // First try to use meeting.allClasses if available (from backend, bypasses RLS)
      let classDetails: Array<{ id: string; name: string; kelompok_id: string | null; kelompok_name: string | null }> = []

      if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
        // Use allClasses from backend (bypasses RLS)
        classDetails = meeting.allClasses
          .filter((c: any) => teacherRelevantClassIds.includes(c.id))
          .map((c: any) => ({
            id: c.id,
            name: c.name,
            kelompok_id: c.kelompok_id,
            kelompok_name: c.kelompok?.name || null
          }))
      } else {
        // Fallback: get from classesData and kelompokData
        classDetails = teacherRelevantClassIds.map(id => {
          const classData = classesData.find(c => c.id === id)
          const kelompok = classData?.kelompok_id && kelompokData
            ? kelompokData.find(k => k.id === classData.kelompok_id)
            : null

          return {
            id,
            name: classData?.name || 'Unknown',
            kelompok_id: classData?.kelompok_id || null,
            kelompok_name: kelompok?.name || null
          }
        })
      }

      // For SAMBUNG_DESA meetings, filter to only show eligible classes (exclude Pengajar/PAUD/Caberawit)
      if (meeting.meeting_type_code === 'SAMBUNG_DESA') {
        classDetails = classDetails.filter(cls => {
          const classData = classesData.find(c => c.id === cls.id) ||
                           (meeting.allClasses && Array.isArray(meeting.allClasses)
                             ? meeting.allClasses.find((c: any) => c.id === cls.id)
                             : null)
          return classData && isSambungDesaEligible(classData)
        })
      }

      // Check for duplicate class names
      const nameCounts = classDetails.reduce((acc, cls) => {
        acc[cls.name] = (acc[cls.name] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Format labels with kelompok name if duplicate
      return classDetails.map(cls => {
        const hasDuplicate = nameCounts[cls.name] > 1
        const label = hasDuplicate && cls.kelompok_name
          ? `${cls.name} (${cls.kelompok_name})`
          : cls.name

        return {
          id: cls.id,
          name: label,
          kelompok_id: cls.kelompok_id
        }
      })
    }

    // For admin/creator, show all classes
    // Get class details with kelompok info
    // First try to use meeting.allClasses if available (from backend, bypasses RLS)
    let classDetails: Array<{ id: string; name: string; kelompok_id: string | null; kelompok_name: string | null }> = []

    if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
      // Use allClasses from backend (bypasses RLS)
      classDetails = meeting.allClasses
        .filter((c: any) => relevantClassIds.includes(c.id))
        .map((c: any) => ({
          id: c.id,
          name: c.name,
          kelompok_id: c.kelompok_id,
          kelompok_name: c.kelompok?.name || null
        }))
    } else {
      // Fallback: get from classesData and kelompokData
      classDetails = relevantClassIds.map(id => {
        const classData = classesData.find(c => c.id === id)
        const kelompok = classData?.kelompok_id && kelompokData
          ? kelompokData.find(k => k.id === classData.kelompok_id)
          : null

        return {
          id,
          name: classData?.name || 'Unknown',
          kelompok_id: classData?.kelompok_id || null,
          kelompok_name: kelompok?.name || null
        }
      })
    }

    // For SAMBUNG_DESA meetings, filter to only show eligible classes (exclude Pengajar/PAUD/Caberawit)
    if (meeting.meeting_type_code === 'SAMBUNG_DESA') {
      classDetails = classDetails.filter(cls => {
        const classData = classesData.find(c => c.id === cls.id) ||
                         (meeting.allClasses && Array.isArray(meeting.allClasses)
                           ? meeting.allClasses.find((c: any) => c.id === cls.id)
                           : null)
        return classData && isSambungDesaEligible(classData)
      })
    }

    // Check for duplicate class names
    const nameCounts = classDetails.reduce((acc, cls) => {
      acc[cls.name] = (acc[cls.name] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Format labels with kelompok name if duplicate
    return classDetails.map(cls => {
      const hasDuplicate = nameCounts[cls.name] > 1
      const label = hasDuplicate && cls.kelompok_name
        ? `${cls.name} (${cls.kelompok_name})`
        : cls.name

      return {
        id: cls.id,
        name: label,
        kelompok_id: cls.kelompok_id
      }
    })
  }, [meeting, students, userProfile, isMeetingCreator, classesData, kelompokData])

  // Build kelompok list for filter - only for multi-kelompok meetings
  const kelompokListForFilter = useMemo(() => {
    if (!meeting?.class_ids || meeting.class_ids.length === 0) return []

    // Get all unique kelompok IDs from meeting classes
    const kelompokIds = new Set<string>()
    const kelompokMap = new Map<string, { id: string; name: string; desa_id: string }>()

    // First try to use meeting.allClasses if available
    if (meeting.allClasses && Array.isArray(meeting.allClasses) && meeting.allClasses.length > 0) {
      meeting.allClasses.forEach((classData: any) => {
        if (classData.kelompok_id && classData.kelompok) {
          const kelompok = Array.isArray(classData.kelompok) ? classData.kelompok[0] : classData.kelompok
          if (kelompok?.id && kelompok?.name && kelompok?.desa_id) {
            kelompokMap.set(kelompok.id, {
              id: kelompok.id,
              name: kelompok.name,
              desa_id: kelompok.desa_id
            })
          }
        }
      })
    } else {
      // Fallback: get from classesData and kelompokData
      meeting.class_ids.forEach((classId: string) => {
        const classData = classesData.find(c => c.id === classId)
        if (classData?.kelompok_id) {
          const kelompok = kelompokData?.find(k => k.id === classData.kelompok_id)
          if (kelompok && kelompok.desa_id) {
            kelompokMap.set(kelompok.id, {
              id: kelompok.id,
              name: kelompok.name,
              desa_id: kelompok.desa_id
            })
          }
        }
      })
    }

    return Array.from(kelompokMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [meeting, classesData, kelompokData])

  // Determine if class filter should show
  const showClassFilter = meeting?.class_ids && meeting.class_ids.length > 1 && classListForFilter.length > 0

  // Determine if kelompok filter should show
  const showKelompokFilter = kelompokListForFilter.length > 1

  const goBack = () => {
    router.push('/absensi')
  }

  if (loading) {
    return <LoadingState />
  }

  if (error || !meeting) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Pertemuan tidak ditemukan
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error?.message || 'Pertemuan yang Anda cari tidak ditemukan'}
            </p>
            <button
              onClick={goBack}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Kembali ke Daftar Pertemuan
            </button>
          </div>
        </div>
      </div>
    )
  }

  const localStats = calculateLocalStats()
  const localAttendancePercentage = calculateLocalAttendancePercentage()

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4">
          {/* <div className="flex items-center gap-4 mb-4">
            <button
              onClick={goBack}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Kembali"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {meeting.title}
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                {dayjs(meeting.date).format('dddd, DD MMMM YYYY')} • {meeting.classes[0]?.name || ''}
              </p>
            </div>
          </div> */}

          {/* Meeting Info */}
          {/* rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 */}
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {meeting.topic && (
                  <div className="mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">Topik</h3>
                    <p className="whitespace-pre-wrap">{meeting.topic}</p>
                  </div>
                )}
                {meeting.description && (
                  <div className="text-gray-600 dark:text-gray-400 mb-2">
                    <p className="text-lg font-semibold text-gray-900">Deskripsi</p>
                    <p className="whitespace-pre-wrap">{meeting.description}</p>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{dayjs(meeting.date).format('dddd, DD MMMM YYYY')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <SummaryCard
            title={`Siswa (${visibleStudents.length} orang)`}
            subtitle={`${localStats.hadir} hadir, ${localStats.absen} alfa, ${localStats.izin} izin, ${localStats.sakit} sakit`}
            percentage={localAttendancePercentage}
            percentageLabel="Kehadiran"
          />
        </div>

        {/* Filters */}
        <DataFilter
          filters={filters}
          onFilterChange={setFilters}
          userProfile={userProfile}
          daerahList={[]}
          desaList={[]}
          kelompokList={kelompokListForFilter}
          classList={classListForFilter}
          showGender={true}
          showKelas={showClassFilter}
          showDaerah={false}
          showDesa={false}
          showKelompok={showKelompokFilter}
          variant="page"
        />

        {/* Attendance Table */}
        <div className="mb-8">
          <AttendanceTable
            students={visibleStudents}
            attendance={localAttendance}
            onStatusChange={handleStatusChange}
            canEditStudent={canEditStudent}
          />
        </div>

        {/* Save Button - Mobile: floating, Desktop: static */}
        <div className="fixed sm:static bottom-16 left-4 right-4 sm:flex sm:justify-end z-50 shadow-lg sm:shadow-none">
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            className="w-full sm:w-auto"
            loading={saving}
            loadingText="Menyimpan..."
          >
            Simpan
          </Button>
        </div>

        {/* Reason Modal */}
        <ReasonModal
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false)
            setSelectedStudent(null)
          }}
          onSubmit={handleReasonSubmit}
          studentName={students.find(s => s.id === selectedStudent)?.name || ''}
        />
      </div>
    </div>
  )
}
