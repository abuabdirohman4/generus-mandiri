/**
 * Student Management Queries (Layer 1)
 *
 * Database queries for archive, unarchive, and transfer operations.
 * NO 'use server' directive - pure query builders.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// ============================
// ARCHIVE QUERIES
// ============================

export async function fetchStudentForManagement(
    supabase: SupabaseClient,
    studentId: string
) {
    return await supabase
        .from('students')
        .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
        .eq('id', studentId)
        .single()
}

export async function updateStudentStatusArchive(
    supabase: SupabaseClient,
    studentId: string,
    userId: string,
    status: 'graduated' | 'inactive',
    notes?: string | null
) {
    return await supabase
        .from('students')
        .update({
            status,
            archived_at: new Date().toISOString(),
            archived_by: userId,
            archive_notes: notes || null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
}

export async function updateStudentStatusActive(
    supabase: SupabaseClient,
    studentId: string
) {
    return await supabase
        .from('students')
        .update({
            status: 'active',
            archived_at: null,
            archived_by: null,
            archive_notes: null,
            updated_at: new Date().toISOString(),
        })
        .eq('id', studentId)
}

// ============================
// TRANSFER QUERIES
// ============================

export async function fetchStudentsForTransfer(
    supabase: SupabaseClient,
    studentIds: string[]
) {
    return await supabase
        .from('students')
        .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
        .in('id', studentIds)
}

export async function fetchPendingTransferRequests(
    supabase: SupabaseClient
) {
    return await supabase
        .from('transfer_requests')
        .select('id, student_ids, status')
        .eq('status', 'pending')
}

export async function insertTransferRequest(
    supabase: SupabaseClient,
    data: any
) {
    return await supabase
        .from('transfer_requests')
        .insert(data)
        .select('id')
        .single()
}

export async function fetchTransferRequestById(
    supabase: SupabaseClient,
    requestId: string
) {
    return await supabase
        .from('transfer_requests')
        .select('*')
        .eq('id', requestId)
        .single()
}

export async function updateTransferRequestStatus(
    supabase: SupabaseClient,
    requestId: string,
    data: Record<string, any>
) {
    return await supabase
        .from('transfer_requests')
        .update(data)
        .eq('id', requestId)
}

export async function updateStudentsOrganization(
    supabase: SupabaseClient,
    studentIds: string[],
    orgData: {
        daerah_id: string
        desa_id: string
        kelompok_id: string
    }
) {
    return await supabase
        .from('students')
        .update({
            ...orgData,
            updated_at: new Date().toISOString(),
        })
        .in('id', studentIds)
}

export async function deleteStudentClassAssignments(
    supabase: SupabaseClient,
    studentIds: string[]
) {
    return await supabase
        .from('student_classes')
        .delete()
        .in('student_id', studentIds)
}

export async function insertStudentClassAssignments(
    supabase: SupabaseClient,
    assignments: Array<{ student_id: string; class_id: string }>
) {
    return await supabase
        .from('student_classes')
        .insert(assignments)
}

export async function fetchStudentTransferHistory(
    supabase: SupabaseClient,
    studentId: string
) {
    return await supabase
        .from('students')
        .select('transfer_history')
        .eq('id', studentId)
        .single()
}

export async function updateStudentTransferHistory(
    supabase: SupabaseClient,
    studentId: string,
    history: any[]
) {
    return await supabase
        .from('students')
        .update({ transfer_history: history })
        .eq('id', studentId)
}

export async function fetchTransferRequestsForUser(
    supabase: SupabaseClient,
    userId: string,
    userOrg: {
        role: string
        daerah_id?: string | null
        desa_id?: string | null
        kelompok_id?: string | null
    }
) {
    let query = supabase
        .from('transfer_requests')
        .select(`
      id,
      student_ids,
      from_daerah_id,
      from_desa_id,
      from_kelompok_id,
      to_daerah_id,
      to_desa_id,
      to_kelompok_id,
      to_class_ids,
      status,
      requested_by,
      requested_at,
      reason,
      notes,
      reviewed_by,
      reviewed_at,
      review_notes,
      executed_at,
      executed_by
    `)
        .order('requested_at', { ascending: false })

    // Superadmin sees all
    if (userOrg.role === 'superadmin') {
        return await query
    }

    // Others see requests relevant to their org (as requester or reviewer)
    return await query.or(`requested_by.eq.${userId}`)
}
