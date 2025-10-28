import { isAdminDaerah, isAdminDesa, isAdminKelompok } from '@/lib/userUtils'
import type { UserProfile as AccessControlUserProfile } from '@/lib/accessControl'

export const MEETING_TYPES = {
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
    master_class?: Array<{ 
      category?: Array<{ 
        is_sambung_capable: boolean
        exclude_pembinaan: boolean
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
          PEMBINAAN: MEETING_TYPES.PEMBINAAN,
          SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
          SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA,
          SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH,
          SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
        }
      }
    }
  }
  
  // Admin Desa: Pembinaan, Sambung Kelompok, Sambung Desa, Sambung Pusat
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
          PEMBINAAN: MEETING_TYPES.PEMBINAAN,
          SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
          SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA,
          SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH, // hapus nanti
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
    const hasExcludePembinaanClass = userProfile.classes?.some(
      cls => cls.master_class?.[0]?.category?.[0]?.exclude_pembinaan
    )
    
    const hasSambungClass = userProfile.classes?.some(
      cls => cls.master_class?.[0]?.category?.[0]?.is_sambung_capable
    )
    
    // If has exclude_pembinaan class (Orang Tua/Lansia): only Sambung types
    if (hasExcludePembinaanClass) {
      return {
        SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
        SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA, // hapus nanti
        SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH, // hapus nanti
        SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
      }
    }
    
    // If has sambung class: Pembinaan + Sambung types
    if (hasSambungClass) {
      return {
        PEMBINAAN: MEETING_TYPES.PEMBINAAN,
        SAMBUNG_KELOMPOK: MEETING_TYPES.SAMBUNG_KELOMPOK,
        SAMBUNG_DESA: MEETING_TYPES.SAMBUNG_DESA, // hapus nanti
        SAMBUNG_DAERAH: MEETING_TYPES.SAMBUNG_DAERAH, // hapus nanti
        SAMBUNG_PUSAT: MEETING_TYPES.SAMBUNG_PUSAT
      }
    }
    
    // Non-sambung teacher: Pembinaan only
    return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }
  }
  
  // Default: Pembinaan only
  return { PEMBINAAN: MEETING_TYPES.PEMBINAAN }
}

export function getMeetingTypeLabel(code: string): string {
  return Object.values(MEETING_TYPES).find(type => type.code === code)?.label || code
}
