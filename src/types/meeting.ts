export interface Meeting {
  id: string
  title?: string // Optional - can be empty in production
  date: string
  topic?: string
  description?: string
  class_ids: string[]
  kelompok_ids?: string[]
  meeting_type_code?: string | null
  student_snapshot?: string[]
  created_at: string
  updated_at?: string
  // Note: created_by column does not exist in meetings table
  // teacher_id field tracks who created the meeting
}

export interface CreateMeetingData {
  classIds: string[]
  kelompokIds?: string[]
  date: string
  title?: string // Optional - UI label shows "Judul Pertemuan (Opsional)"
  topic?: string
  description?: string
  meetingTypeCode?: string | null
  studentIds?: string[]
}

export interface UpdateMeetingData extends Partial<CreateMeetingData> {}

export interface MeetingWithStats extends Meeting {
  total_students: number
  attendance_count: number
  attendance_percentage: number
}
