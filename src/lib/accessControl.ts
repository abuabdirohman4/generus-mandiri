export interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  kelompok_id?: string | null;
  desa_id?: string | null;
  daerah_id?: string | null;
  can_manage_materials?: boolean;
}

// Role detection utilities
export function isSuperAdmin(profile: UserProfile): boolean {
  return profile.role === 'superadmin'
}

export function isAdminDaerah(profile: UserProfile): boolean {
  return profile.role === 'admin' && !!profile.daerah_id && !profile.desa_id
}

export function isAdminDesa(profile: UserProfile): boolean {
  return profile.role === 'admin' && !!profile.desa_id && !profile.kelompok_id
}

export function isAdminKelompok(profile: UserProfile): boolean {
  return profile.role === 'admin' && !!profile.kelompok_id
}

export function isTeacher(profile: UserProfile): boolean {
  return profile.role === 'teacher'
}

// Teacher level detection utilities
export function isTeacherKelompok(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.kelompok_id
}

export function isTeacherDesa(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.desa_id && !profile.kelompok_id
}

export function isTeacherDaerah(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.daerah_id && !profile.desa_id && !profile.kelompok_id
}

// Get teacher scope for filtering
export function getTeacherScope(profile: UserProfile): 'kelompok' | 'desa' | 'daerah' | null {
  if (!isTeacher(profile)) return null
  if (isTeacherKelompok(profile)) return 'kelompok'
  if (isTeacherDesa(profile)) return 'desa'
  if (isTeacherDaerah(profile)) return 'daerah'
  return null
}

// Check if teacher can access a student based on their scope
export function canTeacherAccessStudent(
  profile: UserProfile,
  student: { daerah_id?: string | null; desa_id?: string | null; kelompok_id?: string | null }
): boolean {
  if (!isTeacher(profile)) return false

  if (isTeacherDaerah(profile)) {
    return student.daerah_id === profile.daerah_id
  }
  if (isTeacherDesa(profile)) {
    return student.desa_id === profile.desa_id
  }
  if (isTeacherKelompok(profile)) {
    return student.kelompok_id === profile.kelompok_id
  }

  return false
}

export function isAdmin(profile: UserProfile): boolean {
  return profile.role === 'admin' || profile.role === 'superadmin'
}

export function isMaterialCoordinator(profile: UserProfile | null): boolean {
  return profile?.role === 'material_coordinator'
}

export function canManageMaterials(profile: UserProfile | null): boolean {
  return profile?.can_manage_materials === true
}

// Filter visibility utilities (for modal forms)
export function shouldShowDaerahFilter(profile: UserProfile): boolean {
  return isSuperAdmin(profile)
}

export function shouldShowDesaFilter(profile: UserProfile): boolean {
  return isSuperAdmin(profile) || isAdminDaerah(profile)
}

export function shouldShowKelompokFilter(profile: UserProfile): boolean {
  return isSuperAdmin(profile) || isAdminDaerah(profile) || isAdminDesa(profile)
}

export function shouldShowKelasFilter(profile: UserProfile, hasMultipleClasses?: boolean): boolean {
  // For teachers, only show if they have multiple classes
  if (isTeacher(profile)) {
    return hasMultipleClasses || false
  }
  // For admins, always show
  return isSuperAdmin(profile) || isAdminDaerah(profile) || isAdminDesa(profile) || isAdminKelompok(profile)
}

// Get required fields for forms based on role
export function getRequiredOrgFields(profile: UserProfile): {
  daerah: boolean
  desa: boolean  
  kelompok: boolean
} {
  if (isSuperAdmin(profile)) {
    return { daerah: true, desa: true, kelompok: true }
  }
  if (isAdminDaerah(profile)) {
    return { daerah: false, desa: true, kelompok: true } // daerah auto-filled, desa & kelompok required
  }
  if (isAdminDesa(profile)) {
    return { daerah: false, desa: false, kelompok: true } // daerah & desa auto-filled, kelompok required
  }
  if (isAdminKelompok(profile)) {
    return { daerah: false, desa: false, kelompok: false } // all auto-filled
  }
  if (isTeacher(profile)) {
    return { daerah: false, desa: false, kelompok: false } // all auto-filled
  }
  return { daerah: true, desa: true, kelompok: true } // default fallback
}

// Get auto-filled values for forms based on role
export function getAutoFilledOrgValues(profile: UserProfile): {
  daerah_id?: string
  desa_id?: string
  kelompok_id?: string
} {
  return {
    daerah_id: profile.daerah_id || undefined,
    desa_id: profile.desa_id || undefined,
    kelompok_id: profile.kelompok_id || undefined
  }
}

export function canAccessFeature(profile: UserProfile, feature: string): boolean {
  if (profile.role === 'superadmin') return true;
  if (profile.role === 'admin') {
    // Admin can access all features but with filtered data
    return ['dashboard', 'organisasi', 'users'].includes(feature);
  }
  if (profile.role === 'teacher') {
    // Teachers can access users (students) and absensi features
    return ['users', 'absensi'].includes(feature);
  }
  return false;
}

export function getDataFilter(profile: UserProfile) {
  if (profile.role === 'superadmin') {
    return {}; // No filter, access all data
  }
  if (profile.role === 'admin') {
    return {
      daerah_id: profile.daerah_id,
      desa_id: profile.desa_id,
      kelompok_id: profile.kelompok_id
    };
  }
  return null; // No access
}
