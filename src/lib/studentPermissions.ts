/**
 * Student Management Permissions
 *
 * Handles permission checking for student lifecycle actions:
 * - Archive (graduated/inactive)
 * - Transfer (internal)
 * - Soft Delete (restorable)
 * - Hard Delete (permanent, superadmin only)
 */

export interface UserProfile {
  id: string
  full_name: string
  role: 'superadmin' | 'admin' | 'teacher' | 'student'
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  permissions?: {
    can_archive_students?: boolean
    can_transfer_students?: boolean
    can_soft_delete_students?: boolean
    can_hard_delete_students?: boolean
  }
}

export interface Student {
  id: string
  full_name: string
  daerah_id: string
  desa_id: string
  kelompok_id: string
  status: 'active' | 'graduated' | 'inactive'
  deleted_at?: string | null
}

/**
 * Check if user can archive a student (mark as graduated/inactive)
 */
export function canArchiveStudent(
  user: UserProfile | null,
  student: Student
): boolean {
  if (!user) return false

  // Superadmin can archive any student
  if (user.role === 'superadmin') return true

  // Admin can archive students in their organizational hierarchy
  if (user.role === 'admin') {
    return isStudentInUserHierarchy(user, student)
  }

  // Teacher needs explicit permission
  if (user.role === 'teacher') {
    return user.permissions?.can_archive_students === true
  }

  // Student role has no permissions
  return false
}

/**
 * Check if user can transfer a student to different org/class
 */
export function canTransferStudent(
  user: UserProfile | null,
  student: Student
): boolean {
  if (!user) return false

  // Superadmin can transfer any student
  if (user.role === 'superadmin') return true

  // Admin can transfer students in their organizational hierarchy
  if (user.role === 'admin') {
    return isStudentInUserHierarchy(user, student)
  }

  // Teacher needs explicit permission
  if (user.role === 'teacher') {
    return user.permissions?.can_transfer_students === true
  }

  return false
}

/**
 * Check if user can soft delete a student (restorable)
 */
export function canSoftDeleteStudent(
  user: UserProfile | null,
  student: Student
): boolean {
  if (!user) return false

  // Superadmin can soft delete any student
  if (user.role === 'superadmin') return true

  // Admin can soft delete students in their organizational hierarchy
  if (user.role === 'admin') {
    return isStudentInUserHierarchy(user, student)
  }

  // Teacher needs explicit permission
  if (user.role === 'teacher') {
    return user.permissions?.can_soft_delete_students === true
  }

  return false
}

/**
 * Check if user can hard delete a student (permanent)
 * ONLY superadmin + student must be soft deleted first
 */
export function canHardDeleteStudent(
  user: UserProfile | null,
  student: Student
): boolean {
  if (!user) return false

  // ONLY superadmin can hard delete
  if (user.role !== 'superadmin') return false

  // Student must be soft deleted first (2-step process)
  if (!student.deleted_at) return false

  return true
}

/**
 * Get list of daerah IDs that user can transfer student to
 */
export function getTransferableDaerahIds(
  user: UserProfile | null,
  allDaerahIds: string[]
): string[] {
  if (!user) return []

  // Superadmin can transfer to any daerah
  if (user.role === 'superadmin') return allDaerahIds

  // Admin can only transfer within their daerah (cannot cross daerah boundary)
  if (user.role === 'admin' && user.daerah_id) {
    return allDaerahIds.filter((id) => id === user.daerah_id)
  }

  // Teacher cannot transfer across daerah
  return []
}

/**
 * Get list of desa IDs that user can transfer student to (within a daerah)
 */
export function getTransferableDesaIds(
  user: UserProfile | null,
  targetDaerahId: string,
  allDesaIds: string[]
): string[] {
  if (!user) return []

  // Superadmin can transfer to any desa in the daerah
  if (user.role === 'superadmin') return allDesaIds

  // Admin Daerah can transfer to any desa in their daerah
  if (user.role === 'admin' && user.daerah_id === targetDaerahId && !user.desa_id) {
    return allDesaIds
  }

  // Admin Desa can only transfer within their own desa
  if (user.role === 'admin' && user.desa_id) {
    return allDesaIds.filter((id) => id === user.desa_id)
  }

  // Teacher cannot transfer across desa
  return []
}

/**
 * Get list of kelompok IDs that user can transfer student to (within a desa)
 */
export function getTransferableKelompokIds(
  user: UserProfile | null,
  targetDesaId: string,
  allKelompokIds: string[]
): string[] {
  if (!user) return []

  // Superadmin can transfer to any kelompok in the desa
  if (user.role === 'superadmin') return allKelompokIds

  // Admin Daerah can transfer to any kelompok in their daerah
  if (user.role === 'admin' && user.daerah_id && !user.desa_id) {
    return allKelompokIds
  }

  // Admin Desa can transfer to any kelompok in their desa
  if (user.role === 'admin' && user.desa_id === targetDesaId && !user.kelompok_id) {
    return allKelompokIds
  }

  // Admin Kelompok can only transfer within their own kelompok
  if (user.role === 'admin' && user.kelompok_id) {
    return allKelompokIds.filter((id) => id === user.kelompok_id)
  }

  // Teacher cannot transfer across kelompok
  return []
}

/**
 * Helper: Check if student is within user's organizational hierarchy
 */
function isStudentInUserHierarchy(user: UserProfile, student: Student): boolean {
  // Check daerah level
  if (user.daerah_id && user.daerah_id !== student.daerah_id) {
    return false
  }

  // Check desa level (if user has desa_id)
  if (user.desa_id && user.desa_id !== student.desa_id) {
    return false
  }

  // Check kelompok level (if user has kelompok_id)
  if (user.kelompok_id && user.kelompok_id !== student.kelompok_id) {
    return false
  }

  return true
}
