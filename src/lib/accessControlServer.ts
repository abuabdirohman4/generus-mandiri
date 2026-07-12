import { cache } from 'react'
import type { UserProfile } from '@/types/user'

export function canAccessFeature(profile: UserProfile, feature: string): boolean {
  if (profile.role === 'superadmin') return true;
  if (profile.role === 'admin') {
    // Admin can access all features but with filtered data
    // manage_class_masters is intentionally excluded — the 19 class masters are
    // a fixed reference list, only superadmin may create/edit/delete them.
    return ['dashboard', 'organisasi', 'users', 'manage_classes'].includes(feature);
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
    // For teachers, we prioritize the broadest scope available to support multi-kelompok assignments.
    // Their specific access is further refined by getTeacherAllowedClassIds in the actions.
    if (profile.daerah_id && !profile.desa_id && !profile.kelompok_id) {
      return { daerah_id: profile.daerah_id }
    }
    if (profile.desa_id) {
      return { desa_id: profile.desa_id }
    }
    if (profile.kelompok_id) {
      return { kelompok_id: profile.kelompok_id }
    }
  }

  return null
}

// Wrapped in React cache(): deduplicates getUser()+profile fetch within a
// single server request render pass. A page-load fans out to many server
// actions, each of which used to re-run auth.getUser() + a profiles fetch —
// the flood of `auth/v1/user` + `profiles?...permissions` in api-logs (Auth
// ~11% egress). cache() collapses those to one call per request; it resets
// every request, so auth is still validated once per request (no cross-request
// staleness). See egress-register (Auth flood, sm-lm8q).
export const getCurrentUserProfile = cache(async (): Promise<UserProfile | null> => {
  const { createClient, createAuthClient } = await import('@/lib/supabase/server');
  const supabase = await createClient();

  const { data: { user } } = await (await createAuthClient()).auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, role, email, daerah_id, desa_id, kelompok_id, permissions')
    .eq('id', user.id)
    .single();

  return profile as UserProfile | null;
})

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

export function canSendNotification(profile: UserProfile): boolean {
  const isSuperAdmin = profile.role === 'superadmin'
  const isAdminDaerah = profile.role === 'admin' && !!profile.daerah_id && !profile.desa_id
  return isSuperAdmin || isAdminDaerah
}

export function canBulkAssignCrossKelompok(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  const isSuperAdmin = profile.role === 'superadmin'
  const isAdminDaerah = profile.role === 'admin' && !!profile.daerah_id && !profile.desa_id
  const isAdminDesa = profile.role === 'admin' && !!profile.desa_id && !profile.kelompok_id
  const isTeacherDaerah = profile.role === 'teacher' && !!profile.daerah_id && !profile.desa_id && !profile.kelompok_id
  const isTeacherDesa = profile.role === 'teacher' && !!profile.desa_id && !profile.kelompok_id

  if (isSuperAdmin || isAdminDaerah || isAdminDesa) return true
  if (isTeacherDaerah || isTeacherDesa) return true
  
  return profile.permissions?.can_bulk_assign_cross_kelompok === true
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

  // 1. Get classes from teacher_classes (direct assignments)
  const { data: tcData } = await adminClient
    .from('teacher_classes')
    .select('class_id')
    .eq('teacher_id', userId);
  
  const assignedClassIds = (tcData || []).map((t: any) => t.class_id);

  // 2. Check if this teacher has any class master restrictions (hierarchical assignments)
  const { data: tcmData } = await adminClient
    .from('teacher_class_masters')
    .select('class_master_id, custom_class_name')
    .eq('teacher_id', userId);
  
  // If no assignments at all → null means "no filter, see everything in my scope"
  // but wait, usually teachers MUST have at least one assignment to see anything.
  // For now, if both are empty, we return null to maintain backward compatibility 
  // where Guru Kelompok with no teacher_classes saw everything in their kelompok.
  if ((!tcData || tcData.length === 0) && (!tcmData || tcmData.length === 0)) return null;

  // Split: class masters with NO custom_class_name grant ALL classes under that master.
  // Class masters WITH a custom_class_name (used for shared masters like "Lainnya")
  // grant access ONLY to the class whose name matches exactly.
  const unrestrictedCmIds = (tcmData || [])
    .filter((t: any) => !t.custom_class_name)
    .map((t: any) => t.class_master_id);
  const customNameFilters = (tcmData || [])
    .filter((t: any) => !!t.custom_class_name)
    .map((t: any) => ({ classMasterId: t.class_master_id, customClassName: t.custom_class_name as string }));

  const cmIds = [...new Set([...unrestrictedCmIds, ...customNameFilters.map((f: any) => f.classMasterId)])];

  // 3. Get class IDs that map to these class masters
  let classMasterAllowedIds: string[] = [];
  if (cmIds.length > 0) {
    const { data: mappingData, error: mappingError } = await adminClient
      .from('class_master_mappings')
      .select('class_id, class_master_id, classes:class_id(name)')
      .in('class_master_id', cmIds);

    if (mappingError) {
      console.error('[getTeacherAllowedClassIds] Error fetching mappingData:', mappingError);
    } else {
      classMasterAllowedIds = (mappingData || [])
        .filter((m: any) => {
          // Unrestricted master (custom_class_name null) → allow this class
          if (unrestrictedCmIds.includes(m.class_master_id)) return true
          // Restricted master → allow only if class name matches one of the assigned custom names
          const filters = customNameFilters.filter((f: any) => f.classMasterId === m.class_master_id)
          if (filters.length === 0) return false
          const className = Array.isArray(m.classes) ? m.classes[0]?.name : m.classes?.name
          return filters.some((f: any) => f.customClassName === className)
        })
        .map((m: any) => m.class_id);
    }
  }

  const allAllowedClassIds = [...new Set([...assignedClassIds, ...classMasterAllowedIds])];
  if (allAllowedClassIds.length === 0) return new Set();

  // 4. Intersect with org scope using two-query pattern.
  // PostgREST nested join filters (e.g. classes.kelompok.desa_id) silently fail — NEVER use them.
  if (!profile) return new Set(allAllowedClassIds);

  // 5. Intersect with org scope using two-query pattern.
  // PostgREST nested join filters (e.g. classes.kelompok.desa_id) silently fail — NEVER use them.
  if (!profile) return new Set(allAllowedClassIds);

  // We skip the kelompok_id intersection here because teachers often have assignments 
  // spanning multiple kelompok even if their primary profile.kelompok_id is set.
  // Hierarchical restrictions (desa/daerah) are still applied below.

  if (profile.desa_id) {
    // Two-query: kelompok in this desa → classes in those kelompok
    const { data: kelompoks } = await adminClient
      .from('kelompok')
      .select('id')
      .eq('desa_id', profile.desa_id);
    let kelompokIds = (kelompoks || []).map((k: any) => k.id);
    if (kelompokIds.length === 0) return new Set();

    // If teacher has restricted kelompok access, intersect with allowed kelompok
    const { data: kelompokAccess } = await adminClient
      .from('teacher_kelompok_access')
      .select('kelompok_id')
      .eq('teacher_id', userId);
    if (kelompokAccess && kelompokAccess.length > 0) {
      const allowedKelompokSet = new Set(kelompokAccess.map((r: any) => r.kelompok_id));
      kelompokIds = kelompokIds.filter((id: string) => allowedKelompokSet.has(id));
      if (kelompokIds.length === 0) return new Set();
    }

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
