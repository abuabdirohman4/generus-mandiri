'use client'

import SummaryCard from './SummaryCard'
import DateControls from './DateControls'
import dayjs from 'dayjs'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
}

interface AttendanceHeaderProps {
  students: Student[]
  selectedDate: Date
  attendancePercentage: number
  onDateChange: (date: dayjs.Dayjs | null) => void
  onPreviousDay: () => void
  onNextDay: () => void
}

export default function AttendanceHeader({
  students,
  selectedDate,
  attendancePercentage,
  onDateChange,
  onPreviousDay,
  onNextDay
}: AttendanceHeaderProps) {
  return (
    <>
      {/* Date Controls */}
      <DateControls
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        onPreviousDay={onPreviousDay}
        onNextDay={onNextDay}
      />

      {/* Summary */}
      <SummaryCard
        title={students.length > 0 && students[0].class_name ? students[0].class_name : ''}
        subtitle={`Siswa (${students.length} orang)`}
        percentage={attendancePercentage}
        percentageLabel="Kehadiran"
      />
    </>
  )
}
