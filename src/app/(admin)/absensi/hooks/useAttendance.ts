'use client'

import React, { useCallback } from 'react'
import { saveAttendance } from '../actions'
import { toast } from 'sonner'
import { useStudents } from '@/hooks/useStudents'
import { useAttendanceData } from './useAttendanceData'
import { useAttendanceStore } from '../stores/attendanceStore'


interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

export function useAttendance() {
  // Get all state and actions from store in one call to avoid multiple subscriptions
  const {
    students,
    attendance,
    selectedDate,
    loading: storeLoading,
    saving,
    setStudents,
    setAttendance,
    setSelectedDate,
    setSaving,
    updateStudentStatus
  } = useAttendanceStore()
  
  // Get data from SWR hooks
  const { students: swrStudents, isLoading: studentsLoading, error: studentsError } = useStudents()
  const { attendance: swrAttendance, isLoading: attendanceLoading, mutate: mutateAttendance } = useAttendanceData(selectedDate)
  
  // Combined loading state
  const loading = studentsLoading || attendanceLoading || storeLoading

  // Update store when SWR data changes
  React.useEffect(() => {
    if (swrStudents.length > 0) {
      // Transform global Student interface to attendance store format
      const transformedStudents = swrStudents.map(student => ({
        id: student.id,
        name: student.name,
        gender: student.gender || '',
        class_name: student.class_name || '',
        class_id: student.class_id
      }))
      setStudents(transformedStudents)
    }
  }, [swrStudents, setStudents])

  React.useEffect(() => {
    if (Object.keys(swrAttendance).length > 0) {
      setAttendance(swrAttendance)
    }
  }, [swrAttendance, setAttendance])


  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
    // SWR will automatically fetch new data when the date changes
  }, [setSelectedDate])

  const handleStatusChange = useCallback((studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    updateStudentStatus(studentId, status)
  }, [updateStudentStatus])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const selectedDateStr = selectedDate.toLocaleDateString('en-CA')
      
      const attendanceData = Object.entries(attendance).map(([studentId, data]) => ({
        student_id: studentId,
        date: selectedDateStr,
        status: (data as AttendanceData[string]).status,
        reason: (data as AttendanceData[string]).reason || null
      }))

      const result = await saveAttendance(attendanceData)
      
      if (result.success) {
        toast.success('Data absensi berhasil disimpan!')
        // Invalidate SWR cache to refetch fresh data
        mutateAttendance()
      } else {
        toast.error('Gagal menyimpan data absensi: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }, [attendance, selectedDate, mutateAttendance, setSaving])

  const getAttendancePercentage = useCallback(() => {
    if (students.length === 0) return 0
    
    const presentCount = Object.values(attendance).filter(
      (record: AttendanceData[string]) => record.status === 'H'
    ).length
    
    return Math.round((presentCount / students.length) * 100)
  }, [students.length, attendance])

  return {
    students,
    attendance,
    loading,
    saving,
    selectedDate,
    handleDateChange,
    handleStatusChange,
    handleSave,
    getAttendancePercentage
  }
}
