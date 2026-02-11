/**
 * Centralized Student Type Definitions
 *
 * IMPORTANT: This is the single source of truth for all student-related types.
 * All other modules should import from here to maintain consistency.
 *
 * Type hierarchy (extends pattern):
 * StudentBase → StudentWithOrg → StudentWithClasses → StudentBiodata
 */

/**
 * Base student type - minimal fields for basic operations
 * Use for: Permission checks, simple listings
 */
export interface StudentBase {
  id: string
  name: string
  gender: 'Laki-laki' | 'Perempuan' | string | null
  status: 'active' | 'graduated' | 'inactive'
  deleted_at?: string | null
}

/**
 * Student with organizational hierarchy
 * Use for: Filtering, access control, permission checking
 */
export interface StudentWithOrg extends StudentBase {
  daerah_id: string | null
  desa_id: string | null
  kelompok_id: string | null
  daerah_name?: string
  desa_name?: string
  kelompok_name?: string
}

/**
 * Student with class assignments (supports multiple classes)
 * Use for: Class management, attendance, student lists
 */
export interface StudentWithClasses extends StudentWithOrg {
  class_id?: string | null // Legacy: primary class
  classes: Array<{ id: string; name: string }>
  class_name?: string // Legacy: primary class name
  category?: string | null
  created_at: string
  updated_at: string
}

/**
 * Full student biodata with all personal information
 * Use for: Biodata forms, detailed student profile pages
 */
export interface StudentBiodata extends Omit<StudentWithClasses, 'gender'> {
  // Override gender with strict type
  gender: 'Laki-laki' | 'Perempuan' | null

  // Identity
  nomor_induk?: string | null
  tempat_lahir?: string | null
  tanggal_lahir?: string | null // ISO date string (YYYY-MM-DD)
  anak_ke?: number | null

  // Contact
  alamat?: string | null
  nomor_telepon?: string | null

  // Parent Info
  nama_ayah?: string | null
  nama_ibu?: string | null
  alamat_orangtua?: string | null
  telepon_orangtua?: string | null
  pekerjaan_ayah?: string | null
  pekerjaan_ibu?: string | null

  // Guardian Info
  nama_wali?: string | null
  alamat_wali?: string | null
  pekerjaan_wali?: string | null

  // Relations (with full objects)
  kelompok?: { id: string; name: string } | null
  desa?: { id: string; name: string } | null
  daerah?: { id: string; name: string } | null
}

/**
 * Form data for biodata editing
 * String-based for form inputs, convert to proper types on submit
 */
export interface StudentBiodataFormData {
  // Identity
  name: string
  nomor_induk: string
  gender: 'Laki-laki' | 'Perempuan' | ''
  tempat_lahir: string
  tanggal_lahir: string
  anak_ke: string // string for form input, convert to number on submit

  // Contact
  alamat: string
  nomor_telepon: string

  // Parent
  nama_ayah: string
  nama_ibu: string
  alamat_orangtua: string
  telepon_orangtua: string
  pekerjaan_ayah: string
  pekerjaan_ibu: string

  // Guardian
  nama_wali: string
  alamat_wali: string
  pekerjaan_wali: string
}

export type BiodataFormTab = 'identity' | 'contact' | 'parent' | 'guardian'
