'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import {
  canArchiveStudent,
  canRequestTransfer,
  canReviewTransferRequest,
  canSoftDeleteStudent,
  canHardDeleteStudent,
  needsApproval,
  type UserProfile,
  type Student,
  type TransferRequest,
} from '@/lib/studentPermissions'

// Re-export centralized types for convenience
export type { Student, TransferRequest }
// Note: Student type now comes from @/types/student via studentPermissions

// ============================================
// ARCHIVE STUDENT
// ============================================

export interface ArchiveStudentInput {
  studentId: string
  status: 'graduated' | 'inactive'
  notes?: string
}

export interface ArchiveStudentResponse {
  success: boolean
  error?: string
}

/**
 * Archive student (mark as graduated or inactive)
 * Students remain in system but hidden from active lists
 */
export async function archiveStudent(
  input: ArchiveStudentInput
): Promise<ArchiveStudentResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get student data
    const { data: student } = await adminClient
      .from('students')
      .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
      .eq('id', input.studentId)
      .single()

    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission
    if (!canArchiveStudent(profile as UserProfile, student as Student)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk mengarsipkan siswa ini',
      }
    }

    // Validate status
    if (!['graduated', 'inactive'].includes(input.status)) {
      return { success: false, error: 'Status tidak valid' }
    }

    // Update student status
    const { error: updateError } = await adminClient
      .from('students')
      .update({
        status: input.status,
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        archive_notes: input.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.studentId)

    if (updateError) {
      console.error('Archive student error:', updateError)
      return { success: false, error: 'Gagal mengarsipkan siswa' }
    }

    revalidatePath('/users/siswa')
    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Archive student error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengarsipkan siswa',
    }
  }
}

/**
 * Unarchive a student (restore to active status)
 */
export async function unarchiveStudent(
  studentId: string
): Promise<ArchiveStudentResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get student data
    const { data: student } = await adminClient
      .from('students')
      .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
      .eq('id', studentId)
      .single()

    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission (same as archive)
    if (!canArchiveStudent(profile as UserProfile, student as Student)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk mengembalikan siswa ini',
      }
    }

    // Student must be archived
    if (student.status === 'active') {
      return { success: false, error: 'Siswa sudah dalam status aktif' }
    }

    // Restore to active status
    const { error: updateError } = await adminClient
      .from('students')
      .update({
        status: 'active',
        archived_at: null,
        archived_by: null,
        archive_notes: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (updateError) {
      console.error('Unarchive student error:', updateError)
      return { success: false, error: 'Gagal mengembalikan siswa' }
    }

    revalidatePath('/users/siswa')
    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Unarchive student error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengembalikan siswa',
    }
  }
}

// ============================================
// TRANSFER REQUESTS
// ============================================

export interface CreateTransferRequestInput {
  studentIds: string[]
  toDaerahId: string
  toDesaId: string
  toKelompokId: string
  toClassIds?: string[]
  reason?: string
  notes?: string
}

export interface TransferRequestResponse {
  success: boolean
  requestId?: string
  autoApproved?: boolean
  error?: string
}

/**
 * Create a transfer request for one or multiple students
 * Auto-approves if within same organization, otherwise creates pending request
 */
export async function createTransferRequest(
  input: CreateTransferRequestInput
): Promise<TransferRequestResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Validate input
    if (!input.studentIds || input.studentIds.length === 0) {
      return { success: false, error: 'Pilih minimal satu siswa' }
    }

    if (!input.toDaerahId || !input.toDesaId || !input.toKelompokId) {
      return { success: false, error: 'Destinasi transfer tidak lengkap' }
    }

    // Get all students
    const { data: students } = await adminClient
      .from('students')
      .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
      .in('id', input.studentIds)

    if (!students || students.length === 0) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission for each student
    for (const student of students) {
      if (!canRequestTransfer(profile as UserProfile, student as Student)) {
        return {
          success: false,
          error: `Tidak memiliki izin untuk transfer siswa: ${student.name}`,
        }
      }
    }

    // Check if any student already has a pending transfer request
    const { data: existingRequests } = await adminClient
      .from('transfer_requests')
      .select('id, student_ids, status')
      .eq('status', 'pending')

    if (existingRequests && existingRequests.length > 0) {
      const studentsWithPendingTransfer: string[] = []

      for (const student of students) {
        const hasPending = existingRequests.some(req =>
          req.student_ids && req.student_ids.includes(student.id)
        )

        if (hasPending) {
          studentsWithPendingTransfer.push(student.name)
        }
      }

      if (studentsWithPendingTransfer.length > 0) {
        return {
          success: false,
          error: `Siswa berikut masih memiliki permintaan transfer yang belum selesai: ${studentsWithPendingTransfer.join(', ')}. Mohon tunggu hingga request sebelumnya diproses.`,
        }
      }
    }

    // All students must have same source organization
    const firstStudent = students[0]
    const allSameOrg = students.every(
      (s) =>
        s.daerah_id === firstStudent.daerah_id &&
        s.desa_id === firstStudent.desa_id &&
        s.kelompok_id === firstStudent.kelompok_id
    )

    if (!allSameOrg) {
      return {
        success: false,
        error: 'Semua siswa harus dari organisasi yang sama',
      }
    }

    // Create transfer request object (omit id and status for now)
    const requestData: Omit<TransferRequest, 'id' | 'status'> = {
      student_ids: input.studentIds,
      from_daerah_id: firstStudent.daerah_id,
      from_desa_id: firstStudent.desa_id,
      from_kelompok_id: firstStudent.kelompok_id,
      to_daerah_id: input.toDaerahId,
      to_desa_id: input.toDesaId,
      to_kelompok_id: input.toKelompokId,
      to_class_ids: input.toClassIds,
      requested_by: user.id,
      requested_at: new Date().toISOString(),
      reason: input.reason,
      notes: input.notes,
    }

    // Check if needs approval (add temporary id and status for check)
    const requiresApproval = needsApproval(profile as UserProfile, {
      ...requestData,
      id: 'temp',
      status: 'pending',
    } as TransferRequest)

    if (requiresApproval) {
      // Create pending request
      const { data: request, error: createError } = await adminClient
        .from('transfer_requests')
        .insert({
          ...requestData,
          status: 'pending',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Create transfer request error:', createError)
        return { success: false, error: 'Gagal membuat transfer request' }
      }

      revalidatePath('/users/siswa')
      return {
        success: true,
        requestId: request.id,
        autoApproved: false,
      }
    } else {
      // Auto-approve and execute transfer immediately
      const { data: request, error: createError } = await adminClient
        .from('transfer_requests')
        .insert({
          ...requestData,
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: 'Auto-approved (same organization)',
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Create transfer request error:', createError)
        return { success: false, error: 'Gagal membuat transfer request' }
      }

      // Execute transfer
      const executeResult = await executeTransfer(request.id, user.id)
      if (!executeResult.success) {
        return { success: false, error: executeResult.error }
      }

      revalidatePath('/users/siswa')
      return {
        success: true,
        requestId: request.id,
        autoApproved: true,
      }
    }
  } catch (error) {
    console.error('Create transfer request error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membuat transfer request',
    }
  }
}

/**
 * Approve a pending transfer request
 */
export async function approveTransferRequest(
  requestId: string,
  reviewNotes?: string
): Promise<TransferRequestResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get transfer request
    const { data: request } = await adminClient
      .from('transfer_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: `Request sudah ${request.status === 'approved' ? 'disetujui' : 'ditolak'}`,
      }
    }

    // Check permission
    if (!canReviewTransferRequest(profile as UserProfile, request as TransferRequest)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk mereview request ini',
      }
    }

    // Approve request
    const { error: updateError } = await adminClient
      .from('transfer_requests')
      .update({
        status: 'approved',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Approve transfer request error:', updateError)
      return { success: false, error: 'Gagal menyetujui transfer request' }
    }

    // Execute transfer
    const executeResult = await executeTransfer(requestId, user.id)
    if (!executeResult.success) {
      return { success: false, error: executeResult.error }
    }

    revalidatePath('/users/siswa')
    return { success: true, requestId }
  } catch (error) {
    console.error('Approve transfer request error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menyetujui transfer request',
    }
  }
}

/**
 * Reject a pending transfer request
 */
export async function rejectTransferRequest(
  requestId: string,
  reviewNotes?: string
): Promise<TransferRequestResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get transfer request
    const { data: request } = await adminClient
      .from('transfer_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: `Request sudah ${request.status === 'approved' ? 'disetujui' : 'ditolak'}`,
      }
    }

    // Check permission
    if (!canReviewTransferRequest(profile as UserProfile, request as TransferRequest)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk mereview request ini',
      }
    }

    // Reject request
    const { error: updateError } = await adminClient
      .from('transfer_requests')
      .update({
        status: 'rejected',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || 'Ditolak',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Reject transfer request error:', updateError)
      return { success: false, error: 'Gagal menolak transfer request' }
    }

    revalidatePath('/users/siswa')
    return { success: true, requestId }
  } catch (error) {
    console.error('Reject transfer request error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal menolak transfer request',
    }
  }
}

/**
 * Cancel a pending transfer request (requester only)
 */
export async function cancelTransferRequest(
  requestId: string
): Promise<TransferRequestResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get transfer request
    const { data: request } = await adminClient
      .from('transfer_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    if (request.status !== 'pending') {
      return {
        success: false,
        error: 'Hanya pending request yang bisa dibatalkan',
      }
    }

    if (request.requested_by !== user.id) {
      return {
        success: false,
        error: 'Hanya pembuat request yang bisa membatalkan',
      }
    }

    // Cancel request
    const { error: updateError } = await adminClient
      .from('transfer_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (updateError) {
      console.error('Cancel transfer request error:', updateError)
      return { success: false, error: 'Gagal membatalkan transfer request' }
    }

    revalidatePath('/users/siswa')
    return { success: true, requestId }
  } catch (error) {
    console.error('Cancel transfer request error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal membatalkan transfer request',
    }
  }
}

/**
 * Execute approved transfer (internal helper)
 */
async function executeTransfer(
  requestId: string,
  executorId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const adminClient = await createAdminClient()

    // Get transfer request
    const { data: request } = await adminClient
      .from('transfer_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    if (request.status !== 'approved') {
      return { success: false, error: 'Request belum disetujui' }
    }

    // Update all students
    const { error: updateError } = await adminClient
      .from('students')
      .update({
        daerah_id: request.to_daerah_id,
        desa_id: request.to_desa_id,
        kelompok_id: request.to_kelompok_id,
        updated_at: new Date().toISOString(),
      })
      .in('id', request.student_ids)

    if (updateError) {
      console.error('Execute transfer error:', updateError)
      return { success: false, error: 'Gagal mengupdate siswa' }
    }

    // Update class assignments if specified
    if (request.to_class_ids && request.to_class_ids.length > 0) {
      // Delete old class assignments
      await adminClient
        .from('student_classes')
        .delete()
        .in('student_id', request.student_ids)

      // Insert new class assignments
      const newAssignments = request.student_ids.flatMap((studentId: string) =>
        request.to_class_ids.map((classId: string) => ({
          student_id: studentId,
          class_id: classId,
        }))
      )

      const { error: assignError } = await adminClient
        .from('student_classes')
        .insert(newAssignments)

      if (assignError && assignError.code !== '23505') {
        // Ignore duplicate errors
        console.error('Execute transfer class assignment error:', assignError)
        // Continue anyway, students are already transferred
      }
    }

    // Add to transfer history (JSONB array in students table)
    const transferHistoryEntry = {
      from_daerah_id: request.from_daerah_id,
      from_desa_id: request.from_desa_id,
      from_kelompok_id: request.from_kelompok_id,
      to_daerah_id: request.to_daerah_id,
      to_desa_id: request.to_desa_id,
      to_kelompok_id: request.to_kelompok_id,
      date: new Date().toISOString(),
      requested_by: request.requested_by,
      approved_by: request.reviewed_by,
      request_id: requestId,
    }

    // Update each student's transfer_history
    for (const studentId of request.student_ids) {
      const { data: student } = await adminClient
        .from('students')
        .select('transfer_history')
        .eq('id', studentId)
        .single()

      const currentHistory = student?.transfer_history || []
      const newHistory = [...currentHistory, transferHistoryEntry]

      await adminClient
        .from('students')
        .update({ transfer_history: newHistory })
        .eq('id', studentId)
    }

    // Mark request as executed
    const { error: execError } = await adminClient
      .from('transfer_requests')
      .update({
        executed_at: new Date().toISOString(),
        executed_by: executorId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)

    if (execError) {
      console.error('Mark transfer executed error:', execError)
      // Don't return error, transfer is already done
    }

    return { success: true }
  } catch (error) {
    console.error('Execute transfer error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal execute transfer',
    }
  }
}

/**
 * Get pending transfer requests for current user to review
 */
export async function getPendingTransferRequests(): Promise<{
  success: boolean
  requests?: any[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Build query based on user role
    let query = adminClient
      .from('transfer_requests')
      .select(
        `
        *,
        requester:requested_by(full_name),
        reviewer:reviewed_by(full_name)
      `
      )
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    // Build two queries:
    // 1. Requests that need MY review (targeting my org)
    // 2. Requests that I created

    let reviewQuery = adminClient
      .from('transfer_requests')
      .select(
        `
        *,
        requester:requested_by(full_name),
        reviewer:reviewed_by(full_name)
      `
      )
      .eq('status', 'pending')
      .order('requested_at', { ascending: false })

    let myRequestsQuery = adminClient
      .from('transfer_requests')
      .select(
        `
        *,
        requester:requested_by(full_name),
        reviewer:reviewed_by(full_name)
      `
      )
      .eq('status', 'pending')
      .eq('requested_by', profile.id)
      .order('requested_at', { ascending: false })

    // Filter review query by target organization based on admin level
    if (profile.role === 'superadmin') {
      // Superadmin sees all pending requests (both as reviewer and requester)
    } else if (profile.role === 'admin') {
      // Determine admin level
      if (profile.kelompok_id) {
        // Admin Kelompok: only requests targeting their kelompok
        reviewQuery = reviewQuery.eq('to_kelompok_id', profile.kelompok_id)
      } else if (profile.desa_id) {
        // Admin Desa: requests targeting their desa (any kelompok in their desa)
        reviewQuery = reviewQuery.eq('to_desa_id', profile.desa_id)
      } else if (profile.daerah_id) {
        // Admin Daerah: requests targeting their daerah (any desa/kelompok in their daerah)
        reviewQuery = reviewQuery.eq('to_daerah_id', profile.daerah_id)
      }
    } else {
      // Teachers/students can't review, but can see their own requests
      reviewQuery = reviewQuery.eq('id', 'none') // Empty result
    }

    // Execute both queries
    const [reviewResult, myRequestsResult] = await Promise.all([
      reviewQuery,
      myRequestsQuery
    ])

    if (reviewResult.error) {
      console.error('Get pending requests error:', reviewResult.error)
      return { success: false, error: 'Gagal memuat pending requests' }
    }

    if (myRequestsResult.error) {
      console.error('Get my requests error:', myRequestsResult.error)
      return { success: false, error: 'Gagal memuat my requests' }
    }

    // Combine results and deduplicate by id
    const allRequests = [...(reviewResult.data || []), ...(myRequestsResult.data || [])]
    const uniqueRequests = Array.from(
      new Map(allRequests.map(r => [r.id, r])).values()
    )

    const { data: requests, error } = { data: uniqueRequests, error: null }

    if (error) {
      console.error('Get pending requests error:', error)
      return { success: false, error: 'Gagal memuat pending requests' }
    }

    // Get student names for each request
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (request) => {
        const { data: students } = await adminClient
          .from('students')
          .select('id, name')
          .in('id', request.student_ids)

        return {
          ...request,
          students: students || [],
        }
      })
    )

    return { success: true, requests: enrichedRequests }
  } catch (error) {
    console.error('Get pending requests error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat pending requests',
    }
  }
}

/**
 * Get my transfer requests (created by current user)
 */
export async function getMyTransferRequests(): Promise<{
  success: boolean
  requests?: any[]
  error?: string
}> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: requests, error } = await adminClient
      .from('transfer_requests')
      .select(
        `
        *,
        reviewer:reviewed_by(full_name)
      `
      )
      .eq('requested_by', user.id)
      .order('requested_at', { ascending: false })

    if (error) {
      console.error('Get my requests error:', error)
      return { success: false, error: 'Gagal memuat requests' }
    }

    // Get student names for each request
    const enrichedRequests = await Promise.all(
      (requests || []).map(async (request) => {
        const { data: students } = await adminClient
          .from('students')
          .select('id, name')
          .in('id', request.student_ids)

        return {
          ...request,
          students: students || [],
        }
      })
    )

    return { success: true, requests: enrichedRequests }
  } catch (error) {
    console.error('Get my requests error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal memuat requests',
    }
  }
}

// ============================================
// RESTORE SOFT DELETED STUDENT
// ============================================

/**
 * Restore soft deleted student
 */
export async function restoreStudent(studentId: string): Promise<ArchiveStudentResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get student data (including soft deleted)
    const { data: student } = await adminClient
      .from('students')
      .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
      .eq('id', studentId)
      .single()

    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    if (!student.deleted_at) {
      return { success: false, error: 'Siswa tidak dalam status deleted' }
    }

    // Check permission (same as soft delete)
    if (!canSoftDeleteStudent(profile as UserProfile, student as Student)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk restore siswa ini',
      }
    }

    // Restore student
    const { error: updateError } = await adminClient
      .from('students')
      .update({
        deleted_at: null,
        deleted_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId)

    if (updateError) {
      console.error('Restore student error:', updateError)
      return { success: false, error: 'Gagal restore siswa' }
    }

    revalidatePath('/users/siswa')
    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Restore student error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal restore siswa',
    }
  }
}

// ============================================
// GET ALL ORGANISATIONS (FOR TRANSFER MODAL)
// ============================================

/**
 * Fetch ALL organisations without filtering by user hierarchy
 * Used by Transfer Modal to allow cross-boundary transfers
 */
export async function getAllOrganisationsForTransfer() {
  try {
    const supabase = await createClient()

    // Fetch all daerah
    const { data: daerah, error: daerahError } = await supabase
      .from('daerah')
      .select('id, name')
      .order('name')

    if (daerahError) throw daerahError

    // Fetch all desa
    const { data: desa, error: desaError } = await supabase
      .from('desa')
      .select('id, name, daerah_id')
      .order('name')

    if (desaError) throw desaError

    // Fetch all kelompok
    const { data: kelompok, error: kelompokError } = await supabase
      .from('kelompok')
      .select('id, name, desa_id')
      .order('name')

    if (kelompokError) throw kelompokError

    return {
      success: true,
      daerah: daerah || [],
      desa: desa || [],
      kelompok: kelompok || [],
    }
  } catch (error) {
    console.error('Get all organisations error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Gagal mengambil data organisasi',
      daerah: [],
      desa: [],
      kelompok: [],
    }
  }
}
