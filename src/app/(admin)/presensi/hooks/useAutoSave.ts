'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { saveAttendance } from '../actions'

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

interface UseAutoSaveProps {
  attendance: AttendanceData
  selectedDate: Date
  students: any[]
  enabled?: boolean
  delay?: number
}

export function useAutoSave({
  attendance,
  selectedDate,
  students,
  enabled = false,
  delay = 1500
}: UseAutoSaveProps) {
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const autoSave = useCallback(async (attendanceData: AttendanceData) => {
    if (!enabled) return

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(async () => {
      setIsAutoSaving(true)
      try {
        const selectedDateStr = selectedDate.toLocaleDateString('en-CA')
        
        const attendanceRecords = Object.entries(attendanceData).map(([studentId, data]) => ({
          student_id: studentId,
          date: selectedDateStr,
          status: data.status,
          reason: data.reason || null
        }))

        const result = await saveAttendance(attendanceRecords)
        
        if (result.success) {
          setLastSaved(new Date())
        } else {
          console.error('Auto-save failed:', result.error)
        }
      } catch (error) {
        console.error('Auto-save error:', error)
      } finally {
        setIsAutoSaving(false)
      }
    }, delay)
  }, [enabled, selectedDate, delay])

  // Trigger auto-save when attendance changes
  useEffect(() => {
    if (enabled && Object.keys(attendance).length > 0) {
      autoSave(attendance)
    }
  }, [attendance, autoSave, enabled])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    isAutoSaving,
    lastSaved,
    setLastSaved
  }
}
