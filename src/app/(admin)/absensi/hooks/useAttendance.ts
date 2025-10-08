'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { saveAttendance } from '../actions'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

export function useAttendance() {
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<AttendanceData>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const router = useRouter()

  const fetchStudents = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/signin')
        return
      }

      // Get user profile to determine which class they teach
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) {
        console.error('Profile not found')
        return
      }

      let query = supabase
        .from('students')
        .select(`
          id,
          name,
          gender,
          classes!inner(
            id,
            name
          )
        `)

      // If user is a teacher, get their class and filter students
      if (profile.role === 'teacher') {
        const { data: teacherClass } = await supabase
          .from('classes')
          .select('id')
          .eq('teacher_id', user.id)
          .single()

        if (teacherClass) {
          query = query.eq('class_id', teacherClass.id)
        }
      }

      const { data, error } = await query.order('name')

      if (error) {
        console.error('Error fetching students:', error)
        return
      }

      const studentsData = data.map(student => ({
        id: student.id,
        name: student.name,
        gender: student.gender,
        class_name: (student.classes as any).name,
        class_id: (student.classes as any).id
      }))

      setStudents(studentsData)
      await loadExistingAttendance(studentsData, new Date())

    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const loadExistingAttendance = useCallback(async (studentsData: Student[], date: Date) => {
    try {
      const supabase = createClient()
      const selectedDateStr = date.toLocaleDateString('en-CA')
      
      // Get existing attendance records for selected date
      const { data: existingAttendance, error } = await supabase
        .from('attendance_logs')
        .select('student_id, status, reason')
        .eq('date', selectedDateStr)

      if (error) {
        console.error('Error fetching existing attendance:', error)
        return
      }

      // Initialize attendance with existing data or default to 'A' (Absent)
      const initialAttendance: AttendanceData = {}
      studentsData.forEach(student => {
        const existingRecord = existingAttendance?.find(record => record.student_id === student.id)
        initialAttendance[student.id] = {
          status: existingRecord?.status || 'A',
          reason: existingRecord?.reason || undefined
        }
      })
      
      setAttendance(initialAttendance)
    } catch (error) {
      console.error('Error loading existing attendance:', error)
      // Fallback to default 'A' status if loading fails
      const initialAttendance: AttendanceData = {}
      studentsData.forEach(student => {
        initialAttendance[student.id] = { status: 'A' }
      })
      setAttendance(initialAttendance)
    }
  }, [])

  const handleDateChange = useCallback((date: Date) => {
    setSelectedDate(date)
    loadExistingAttendance(students, date)
  }, [students, loadExistingAttendance])

  const handleStatusChange = useCallback((studentId: string, status: 'H' | 'I' | 'S' | 'A') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], status, reason: status === 'I' ? prev[studentId]?.reason : undefined }
    }))
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const selectedDateStr = selectedDate.toLocaleDateString('en-CA')
      
      const attendanceData = Object.entries(attendance).map(([studentId, data]) => ({
        student_id: studentId,
        date: selectedDateStr,
        status: data.status,
        reason: data.reason || null
      }))

      const result = await saveAttendance(attendanceData)
      
      if (result.success) {
        toast.success('Data absensi berhasil disimpan!')
        await loadExistingAttendance(students, selectedDate)
      } else {
        toast.error('Gagal menyimpan data absensi: ' + result.error)
      }
    } catch (error) {
      console.error('Error saving attendance:', error)
      toast.error('Terjadi kesalahan saat menyimpan data')
    } finally {
      setSaving(false)
    }
  }, [attendance, selectedDate, students, loadExistingAttendance])

  const getAttendancePercentage = useCallback(() => {
    if (students.length === 0) return 0
    
    const presentCount = Object.values(attendance).filter(
      record => record.status === 'H'
    ).length
    
    return Math.round((presentCount / students.length) * 100)
  }, [students.length, attendance])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  return {
    students,
    attendance,
    loading,
    saving,
    selectedDate,
    handleDateChange,
    handleStatusChange,
    handleSave,
    getAttendancePercentage,
    loadExistingAttendance
  }
}
