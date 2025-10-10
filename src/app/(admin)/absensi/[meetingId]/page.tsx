'use client'

import React, { useState, useRef } from 'react'
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
          // Revalidate all meetings cache for this user
          globalMutate((key: any) => 
            typeof key === 'string' && 
            key.includes('/api/meetings') && 
            key.includes(userId)
          )
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

  // Calculate stats from local attendance state (real-time updates)
  const calculateLocalStats = () => {
    const records = Object.values(localAttendance)
    return {
      total: records.length,
      hadir: records.filter(record => record.status === 'H').length,
      izin: records.filter(record => record.status === 'I').length,
      sakit: records.filter(record => record.status === 'S').length,
      absen: records.filter(record => record.status === 'A').length
    }
  }

  const calculateLocalAttendancePercentage = () => {
    if (!meeting) return 0
    
    const totalStudents = meeting.student_snapshot?.length || 0
    if (totalStudents === 0) return 0
    
    const presentCount = Object.values(localAttendance).filter(
      record => record.status === 'H'
    ).length
    
    return Math.round((presentCount / totalStudents) * 100)
  }

  const localStats = calculateLocalStats()
  const localAttendancePercentage = calculateLocalAttendancePercentage()

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
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
          {/* <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {meeting.topic && (
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Topik: {meeting.topic}
                  </h3>
                )}
                {meeting.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-2">
                    Deskripsi: {meeting.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>{dayjs(meeting.date).format('dddd, DD MMMM YYYY')}</span>
                </div>
              </div>
            </div>
          </div> */}

          {/* Summary Card */}
          <SummaryCard
            title={`Siswa (${meeting.student_snapshot?.length} orang)`}
            subtitle={`${localStats.hadir} hadir, ${localStats.absen} alfa, ${localStats.izin} izin, ${localStats.sakit} sakit`}
            percentage={localAttendancePercentage}
            percentageLabel="Kehadiran"
          />
        </div>

        {/* Attendance Table */}
        <div className="mb-8">
          <AttendanceTable
            students={students}
            attendance={localAttendance}
            onStatusChange={handleStatusChange}
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-center sm:justify-end gap-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            variant="primary"
            className="w-full sm:w-auto"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
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
