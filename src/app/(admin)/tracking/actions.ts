'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import { handleApiError } from '@/lib/errorUtils'
import type { ActivityLog } from '@/types/activityLog'

export interface GetLogsParams {
  userId?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

/**
 * Fetch activity logs with filtering and pagination
 * Respects organizational hierarchy filtering
 */
export async function getActivityLogs(params: GetLogsParams) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Unauthorized')

    const filter = getDataFilter(profile)
    const page = params.page || 1
    const limit = params.limit || 50
    const offset = (page - 1) * limit

    let query = supabase
      .from('activity_logs')
      .select('*, profile:profiles(full_name, username)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply organizational filters
    if (filter?.daerah_id) query = query.eq('org_daerah_id', filter.daerah_id)
    if (filter?.desa_id) query = query.eq('org_desa_id', filter.desa_id)
    if (filter?.kelompok_id) query = query.eq('org_kelompok_id', filter.kelompok_id)

    // Apply specific filters
    if (params.userId) query = query.eq('user_id', params.userId)
    if (params.action) query = query.eq('action', params.action)
    if (params.entityType) query = query.eq('entity_type', params.entityType)
    
    if (params.startDate) {
      query = query.gte('created_at', params.startDate)
    }
    if (params.endDate) {
      // Add one day to end date to include all of that day
      const end = new Date(params.endDate)
      end.setDate(end.getDate() + 1)
      query = query.lt('created_at', end.toISOString())
    }

    const { data, error, count } = await query

    if (error) throw error

    return {
      success: true,
      logs: data as (ActivityLog & { profile: { full_name: string, username: string } })[],
      total: count || 0,
      page,
      limit
    }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal mengambil log aktivitas')
    return { success: false, message: errorInfo.message, logs: [], total: 0, page: 1, limit: 50 }
  }
}

/**
 * Get distinct actions and entity types for filters
 */
export async function getLogMetadata() {
  try {
    const supabase = await createClient()
    
    // Direct query to activity_logs to get distinct values (limit for performance)
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('action, entity_type')
      .limit(2000)
       
    const uniqueActions = Array.from(new Set(logs?.map(l => l.action) || [])).sort()
    const uniqueEntities = Array.from(new Set(logs?.map(l => l.entity_type) || [])).filter(Boolean).sort()
       
    return { 
      actions: uniqueActions, 
      entityTypes: uniqueEntities 
    }
  } catch (error) {
    return { actions: [], entityTypes: [] }
  }
}

/**
 * Get activity summary for each user in the last 30 days
 */
export interface GetUserActivitySummaryParams {
  daerahId?: string
  desaId?: string
  kelompokId?: string
}

export async function getUserActivitySummary(params?: GetUserActivitySummaryParams) {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Unauthorized')

    const filter = getDataFilter(profile)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // last_active_at dibaca dari kolom profiles (di-update via DB trigger tiap
    // INSERT activity_logs) — tidak terbatas window 30 hari, akurat untuk user
    // yang jarang login/tidak pernah logout (sm-lurv).
    let profileQuery = supabase
      .from('profiles')
      .select('id, full_name, username, role, last_active_at')
      .neq('role', 'superadmin')

    // UI filter (params) override role-based filter jika lebih spesifik
    const daerahId = params?.daerahId ?? filter?.daerah_id
    const desaId = params?.desaId ?? filter?.desa_id
    const kelompokId = params?.kelompokId ?? filter?.kelompok_id

    if (kelompokId) profileQuery = profileQuery.eq('kelompok_id', kelompokId)
    else if (desaId) profileQuery = profileQuery.eq('desa_id', desaId)
    else if (daerahId) profileQuery = profileQuery.eq('daerah_id', daerahId)

    const { data: profiles, error: profileError } = await profileQuery
    if (profileError) throw profileError

    const profileIds = (profiles ?? []).map((p) => p.id)

    // Fetch hanya action + user_id 30 hari untuk hitung total_actions_30d.
    // .in() chunked 100 IDs — PostgREST URL overflow >100 UUIDs (sm-hsp7).
    const CHUNK = 100
    const actionCountByUser = new Map<string, number>()
    for (let i = 0; i < profileIds.length; i += CHUNK) {
      const chunk = profileIds.slice(i, i + CHUNK)
      const { data, error } = await supabase
        .from('activity_logs')
        .select('user_id, action')
        .in('user_id', chunk)
        .gte('created_at', thirtyDaysAgoISO)
        .neq('action', 'open_page')
      if (error) throw error
      if (data) {
        for (const log of data) {
          actionCountByUser.set(log.user_id, (actionCountByUser.get(log.user_id) ?? 0) + 1)
        }
      }
    }

    const summaries = (profiles ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      role: p.role,
      last_active: (p as any).last_active_at ?? null,
      total_actions_30d: actionCountByUser.get(p.id) ?? 0,
    }))

    return { success: true, data: summaries }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat ringkasan aktivitas per user')
    return { success: false, message: errorInfo.message, data: [] }
  }
}
