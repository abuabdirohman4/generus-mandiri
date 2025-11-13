import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function canEditOrDeleteMeeting(meetingId: string, userId: string): Promise<boolean> {
  const supabase = await createClient()
  const adminClient = await createAdminClient()
  
  // Get meeting creator and class info
  // Use admin client to bypass RLS restrictions for teachers with multiple kelompok
  // This allows checking permissions for meetings created for classes from different kelompok
  const { data: meeting } = await adminClient
    .from('meetings')
    .select(`
      teacher_id,
      class_id,
      class_ids,
      classes!inner (
        kelompok_id,
        kelompok:kelompok_id (
          desa_id,
          desa:desa_id (
            daerah_id
          )
        )
      )
    `)
    .eq('id', meetingId)
    .single()
  
  if (!meeting) return false
  
  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, daerah_id, desa_id, kelompok_id')
    .eq('id', userId)
    .single()
  
  if (!profile) return false
  
  // Superadmin can do anything
  if (profile.role === 'superadmin') return true
  
  // Meeting creator can edit/delete
  if (meeting.teacher_id === userId) return true
  
  // Admin hierarchy check
  if (profile.role === 'admin') {
    // Handle both single object and array cases
    const classes = Array.isArray(meeting.classes) ? meeting.classes[0] : meeting.classes
    const kelompok = Array.isArray(classes?.kelompok) ? classes.kelompok[0] : classes?.kelompok
    const desa = Array.isArray(kelompok?.desa) ? kelompok.desa[0] : kelompok?.desa
    
    const meetingDaerahId = (desa as any)?.daerah_id
    const meetingDesaId = (kelompok as any)?.desa_id
    const meetingKelompokId = (classes as any)?.kelompok_id
    
    // Admin Daerah can edit meetings in their daerah
    if (profile.daerah_id && !profile.desa_id && meetingDaerahId === profile.daerah_id) {
      return true
    }
    
    // Admin Desa can edit meetings in their desa
    if (profile.desa_id && !profile.kelompok_id && meetingDesaId === profile.desa_id) {
      return true
    }
    
    // Admin Kelompok can edit meetings in their kelompok
    if (profile.kelompok_id && meetingKelompokId === profile.kelompok_id) {
      return true
    }
  }
  
  // Teacher can only edit their own meetings
  return false
}

