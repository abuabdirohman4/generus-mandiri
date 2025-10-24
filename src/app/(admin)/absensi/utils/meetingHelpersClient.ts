import { createClient } from '@/lib/supabase/client'

export async function getTeacherClassIds(teacherId: string): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', teacherId)
  
  return data?.map(tc => tc.class_id) || []
}

export async function getClassNamesForMeeting(classIds: string[]): Promise<string[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('classes')
    .select('name')
    .in('id', classIds)
    .order('name')
  
  return data?.map(c => c.name) || []
}

export function canUserEditMeetingAttendance(
  userRole: string,
  isMeetingCreator: boolean,
  studentClassId: string,
  userClassIds: string[]
): boolean {
  // Superadmin and admin can always edit
  if (userRole === 'superadmin' || userRole === 'admin') return true
  
  // Meeting creator can edit all students
  if (isMeetingCreator) return true
  
  // Other teachers can only edit their own students if not yet filled
  return userClassIds.includes(studentClassId)
}
