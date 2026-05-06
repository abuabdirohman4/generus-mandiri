import type { UserProfile } from '@/types/user'

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
    .select('id, full_name, role, email, daerah_id, desa_id, kelompok_id, permissions')
    .eq('id', user.id)
    .single();
    
  return profile as UserProfile | null;
}

// Alias for consistency with server actions
export const getUserProfile = getCurrentUserProfile;

// Material management permission check (server-side version)
export function canManageMaterials(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  if (profile.role === 'admin') return true
  return profile.permissions?.can_manage_materials === true
}

export function canAccessMaterials(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  if (profile.role === 'admin') return true
  // can_manage_materials adalah superset dari can_access_materials
  if (profile.permissions?.can_manage_materials === true) return true
  return profile.permissions?.can_access_materials === true
}

export function canAccessMonitoring(profile: UserProfile | null): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin') return true
  if (profile.role === 'admin') return true
  return profile.permissions?.can_access_monitoring === true
}

export function canAccessOverview(profile: UserProfile | null): boolean {
  if (!profile) return false
  return profile.role === 'superadmin' || profile.role === 'admin' || profile.role === 'teacher'
}

export function isMaterialCoordinator(profile: UserProfile | null): boolean {
  return profile?.role === 'material_coordinator'
}

/**
 * Get restricted class IDs for a teacher based on teacher_class_masters.
 * Optionally filters by hierarchy if a profile is provided.
 * Returns null if no restrictions are found.
 */
export async function getTeacherAllowedClassIds(
  userId: string,
  profile?: { daerah_id?: string | null; desa_id?: string | null; kelompok_id?: string | null } | null
): Promise<Set<string> | null> {
  const { createAdminClient } = await import('@/lib/supabase/server');
  const adminClient = await createAdminClient();

  // 1. Check if this teacher has any class master restrictions
  const { data: tcmData } = await adminClient
    .from('teacher_class_masters')
    .select('class_master_id')
    .eq('teacher_id', userId);
  // No restrictions → null means "no filter, see everything"
  if (!tcmData || tcmData.length === 0) return null;

  const cmIds = tcmData.map((t: any) => t.class_master_id);

  // 2. Get class IDs that map to these class masters
  const { data: mappingData, error: mappingError } = await adminClient
    .from('class_master_mappings')
    .select('class_id')
    .in('class_master_id', cmIds);

  if (mappingError) {
    console.error('[getTeacherAllowedClassIds] Error fetching mappingData:', mappingError);
    return null;
  }

  const allAllowedClassIds = (mappingData || []).map((m: any) => m.class_id);
  if (allAllowedClassIds.length === 0) return new Set();

  // 3. Intersect with org scope using two-query pattern.
  // PostgREST nested join filters (e.g. classes.kelompok.desa_id) silently fail — NEVER use them.
  if (!profile) return new Set(allAllowedClassIds);

  if (profile.kelompok_id) {
    // Direct filter: classes in this kelompok — intersect in-memory to avoid large .in() URL
    const { data: classes } = await adminClient
      .from('classes')
      .select('id')
      .eq('kelompok_id', profile.kelompok_id);

    const allowedSet = new Set(allAllowedClassIds);
    return new Set((classes || []).filter((c: any) => allowedSet.has(c.id)).map((c: any) => c.id));
  }

  if (profile.desa_id) {
    // Two-query: kelompok in this desa → classes in those kelompok
    const { data: kelompoks } = await adminClient
      .from('kelompok')
      .select('id')
      .eq('desa_id', profile.desa_id);
    const kelompokIds = (kelompoks || []).map((k: any) => k.id);
    if (kelompokIds.length === 0) return new Set();

    // Fetch all classes in scope (by kelompok only — allAllowedClassIds may be too large for .in())
    const { data: classes } = await adminClient
      .from('classes')
      .select('id')
      .in('kelompok_id', kelompokIds);

    // Intersect in-memory with allAllowedClassIds
    const allowedSet = new Set(allAllowedClassIds);
    return new Set((classes || []).filter((c: any) => allowedSet.has(c.id)).map((c: any) => c.id));
  }

  if (profile.daerah_id) {
    // Three-query: desa in this daerah → kelompok in those desas → classes in those kelompok
    const { data: desas } = await adminClient
      .from('desa')
      .select('id')
      .eq('daerah_id', profile.daerah_id);
    const desaIds = (desas || []).map((d: any) => d.id);
    if (desaIds.length === 0) return new Set();

    const { data: kelompoks } = await adminClient
      .from('kelompok')
      .select('id')
      .in('desa_id', desaIds);
    const kelompokIds = (kelompoks || []).map((k: any) => k.id);
    if (kelompokIds.length === 0) return new Set();

    // Fetch all classes in scope (by kelompok only — allAllowedClassIds may be too large for .in())
    const { data: classes } = await adminClient
      .from('classes')
      .select('id')
      .in('kelompok_id', kelompokIds);

    // Intersect in-memory with allAllowedClassIds
    const allowedSet = new Set(allAllowedClassIds);
    return new Set((classes || []).filter((c: any) => allowedSet.has(c.id)).map((c: any) => c.id));
  }

  // No org filter → return all class IDs matching the class masters
  // console.log('allAllowedClassIds', allAllowedClassIds);
  return new Set(allAllowedClassIds);
}
