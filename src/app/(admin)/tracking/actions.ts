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
export async function getUserActivitySummary() {
  try {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()
    if (!profile) throw new Error('Unauthorized')

    const filter = getDataFilter(profile)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    // Ambil semua profiles dalam scope
    let profileQuery = supabase
      .from('profiles')
      .select('id, full_name, username, role')
      .neq('role', 'superadmin')

    if (filter?.daerah_id) profileQuery = profileQuery.eq('daerah_id', filter.daerah_id)
    if (filter?.desa_id) profileQuery = profileQuery.eq('desa_id', filter.desa_id)
    if (filter?.kelompok_id) profileQuery = profileQuery.eq('kelompok_id', filter.kelompok_id)

    const { data: profiles, error: profileError } = await profileQuery
    if (profileError) throw profileError

    const profileIds = (profiles ?? []).map((p) => p.id)

    // sm-hsp7: single batched query for all users in scope instead of N+1 (was
    // one 500-row query per profile — up to ~126 queries / 63k rows per page
    // load). Fetch only the last 30 days directly in the query (was fetching
    // 500 rows per user unfiltered, then filtering by date in JS).
    //
    // .in('user_id', profileIds) is chunked at 100 IDs: PostgREST encodes .in()
    // into the URL, and >100 UUIDs overflow the URL length limit → data returns
    // null with NO error (see memory: postgrest-in-url-overflow). profileIds can
    // reach ~126 for superadmin and grows with the org, so chunking is required.
    const CHUNK = 100
    const recentLogs: { user_id: string; created_at: string; action: string }[] = []
    for (let i = 0; i < profileIds.length; i += CHUNK) {
      const chunk = profileIds.slice(i, i + CHUNK)
      const { data, error } = await supabase
        .from('activity_logs')
        .select('user_id, created_at, action')
        .in('user_id', chunk)
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false })
      if (error) throw error
      if (data) recentLogs.push(...data)
    }

    const logsByUser = new Map<string, { created_at: string; action: string }[]>()
    for (const log of recentLogs) {
      const list = logsByUser.get(log.user_id) ?? []
      list.push(log)
      logsByUser.set(log.user_id, list)
    }

    const summaries = (profiles ?? []).map((p) => {
      const userLogs = logsByUser.get(p.id) ?? []
      const recentActions = userLogs.filter((l) => l.action !== 'open_page')

      return {
        id: p.id,
        full_name: p.full_name,
        username: p.username,
        role: p.role,
        last_active: userLogs[0]?.created_at ?? null,
        total_actions_30d: recentActions.length,
      }
    })

    return { success: true, data: summaries }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat ringkasan aktivitas per user')
    return { success: false, message: errorInfo.message, data: [] }
  }
}
