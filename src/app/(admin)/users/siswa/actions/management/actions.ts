'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import {
    canArchiveStudent,
    canRequestTransfer,
    canReviewTransferRequest,
    needsApproval,
    type UserProfile,
    type Student,
    type TransferRequest,
} from '../students/permissions'
import {
    fetchStudentForManagement,
    updateStudentStatusArchive,
    updateStudentStatusActive,
    fetchStudentsForTransfer,
    fetchPendingTransferRequests,
    insertTransferRequest,
    fetchTransferRequestById,
    updateTransferRequestStatus,
    updateStudentsOrganization,
    deleteStudentClassAssignments,
    insertStudentClassAssignments,
    fetchStudentTransferHistory,
    updateStudentTransferHistory,
    fetchTransferRequestsForUser,
} from './queries'
import {
    validateArchiveInput,
    validateTransferInput,
    checkStudentsFromSameOrg,
    findStudentsWithPendingTransfer,
} from './logic'

// Re-export centralized types
export type { Student, TransferRequest }

export interface ArchiveStudentInput {
    studentId: string
    status: 'graduated' | 'inactive'
    notes?: string
}

export interface ArchiveStudentResponse {
    success: boolean
    error?: string
}

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
 * Archive student (mark as graduated or inactive)
 */
export async function archiveStudent(
    input: ArchiveStudentInput
): Promise<ArchiveStudentResponse> {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        // Validate input (Layer 2)
        const validation = validateArchiveInput(input)
        if (!validation.ok) return { success: false, error: validation.error }

        // Get student data (Layer 1)
        const { data: student } = await fetchStudentForManagement(adminClient, input.studentId)
        if (!student) return { success: false, error: 'Siswa tidak ditemukan' }

        // Check permission (permissions layer)
        if (!canArchiveStudent(profile as UserProfile, student as Student)) {
            return { success: false, error: 'Tidak memiliki izin untuk mengarsipkan siswa ini' }
        }

        // Archive (Layer 1)
        const { error: updateError } = await updateStudentStatusArchive(
            adminClient,
            input.studentId,
            user.id,
            input.status,
            input.notes
        )

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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        // Get student data (Layer 1)
        const { data: student } = await fetchStudentForManagement(adminClient, studentId)
        if (!student) return { success: false, error: 'Siswa tidak ditemukan' }

        // Check permission (permissions layer)
        if (!canArchiveStudent(profile as UserProfile, student as Student)) {
            return { success: false, error: 'Tidak memiliki izin untuk mengembalikan siswa ini' }
        }

        if (student.status === 'active') {
            return { success: false, error: 'Siswa sudah dalam status aktif' }
        }

        // Restore active (Layer 1)
        const { error: updateError } = await updateStudentStatusActive(adminClient, studentId)

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

/**
 * Execute approved transfer (internal helper)
 */
async function executeTransfer(
    requestId: string,
    executorId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const adminClient = await createAdminClient()

        const { data: request } = await fetchTransferRequestById(adminClient, requestId)
        if (!request) return { success: false, error: 'Transfer request tidak ditemukan' }
        if (request.status !== 'approved') return { success: false, error: 'Request belum disetujui' }

        // Update students' org (Layer 1)
        const { error: updateError } = await updateStudentsOrganization(adminClient, request.student_ids, {
            daerah_id: request.to_daerah_id,
            desa_id: request.to_desa_id,
            kelompok_id: request.to_kelompok_id,
        })

        if (updateError) {
            console.error('Execute transfer error:', updateError)
            return { success: false, error: 'Gagal mengupdate siswa' }
        }

        // Update class assignments if specified (Layer 1)
        if (request.to_class_ids && request.to_class_ids.length > 0) {
            await deleteStudentClassAssignments(adminClient, request.student_ids)

            const newAssignments = request.student_ids.flatMap((studentId: string) =>
                request.to_class_ids.map((classId: string) => ({
                    student_id: studentId,
                    class_id: classId,
                }))
            )

            const { error: assignError } = await insertStudentClassAssignments(adminClient, newAssignments)
            if (assignError && assignError.code !== '23505') {
                console.error('Execute transfer class assignment error:', assignError)
                // Continue anyway, students are already transferred
            }
        }

        // Update transfer_history for each student (Layer 1)
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

        for (const studentId of request.student_ids) {
            const { data: student } = await fetchStudentTransferHistory(adminClient, studentId)
            const currentHistory = student?.transfer_history || []
            await updateStudentTransferHistory(adminClient, studentId, [...currentHistory, transferHistoryEntry])
        }

        // Mark request as executed (Layer 1)
        const { error: execError } = await updateTransferRequestStatus(adminClient, requestId, {
            executed_at: new Date().toISOString(),
            executed_by: executorId,
            updated_at: new Date().toISOString(),
        })

        if (execError) {
            console.error('Mark transfer executed error:', execError)
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
 * Create a transfer request for one or multiple students
 */
export async function createTransferRequest(
    input: CreateTransferRequestInput
): Promise<TransferRequestResponse> {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        // Validate input (Layer 2)
        const validation = validateTransferInput({
            studentIds: input.studentIds,
            toDaerahId: input.toDaerahId,
            toDesaId: input.toDesaId,
            toKelompokId: input.toKelompokId,
        })
        if (!validation.ok) return { success: false, error: validation.error }

        // Get all students (Layer 1)
        const { data: students } = await fetchStudentsForTransfer(adminClient, input.studentIds)
        if (!students || students.length === 0) return { success: false, error: 'Siswa tidak ditemukan' }

        // Check permissions
        for (const student of students) {
            if (!canRequestTransfer(profile as UserProfile, student as Student)) {
                return {
                    success: false,
                    error: `Tidak memiliki izin untuk transfer siswa: ${student.name}`,
                }
            }
        }

        // Check for pending transfers (Layer 1 + Layer 2)
        const { data: existingRequests } = await fetchPendingTransferRequests(adminClient)

        if (existingRequests && existingRequests.length > 0) {
            const studentsWithPending = findStudentsWithPendingTransfer(students, existingRequests)
            if (studentsWithPending.length > 0) {
                return {
                    success: false,
                    error: `Siswa berikut masih memiliki permintaan transfer yang belum selesai: ${studentsWithPending.join(', ')}. Mohon tunggu hingga request sebelumnya diproses.`,
                }
            }
        }

        // Validate all students from same org (Layer 2)
        if (!checkStudentsFromSameOrg(students as any)) {
            return { success: false, error: 'Semua siswa harus dari organisasi yang sama' }
        }

        const firstStudent = students[0]
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

        // Check if needs approval (permissions layer)
        const requiresApproval = needsApproval(profile as UserProfile, {
            ...requestData,
            id: 'temp',
            status: 'pending',
        } as TransferRequest)

        if (requiresApproval) {
            const { data: request, error: createError } = await insertTransferRequest(adminClient, {
                ...requestData,
                status: 'pending',
            })

            if (createError) {
                console.error('Create transfer request error:', createError)
                return { success: false, error: 'Gagal membuat transfer request' }
            }

            revalidatePath('/users/siswa')
            return { success: true, requestId: request.id, autoApproved: false }
        } else {
            // Auto-approve and execute
            const { data: request, error: createError } = await insertTransferRequest(adminClient, {
                ...requestData,
                status: 'approved',
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                review_notes: 'Auto-approved (same organization)',
            })

            if (createError) {
                console.error('Create transfer request error:', createError)
                return { success: false, error: 'Gagal membuat transfer request' }
            }

            const executeResult = await executeTransfer(request.id, user.id)
            if (!executeResult.success) {
                return { success: false, error: executeResult.error }
            }

            revalidatePath('/users/siswa')
            return { success: true, requestId: request.id, autoApproved: true }
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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        const { data: request } = await fetchTransferRequestById(adminClient, requestId)
        if (!request) return { success: false, error: 'Transfer request tidak ditemukan' }

        if (request.status !== 'pending') {
            return {
                success: false,
                error: `Request sudah ${request.status === 'approved' ? 'disetujui' : 'ditolak'}`,
            }
        }

        if (!canReviewTransferRequest(profile as UserProfile, request as TransferRequest)) {
            return { success: false, error: 'Tidak memiliki izin untuk mereview request ini' }
        }

        const { error: updateError } = await updateTransferRequestStatus(adminClient, requestId, {
            status: 'approved',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: reviewNotes || null,
            updated_at: new Date().toISOString(),
        })

        if (updateError) {
            console.error('Approve transfer request error:', updateError)
            return { success: false, error: 'Gagal menyetujui transfer request' }
        }

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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        const { data: request } = await fetchTransferRequestById(adminClient, requestId)
        if (!request) return { success: false, error: 'Transfer request tidak ditemukan' }

        if (request.status !== 'pending') {
            return {
                success: false,
                error: `Request sudah ${request.status === 'approved' ? 'disetujui' : 'ditolak'}`,
            }
        }

        if (!canReviewTransferRequest(profile as UserProfile, request as TransferRequest)) {
            return { success: false, error: 'Tidak memiliki izin untuk mereview request ini' }
        }

        const { error: updateError } = await updateTransferRequestStatus(adminClient, requestId, {
            status: 'rejected',
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            review_notes: reviewNotes || 'Ditolak',
            updated_at: new Date().toISOString(),
        })

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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: request } = await fetchTransferRequestById(adminClient, requestId)
        if (!request) return { success: false, error: 'Transfer request tidak ditemukan' }

        if (request.status !== 'pending') {
            return { success: false, error: 'Hanya pending request yang bisa dibatalkan' }
        }

        if (request.requested_by !== user.id) {
            return { success: false, error: 'Hanya pembuat request yang bisa membatalkan' }
        }

        const { error: updateError } = await updateTransferRequestStatus(adminClient, requestId, {
            status: 'cancelled',
            updated_at: new Date().toISOString(),
        })

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

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        const { data: requests, error } = await fetchTransferRequestsForUser(adminClient, user.id, {
            role: profile.role,
            daerah_id: profile.daerah_id,
            desa_id: profile.desa_id,
            kelompok_id: profile.kelompok_id,
        })

        if (error) {
            console.error('Get transfer requests error:', error)
            return { success: false, error: 'Gagal mengambil transfer requests' }
        }

        return { success: true, requests: requests || [] }
    } catch (error) {
        console.error('Get transfer requests error:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Gagal mengambil transfer requests',
        }
    }
}

/**
 * Get all organisations for transfer modal (no user hierarchy filter)
 * Fetches all daerah, desa, and kelompok for the transfer destination selector
 */
export async function getAllOrganisationsForTransfer(): Promise<{
    success: boolean
    daerah: any[]
    desa: any[]
    kelompok: any[]
    error?: string
}> {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, daerah: [], desa: [], kelompok: [], error: 'User not authenticated' }

        const [daerahResult, desaResult, kelompokResult] = await Promise.all([
            adminClient.from('daerah').select('id, name').order('name'),
            adminClient.from('desa').select('id, name, daerah_id').order('name'),
            adminClient.from('kelompok').select('id, name, desa_id').order('name'),
        ])

        return {
            success: true,
            daerah: daerahResult.data || [],
            desa: desaResult.data || [],
            kelompok: kelompokResult.data || [],
        }
    } catch (error) {
        console.error('Get all organisations error:', error)
        return {
            success: false,
            daerah: [],
            desa: [],
            kelompok: [],
            error: error instanceof Error ? error.message : 'Gagal mengambil data organisasi',
        }
    }
}
