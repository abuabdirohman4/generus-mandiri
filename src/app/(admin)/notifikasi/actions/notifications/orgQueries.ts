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

export interface UserListItem {
  id: string
  name: string
  subtitle: string // role + org context
}

export async function fetchUserList(opts: { search?: string; daerahId?: string }): Promise<UserListItem[]> {
  try {
    const adminClient = await createAdminClient()
    let query = adminClient
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa:desa_id(name), kelompok:kelompok_id(name)')
      .order('full_name')
      .limit(50)

    if (opts.daerahId) {
      query = query.eq('daerah_id', opts.daerahId) as typeof query
    }
    if (opts.search?.trim()) {
      query = query.ilike('full_name', `%${opts.search.trim()}%`) as typeof query
    }

    const { data, error } = await query
    if (error || !data) return []

    return data.map((p: {
      id: string
      full_name: string
      role: string
      daerah_id: string | null
      desa: { name: string } | null
      kelompok: { name: string } | null
    }) => {
      const roleLabel = p.role === 'superadmin' ? 'Superadmin'
        : p.role === 'admin' ? 'Admin'
        : p.role === 'teacher' ? 'Guru'
        : p.role === 'student' ? 'Siswa'
        : p.role
      const orgLabel = p.kelompok?.name ?? p.desa?.name ?? ''
      const subtitle = orgLabel ? `${roleLabel} · ${orgLabel}` : roleLabel
      return { id: p.id, name: p.full_name, subtitle }
    })
  } catch {
    return []
  }
}
