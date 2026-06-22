'use server'

import { createStudent } from '@/app/(admin)/users/siswa/actions/students/actions'
import { fetchMeetingById, updateMeetingRecord } from '../meetings/queries'
import { createAdminClient } from '@/lib/supabase/server'

export async function quickAddStudentToMeeting(meetingId: string, formData: FormData) {
  try {
    // 1. Memanggil fungsi standar createStudent
    const result = await createStudent(formData)
    
    if (!result.success || !result.student) {
      return { success: false, message: result.message || 'Gagal membuat siswa baru' }
    }
    
    // 2. Update snapshot pertemuan
    // Menggunakan adminClient untuk memastikan update snapshot selalu berhasil
    const adminClient = await createAdminClient()
    
    const { data: meeting, error: meetingError } = await fetchMeetingById(adminClient, meetingId)
    
    if (meetingError || !meeting) {
      return { 
        success: false, 
        message: 'Siswa berhasil dibuat, tetapi gagal ditambahkan ke sesi ini (Pertemuan tidak ditemukan)' 
      }
    }
    
    const currentSnapshot = meeting.student_snapshot || []
    
    // Jika siswa belum ada di snapshot, tambahkan
    if (!currentSnapshot.includes(result.student.id)) {
      const newSnapshot = [...currentSnapshot, result.student.id]
      
      const { error: updateError } = await updateMeetingRecord(adminClient, meetingId, {
        studentIds: newSnapshot
      })
      
      if (updateError) {
        return { 
          success: false, 
          message: 'Siswa berhasil dibuat, tetapi gagal mengupdate daftar hadir pertemuan' 
        }
      }
    }
    
    return { success: true, student: result.student }
  } catch (error: any) {
    console.error('quickAddStudentToMeeting error:', error)
    return { success: false, message: error.message || 'Terjadi kesalahan sistem' }
  }
}
