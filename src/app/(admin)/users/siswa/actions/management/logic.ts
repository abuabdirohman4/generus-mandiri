/**
 * Student Management Logic (Layer 2)
 *
 * Pure business logic for archive and transfer operations.
 * NO 'use server' directive - testable without mocking.
 */

export function validateArchiveInput(data: {
    studentId?: string
    status?: string
}): { ok: boolean; error?: string } {
    if (!data.studentId) {
        return { ok: false, error: 'Student ID required' }
    }

    if (!data.status || !['graduated', 'inactive'].includes(data.status)) {
        return { ok: false, error: 'Status tidak valid' }
    }

    return { ok: true }
}

export function validateTransferInput(data: {
    studentIds?: string[]
    toDaerahId?: string
    toDesaId?: string
    toKelompokId?: string
}): { ok: boolean; error?: string } {
    if (!data.studentIds || data.studentIds.length === 0) {
        return { ok: false, error: 'Pilih minimal satu siswa' }
    }

    if (!data.toDaerahId || !data.toDesaId || !data.toKelompokId) {
        return { ok: false, error: 'Destinasi transfer tidak lengkap' }
    }

    return { ok: true }
}

export function checkStudentsFromSameOrg(
    students: Array<{ daerah_id: string; desa_id: string; kelompok_id: string }>
): boolean {
    if (students.length === 0) return true
    const first = students[0]
    return students.every(
        s =>
            s.daerah_id === first.daerah_id &&
            s.desa_id === first.desa_id &&
            s.kelompok_id === first.kelompok_id
    )
}

export function findStudentsWithPendingTransfer(
    students: Array<{ id: string; name: string }>,
    pendingRequests: Array<{ student_ids?: string[] }>
): string[] {
    const names: string[] = []
    for (const student of students) {
        const hasPending = pendingRequests.some(req => req.student_ids?.includes(student.id))
        if (hasPending) names.push(student.name)
    }
    return names
}
