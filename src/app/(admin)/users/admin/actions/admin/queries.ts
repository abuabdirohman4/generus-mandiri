// Layer 1: Database queries
// NO 'use server' - pure database operations

import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminFilter } from '../types';

export async function insertAdminProfile(
  supabase: SupabaseClient,
  profileData: {
    id: string;
    username: string;
    full_name: string;
    email: string;
    role: string;
    daerah_id: string;
    desa_id?: string | null;
    kelompok_id?: string | null;
    can_manage_materials?: boolean;
  }
) {
  return await supabase.from('profiles').insert([profileData]);
}

export async function updateAdminProfile(
  supabase: SupabaseClient,
  id: string,
  profileData: {
    username: string;
    full_name: string;
    email: string;
    daerah_id: string;
    desa_id?: string | null;
    kelompok_id?: string | null;
    can_manage_materials?: boolean;
    updated_at: string;
  }
) {
  return await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', id);
}

export async function fetchAdmins(
  supabase: SupabaseClient,
  filter?: AdminFilter
) {
  let query = supabase
    .from('profiles')
    .select(`
      *,
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name)
    `)
    .in('role', ['admin', 'superadmin'])
    .order('username');

  // Apply filtering based on admin level
  if (filter?.kelompok_id) {
    // Admin Kelompok: only see admins in their kelompok
    query = query.eq('kelompok_id', filter.kelompok_id);
  } else if (filter?.desa_id) {
    // Admin Desa: only see admins in their desa (Admin Kelompok only)
    // Filter out Admin Daerah by ensuring they have a desa_id
    query = query
      .eq('desa_id', filter.desa_id)
      .not('desa_id', 'is', null);
  } else if (filter?.daerah_id) {
    // Admin Daerah: see Admin Desa and Admin Kelompok in their daerah
    // Filter out other Admin Daerah by ensuring they have a desa_id
    query = query
      .eq('daerah_id', filter.daerah_id)
      .not('desa_id', 'is', null);
  }
  // Superadmin: no filter, see all

  return await query;
}
