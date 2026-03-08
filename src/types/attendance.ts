export interface AttendanceLog {
  id: string
  student_id: string
  date: string
  meeting_id?: string | null
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
  recorded_by: string
  created_at: string
  updated_at: string
}

export interface AttendanceData {
  student_id: string
  date: string
  status: 'H' | 'I' | 'S' | 'A'
  reason?: string | null
}

export interface AttendanceStats {
  total_students: number
  present: number
  sick: number
  permission: number
  absent: number
  percentage: number
}

export interface AttendanceSaveResult {
  success: boolean
  error?: string
  data?: AttendanceLog[]
}
