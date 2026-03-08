export interface Meeting {
  id: string
  title: string
  date: string
  topic?: string
  description?: string
  class_ids: string[]
  kelompok_ids?: string[]
  meeting_type_code?: string | null
  student_snapshot?: string[]
  created_at: string
  created_by: string
  updated_at?: string
}

export interface CreateMeetingData {
  classIds: string[]
  kelompokIds?: string[]
  date: string
  title: string
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
