/**
 * Student Validation - Input validation layer
 *
 * This module contains ONLY validation logic for user inputs.
 * No database access, no business logic.
 *
 * All functions are pure (no side effects).
 */

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface StudentCreateData {
  name: string
  gender: string
  classId: string
  kelompokId?: string
}

export interface StudentUpdateData {
  name: string
  gender: string
  classIds: string[]
  kelompokId?: string
}

// ============================================================================
// FIELD VALIDATORS
// ============================================================================

/**
 * Validate gender field
 */
export function validateGender(gender: string): boolean {
  return gender === 'Laki-laki' || gender === 'Perempuan'
}

/**
 * Validate class IDs array
 */
export function validateClassIds(classIds: any): boolean {
  return Array.isArray(classIds) && classIds.length > 0
}

// ============================================================================
// FORM DATA EXTRACTION
// ============================================================================

/**
 * Extract student create data from FormData
 */
export function extractFormData(formData: FormData): StudentCreateData {
  return {
    name: formData.get('name')?.toString() || '',
    gender: formData.get('gender')?.toString() || '',
    classId: formData.get('classId')?.toString() || '',
    kelompokId: formData.get('kelompok_id')?.toString() || undefined,
  }
}

/**
 * Extract student update data from FormData
 */
export function extractUpdateFormData(formData: FormData): StudentUpdateData {
  // Support both classIds (multiple) and classId (single) for backward compatibility
  const classIdsStr =
    formData.get('classIds')?.toString() || formData.get('classId')?.toString()
  const classIds = classIdsStr ? classIdsStr.split(',').filter(Boolean) : []

  return {
    name: formData.get('name')?.toString() || '',
    gender: formData.get('gender')?.toString() || '',
    classIds,
    kelompokId: formData.get('kelompok_id')?.toString() || undefined,
  }
}

// ============================================================================
// STUDENT CREATE VALIDATION
// ============================================================================

/**
 * Validate student creation data
 */
export function validateStudentCreate(
  data: StudentCreateData
): ValidationResult<StudentCreateData> {
  // Trim whitespace
  const trimmedName = data.name.trim()

  if (!trimmedName || trimmedName.length === 0) {
    return { success: false, error: 'Nama siswa wajib diisi' }
  }

  if (!validateGender(data.gender)) {
    return {
      success: false,
      error: 'Jenis kelamin harus "Laki-laki" atau "Perempuan"',
    }
  }

  if (!data.classId || data.classId.trim().length === 0) {
    return { success: false, error: 'Kelas wajib dipilih' }
  }

  return {
    success: true,
    data: {
      ...data,
      name: trimmedName,
    },
  }
}

// ============================================================================
// STUDENT UPDATE VALIDATION
// ============================================================================

/**
 * Validate student update data
 */
export function validateStudentUpdate(
  data: StudentUpdateData
): ValidationResult<StudentUpdateData> {
  // Trim whitespace
  const trimmedName = data.name.trim()

  if (!trimmedName || trimmedName.length === 0) {
    return { success: false, error: 'Nama siswa wajib diisi' }
  }

  if (!validateGender(data.gender)) {
    return {
      success: false,
      error: 'Jenis kelamin harus "Laki-laki" atau "Perempuan"',
    }
  }

  if (!validateClassIds(data.classIds)) {
    return { success: false, error: 'Pilih minimal satu kelas' }
  }

  return {
    success: true,
    data: {
      ...data,
      name: trimmedName,
    },
  }
}

// ============================================================================
// BIODATA VALIDATION
// ============================================================================

/**
 * Validate biodata update (minimal validation - most fields optional)
 */
export function validateBiodataUpdate(biodata: any): ValidationResult<any> {
  // Extract only allowed fields
  const updateData: any = {}

  if (biodata.name !== undefined) {
    const trimmedName = String(biodata.name).trim()
    if (trimmedName.length === 0) {
      return { success: false, error: 'Nama siswa tidak boleh kosong' }
    }
    updateData.name = trimmedName
  }

  if (biodata.nomor_induk !== undefined)
    updateData.nomor_induk = biodata.nomor_induk
  if (biodata.gender !== undefined) {
    if (!validateGender(biodata.gender)) {
      return {
        success: false,
        error: 'Jenis kelamin harus "Laki-laki" atau "Perempuan"',
      }
    }
    updateData.gender = biodata.gender
  }
  if (biodata.tempat_lahir !== undefined)
    updateData.tempat_lahir = biodata.tempat_lahir
  if (biodata.tanggal_lahir !== undefined)
    updateData.tanggal_lahir = biodata.tanggal_lahir
  if (biodata.anak_ke !== undefined) updateData.anak_ke = biodata.anak_ke
  if (biodata.alamat !== undefined) updateData.alamat = biodata.alamat
  if (biodata.nomor_telepon !== undefined)
    updateData.nomor_telepon = biodata.nomor_telepon
  if (biodata.nama_ayah !== undefined) updateData.nama_ayah = biodata.nama_ayah
  if (biodata.nama_ibu !== undefined) updateData.nama_ibu = biodata.nama_ibu
  if (biodata.alamat_orangtua !== undefined)
    updateData.alamat_orangtua = biodata.alamat_orangtua
  if (biodata.telepon_orangtua !== undefined)
    updateData.telepon_orangtua = biodata.telepon_orangtua
  if (biodata.pekerjaan_ayah !== undefined)
    updateData.pekerjaan_ayah = biodata.pekerjaan_ayah
  if (biodata.pekerjaan_ibu !== undefined)
    updateData.pekerjaan_ibu = biodata.pekerjaan_ibu
  if (biodata.nama_wali !== undefined) updateData.nama_wali = biodata.nama_wali
  if (biodata.alamat_wali !== undefined)
    updateData.alamat_wali = biodata.alamat_wali
  if (biodata.pekerjaan_wali !== undefined)
    updateData.pekerjaan_wali = biodata.pekerjaan_wali

  updateData.updated_at = new Date().toISOString()

  return { success: true, data: updateData }
}
