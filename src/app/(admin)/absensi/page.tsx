'use client'

import { useState } from 'react'
import { useAttendance } from './hooks/useAttendance'
import ReasonModal from './components/ReasonModal'
import AttendanceHeader from './components/AttendanceHeader'
import AttendanceTable from './components/AttendanceTable'
import LoadingState from './components/LoadingState'
import dayjs from 'dayjs'
import Button from '@/components/ui/button/Button'

export default function AbsensiPage() {
  const {
    students,
    attendance,
    loading,
    saving,
    selectedDate,
    handleDateChange,
    handleStatusChange,
    handleSave,
    getAttendancePercentage,
  } = useAttendance()

  const [showReasonModal, setShowReasonModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const handleDateChangeWithDayjs = (date: dayjs.Dayjs | null) => {
    if (date) {
      handleDateChange(date.toDate())
    }
  }

  const goToPreviousDay = () => {
    const previousDay = new Date(selectedDate)
    previousDay.setDate(previousDay.getDate() - 1)
    handleDateChange(previousDay)
  }

  const goToNextDay = () => {
    const nextDay = new Date(selectedDate)
    nextDay.setDate(nextDay.getDate() + 1)
    handleDateChange(nextDay)
  }

  const handleStatusChangeWithModal = (studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    if (status === 'I') {
      setSelectedStudent(studentId)
      setShowReasonModal(true)
    } else {
      handleStatusChange(studentId, status)
    }
  }

  const handleReasonSubmit = (reason: string) => {
    if (selectedStudent) {
      handleStatusChange(selectedStudent, 'I')
      // Update with reason - this would need to be handled in the hook
      // For now, we'll keep the existing logic
    }
    setShowReasonModal(false)
    setSelectedStudent(null)
    setReason('')
  }


  if (loading) {
    return <LoadingState />
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header with Date Controls and Summary */}
        <AttendanceHeader
          students={students}
          selectedDate={selectedDate}
          attendancePercentage={getAttendancePercentage()}
          onDateChange={handleDateChangeWithDayjs}
          onPreviousDay={goToPreviousDay}
          onNextDay={goToNextDay}
        />

        {/* Students List */}
        <AttendanceTable
          students={students}
          attendance={attendance}
          onStatusChange={handleStatusChangeWithModal}
        />

        {/* Save Button */}
        <div className="mt-8 flex justify-center sm:justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>

        {/* Auto-save Status - Uncomment to enable auto-save */}
        {/* 
        <AutoSaveStatus
          isAutoSaving={isAutoSaving}
          lastSaved={lastSaved}
        />
        */}

        {/* Reason Modal */}
        <ReasonModal
          isOpen={showReasonModal}
          onClose={() => {
            setShowReasonModal(false)
            setSelectedStudent(null)
            setReason('')
          }}
          onSubmit={handleReasonSubmit}
          studentName={students.find(s => s.id === selectedStudent)?.name || ''}
        />
      </div>
    </div>
  )
}
