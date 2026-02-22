interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  kelompok_id?: string | null;
  desa_id?: string | null;
  daerah_id?: string | null;
  can_manage_materials?: boolean;
}

export function canAccessFeature(profile: UserProfile, feature: string): boolean {
  if (profile.role === 'superadmin') return true;
  if (profile.role === 'admin') {
    // Admin can access all features but with filtered data
    return ['dashboard', 'organisasi', 'users', 'manage_class_masters', 'manage_classes'].includes(feature);
  }
  return false;
}

export function getDataFilter(profile: UserProfile | null): {
  daerah_id?: string
  desa_id?: string
  kelompok_id?: string
} | null {
  if (!profile) return null

  // Superadmin has access to all data
  if (profile.role === 'superadmin') {
    return null
  }

  // Admin filtering (existing logic)
  if (profile.role === 'admin') {
    // Admin Kelompok
    if (profile.kelompok_id) {
      return { kelompok_id: profile.kelompok_id }
    }
    // Admin Desa
    if (profile.desa_id) {
      return { desa_id: profile.desa_id }
    }
    // Admin Daerah
    if (profile.daerah_id) {
      return { daerah_id: profile.daerah_id }
    }
  }

  // Teacher filtering
  if (profile.role === 'teacher') {
    // Teacher Kelompok
    if (profile.kelompok_id) {
      return { kelompok_id: profile.kelompok_id }
    }
    // Teacher Desa
    if (profile.desa_id && !profile.kelompok_id) {
      return { desa_id: profile.desa_id }
    }
    // Teacher Daerah
    if (profile.daerah_id && !profile.desa_id && !profile.kelompok_id) {
      return { daerah_id: profile.daerah_id }
    }
  }

  return null
}

export async function getCurrentUserProfile() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, daerah_id, desa_id, kelompok_id, can_manage_materials')
    .eq('id', user.id)
    .single();
    
  return profile as UserProfile | null;
}

// Alias for consistency with server actions
export const getUserProfile = getCurrentUserProfile;

// Material management permission check (server-side version)
export function canManageMaterials(profile: UserProfile | null): boolean {
  return profile?.can_manage_materials === true
}

export function isMaterialCoordinator(profile: UserProfile | null): boolean {
  return profile?.role === 'material_coordinator'
}
