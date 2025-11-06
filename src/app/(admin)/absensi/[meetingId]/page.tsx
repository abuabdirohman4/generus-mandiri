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
import { mutate as globalMutate } from 'swr'
import { invalidateMeetingsCache } from '../utils/cache'
import { useUserProfile } from '@/stores/userProfileStore'
import { canUserEditMeetingAttendance } from '@/app/(admin)/absensi/utils/meetingHelpersClient'
import DataFilter from '@/components/shared/DataFilter'

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

  // Filter students based on user role and filters
  const visibleStudents = useMemo(() => {
    let filtered = students
    
    // Role-based filtering (existing logic)
    if (userProfile?.role === 'teacher' && !isMeetingCreator) {
      const myClassIds = userProfile.classes?.map(c => c.id) || []
      filtered = filtered.filter(s => myClassIds.includes(s.class_id))
    }
    
    // Gender filter
    if (filters.gender) {
      filtered = filtered.filter(s => s.gender === filters.gender)
    }
    
    // Class filter (for multi-class meetings)
    if (filters.kelas && filters.kelas.length > 0) {
      // Support comma-separated class IDs from DataFilter
      const selectedClassIds = filters.kelas.flatMap(k => k.split(','))
      filtered = filtered.filter(s => selectedClassIds.includes(s.class_id))
    }
    
    return filtered
  }, [students, userProfile, isMeetingCreator, filters])

  // Determine if a specific student's attendance can be edited
  const canEditStudent = useCallback((studentId: string) => {
    if (!userProfile || !meeting) return false
    
    const student = students.find(s => s.id === studentId)
    if (!student) return false

    return canUserEditMeetingAttendance(
      userProfile.role,
      isMeetingCreator,
      student.class_id,
      userProfile.classes?.map(c => c.id) || []
    )
  }, [userProfile, meeting, students, isMeetingCreator])

  // Prepare class list for filter - only for multi-class meetings
  const classListForFilter = useMemo(() => {
    if (!meeting?.class_ids || meeting.class_ids.length <= 1) return []
    
    // Get unique class IDs from students
    const classIds = new Set(students.map(s => s.class_id))
    
    // For teacher non-creator, only show their classes
    if (userProfile?.role === 'teacher' && !isMeetingCreator) {
      const myClassIds = userProfile.classes?.map(c => c.id) || []
      const relevantClassIds = Array.from(classIds).filter(id => myClassIds.includes(id))
      
      // Only show filter if teacher has more than 1 class in this meeting
      if (relevantClassIds.length <= 1) return []
      
      return relevantClassIds.map(id => {
        const student = students.find(s => s.class_id === id)
        return { 
          id, 
          name: student?.class_name || 'Unknown',
          kelompok_id: null
        }
      })
    }
    
    // For admin/creator, show all classes
    return Array.from(classIds).map(id => {
      const student = students.find(s => s.class_id === id)
      return { 
        id, 
        name: student?.class_name || 'Unknown',
        kelompok_id: null
      }
    })
  }, [meeting, students, userProfile, isMeetingCreator])

  // Determine if class filter should show
  const showClassFilter = meeting?.class_ids && meeting.class_ids.length > 1 && classListForFilter.length > 0

  const goBack = () => {
    router.push('/absensi')
  }

  if (loading) {
    return <LoadingState />
  }

  if (error || !meeting) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
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
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
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
          <div className="bg-white dark:bg-gray-800 rounded-md shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-3 p-4 mb-2">
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
          kelompokList={[]}
          classList={classListForFilter}
          showGender={true}
          showKelas={showClassFilter}
          showDaerah={false}
          showDesa={false}
          showKelompok={false}
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

        {/* Save Button */}
        <div className="flex justify-center sm:justify-end gap-4">
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
