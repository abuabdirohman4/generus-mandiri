// src/app/(admin)/users/siswa/types.ts
// Types for Student Biodata Management

export interface StudentBiodata {
  // Basic Identity
  id: string
  name: string
  nomor_induk?: string | null
  gender: 'Laki-laki' | 'Perempuan' | null
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

  // Existing Relations
  class_id?: string | null
  classes?: Array<{ id: string; name: string }>
  kelompok_id?: string | null
  kelompok?: { id: string; name: string } | null
  desa_id?: string | null
  desa?: { id: string; name: string } | null
  daerah_id?: string | null
  daerah?: { id: string; name: string } | null

  // Timestamps
  created_at?: string
  updated_at?: string
}

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
