import { isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'
import type { UserProfile as AccessControlUserProfile } from '@/lib/accessControl'
import { isTeacherClass } from '@/lib/utils/classHelpers'

export const MEETING_TYPES = {
  ASAD: { code: 'ASAD', label: 'ASAD' },
  PEMBINAAN: { code: 'PEMBINAAN', label: 'Pembinaan' },
  SAMBUNG_KELOMPOK: { code: 'SAMBUNG_KELOMPOK', label: 'Sambung Kelompok' },
  SAMBUNG_DESA: { code: 'SAMBUNG_DESA', label: 'Sambung Desa' },
  SAMBUNG_DAERAH: { code: 'SAMBUNG_DAERAH', label: 'Sambung Daerah' },
  SAMBUNG_PUSAT: { code: 'SAMBUNG_PUSAT', label: 'Sambung Pusat' }
} as const

export type MeetingTypes = typeof MEETING_TYPES[keyof typeof MEETING_TYPES]
export type MeetingTypeCode = typeof MEETING_TYPES[keyof typeof MEETING_TYPES]['code']

interface UserProfile extends Partial<AccessControlUserProfile> {
  role: string
  classes?: Array<{
    id: string
    name?: string
    master_class?: Array<{
      category?: Array<{
        is_sambung_capable: boolean
        exclude_pembinaan: boolean
        code?: string
        name?: string
      }>
    }>
  }>
}

export function getAvailableMeetingTypesByRole(userProfile: UserProfile | null): Partial<typeof MEETING_TYPES> {
  if (!userProfile) return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }

  const role = userProfile.role

  // Superadmin: All types
  if (role === 'superadmin') {
    return MEETING_TYPES
  }

  // Admin Daerah: All including Sambung Pusat
  if (role === 'admin' && userProfile.daerah_id && !userProfile.desa_id) {
    // Type guard to ensure we have required fields
    if (userProfile.id && userProfile.full_name) {
      const adminProfile: AccessControlUserProfile = {
        id: userProfile.id,
        full_name: userProfile.full_name,
        role: userProfile.role,
        daerah_id: userProfile.daerah_id,
        desa_id: userProfile.desa_id,
        kelompok_id: userProfile.kelompok_id
      }

      if (isAdminDaerah(adminProfile)) {
        return {
          ASAD: MEETING_TYPES.ASAD,
          PEMBINAAN: MEETING_TYPES.PEMBINAAN,
          SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
          SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA,
          SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH,
          SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
        }
      }
    }
  }

  // Admin Desa: ONLY Sambung Desa (simplified)
  if (role === 'admin' && userProfile.desa_id && !userProfile.kelompok_id) {
    if (userProfile.id && userProfile.full_name) {
      const adminProfile: AccessControlUserProfile = {
        id: userProfile.id,
        full_name: userProfile.full_name,
        role: userProfile.role,
        daerah_id: userProfile.daerah_id,
        desa_id: userProfile.desa_id,
        kelompok_id: userProfile.kelompok_id
      }

      if (isAdminDesa(adminProfile)) {
        return {
          ASAD: MEETING_TYPES.ASAD,
          PEMBINAAN: MEETING_TYPES.PEMBINAAN,
          SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
          SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA,
          SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH,
          SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
        }
      }
    }
  }

  // Admin Kelompok: Pembinaan, Sambung Kelompok, Sambung Pusat
  if (role === 'admin' && userProfile.kelompok_id) {
    if (userProfile.id && userProfile.full_name) {
      const adminProfile: AccessControlUserProfile = {
        id: userProfile.id,
        full_name: userProfile.full_name,
        role: userProfile.role,
        daerah_id: userProfile.daerah_id,
        desa_id: userProfile.desa_id,
        kelompok_id: userProfile.kelompok_id
      }

      if (isAdminKelompok(adminProfile)) {
        return {
          ASAD: MEETING_TYPES.ASAD,
          PEMBINAAN: MEETING_TYPES.PEMBINAAN,
          SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
          SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA, // hapus nanti
          SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH, // hapus nanti
          SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
        }
      }
    }
  }

  // Teacher: Check class capabilities
  if (role === 'teacher') {
    // Hierarchical teachers (no classes)
    if (!userProfile.classes || userProfile.classes.length === 0) {
      if (userProfile.daerah_id && !userProfile.desa_id) {
        return { SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH }
      }
      if (userProfile.desa_id && !userProfile.kelompok_id) {
        return { SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA }
      }
      if (userProfile.kelompok_id) {
        return { SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK }
      }
    }

    const hasExcludePembinaanClass = userProfile.classes?.some(cls => {
      const isPengajar = isTeacherClass({ name: cls.name })
      return !isPengajar && cls.master_class?.[0]?.category?.[0]?.exclude_pembinaan
    })

    const hasSambungClass = userProfile.classes?.some(cls => {
      const isPengajar = isTeacherClass({ name: cls.name })
      return !isPengajar && cls.master_class?.[0]?.category?.[0]?.is_sambung_capable
    })

    // Check if teacher has any class that is NOT PAUD and NOT Pengajar
    const hasNonPaudClass = userProfile.classes?.some(cls => {
      const category = cls.master_class?.[0]?.category?.[0]

      // Exclude Pengajar class
      if (isTeacherClass({ name: cls.name })) {
        return false
      }

      if (!category) return true // Assume non-PAUD if no category

      const code = category.code?.toUpperCase() || ''
      const name = category.name?.toUpperCase() || ''

      return code !== 'PAUD' && name !== 'PAUD'
    })

    let availableTypes: Partial<typeof MEETING_TYPES> = {
      PEMBINAAN: MEETING_TYPES.PEMBINAAN
    }

    // If has exclude_pembinaan class (Orang Tua/Lansia): only Sambung types
    if (hasExcludePembinaanClass) {
      availableTypes = {
        SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
        SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA, // hapus nanti
        SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH, // hapus nanti
        SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
      }
    }

    // If has sambung class: Pembinaan + Sambung types
    else if (hasSambungClass) {
      availableTypes = {
        PEMBINAAN: MEETING_TYPES.PEMBINAAN,
        SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
        SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA, // hapus nanti
        SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH, // hapus nanti
        SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
      }
    }

    // Add ASAD if eligible
    if (hasNonPaudClass) {
      availableTypes = {
        ASAD: MEETING_TYPES.ASAD,
        ...availableTypes
      }
    }

    return availableTypes
  }

  // Default: Pembinaan only
  return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }
}

export function getMeetingTypeLabel(code: string): string {
  return Object.values(MEETING_TYPES).find(type => type.code === code)?.label || code
}
