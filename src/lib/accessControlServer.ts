interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  kelompok_id?: string | null;
  desa_id?: string | null;
  daerah_id?: string | null;
}

export function canAccessFeature(profile: UserProfile, feature: string): boolean {
  if (profile.role === 'superadmin') return true;
  if (profile.role === 'admin') {
    // Admin can access all features but with filtered data
    return ['dashboard', 'organisasi', 'users'].includes(feature);
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

export async function getCurrentUserProfile() {
  const { createClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, daerah_id, desa_id, kelompok_id')
    .eq('id', user.id)
    .single();
    
  return profile as UserProfile | null;
}
