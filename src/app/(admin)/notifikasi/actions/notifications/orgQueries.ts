'use server'

import { createAdminClient } from '@/lib/supabase/server'

export interface OrgItem {
  id: string
  name: string
}

export async function fetchDaerahList(): Promise<OrgItem[]> {
  try {
    const adminClient = await createAdminClient()
    const { data, error } = await adminClient
      .from('daerah')
      .select('id, name')
      .order('name')
    if (error) return []
    return (data ?? []) as OrgItem[]
  } catch {
    return []
  }
}

export async function fetchDesaList(daerahId?: string): Promise<OrgItem[]> {
  try {
    const adminClient = await createAdminClient()
    let query = adminClient.from('desa').select('id, name, daerah_id').order('name')
    if (daerahId) {
      query = query.eq('daerah_id', daerahId) as typeof query
    }
    const { data, error } = await query
    if (error) return []
    return (data ?? []) as OrgItem[]
  } catch {
    return []
  }
}

export async function fetchKelompokList(desaId?: string): Promise<OrgItem[]> {
  try {
    const adminClient = await createAdminClient()
    let query = adminClient.from('kelompok').select('id, name, desa_id').order('name')
    if (desaId) {
      query = query.eq('desa_id', desaId) as typeof query
    }
    const { data, error } = await query
    if (error) return []
    return (data ?? []) as OrgItem[]
  } catch {
    return []
  }
}
