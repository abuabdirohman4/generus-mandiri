import { createClient } from '@/lib/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Dashboard Helper Functions
 * Centralized filter building and query optimization utilities
 */

// ============================================================================
// TYPES
// ============================================================================

export interface DashboardFilters {
    daerahId?: string | string[];
    desaId?: string | string[];
    kelompokId?: string | string[];
    classId?: string | string[];
}

export interface RLSFilter {
    daerah_id?: string | null;
    desa_id?: string | null;
    kelompok_id?: string | null;
}

interface FilterConditions {
    classIds: string[];
    studentIds: string[];
    hasFilters: boolean;
}

// ============================================================================
// FILTER BUILDING FUNCTIONS
// ============================================================================

/**
 * Get valid class IDs based on hierarchical filters
 * Prioritizes UI filters over RLS filters
 */
export async function getValidClassIds(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<string[]> {
    // Direct class filter - highest priority
    if (uiFilters?.classId && uiFilters.classId.length > 0) {
        const classIds = Array.isArray(uiFilters.classId) ? uiFilters.classId : [uiFilters.classId];
        return classIds;
    }

    // Kelompok filter
    if (uiFilters?.kelompokId && uiFilters.kelompokId.length > 0) {
        const kelompokIds = Array.isArray(uiFilters.kelompokId) ? uiFilters.kelompokId : [uiFilters.kelompokId];
        const { data } = await supabase
            .from('classes')
            .select('id')
            .in('kelompok_id', kelompokIds);
        return data?.map(c => c.id) || [];
    }

    // Desa filter
    if (uiFilters?.desaId && uiFilters.desaId.length > 0) {
        const desaIds = Array.isArray(uiFilters.desaId) ? uiFilters.desaId : [uiFilters.desaId];
        const { data: kelompokIds } = await supabase
            .from('kelompok')
            .select('id')
            .in('desa_id', desaIds);

        const kelompokIdList = kelompokIds?.map(k => k.id) || [];
        if (kelompokIdList.length === 0) return [];

        const { data } = await supabase
            .from('classes')
            .select('id')
            .in('kelompok_id', kelompokIdList);
        return data?.map(c => c.id) || [];
    }

    // Daerah filter
    if (uiFilters?.daerahId && uiFilters.daerahId.length > 0) {
        const daerahIds = Array.isArray(uiFilters.daerahId) ? uiFilters.daerahId : [uiFilters.daerahId];
        const { data: desaIds } = await supabase
            .from('desa')
            .select('id')
            .in('daerah_id', daerahIds);

        const desaIdList = desaIds?.map(d => d.id) || [];
        if (desaIdList.length === 0) return [];

        const { data: kelompokIds } = await supabase
            .from('kelompok')
            .select('id')
            .in('desa_id', desaIdList);

        const kelompokIdList = kelompokIds?.map(k => k.id) || [];
        if (kelompokIdList.length === 0) return [];

        const { data } = await supabase
            .from('classes')
            .select('id')
            .in('kelompok_id', kelompokIdList);
        return data?.map(c => c.id) || [];
    }

    // Fall back to RLS filters
    if (rlsFilter?.kelompok_id) {
        const { data } = await supabase
            .from('classes')
            .select('id')
            .eq('kelompok_id', rlsFilter.kelompok_id);
        return data?.map(c => c.id) || [];
    }

    if (rlsFilter?.desa_id) {
        const { data: kelompokIds } = await supabase
            .from('kelompok')
            .select('id')
            .eq('desa_id', rlsFilter.desa_id);

        const kelompokIdList = kelompokIds?.map(k => k.id) || [];
        if (kelompokIdList.length === 0) return [];

        const { data } = await supabase
            .from('classes')
            .select('id')
            .in('kelompok_id', kelompokIdList);
        return data?.map(c => c.id) || [];
    }

    if (rlsFilter?.daerah_id) {
        const { data: desaIds } = await supabase
            .from('desa')
            .select('id')
            .eq('daerah_id', rlsFilter.daerah_id);

        const desaIdList = desaIds?.map(d => d.id) || [];
        if (desaIdList.length === 0) return [];

        const { data: kelompokIds } = await supabase
            .from('kelompok')
            .select('id')
            .in('desa_id', desaIdList);

        const kelompokIdList = kelompokIds?.map(k => k.id) || [];
        if (kelompokIdList.length === 0) return [];

        const { data } = await supabase
            .from('classes')
            .select('id')
            .in('kelompok_id', kelompokIdList);
        return data?.map(c => c.id) || [];
    }

    // No filters - return empty array to indicate "fetch all"
    return [];
}

/**
 * Get valid student IDs based on hierarchical filters
 * Prioritizes UI filters over RLS filters
 */
export async function getValidStudentIds(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<string[]> {
    // Class filter - need to get students from student_classes
    if (uiFilters?.classId && uiFilters.classId.length > 0) {
        const classIds = Array.isArray(uiFilters.classId) ? uiFilters.classId : [uiFilters.classId];
        const { data } = await supabase
            .from('student_classes')
            .select('student_id')
            .in('class_id', classIds);
        return data?.map(sc => sc.student_id) || [];
    }

    // Kelompok filter
    if (uiFilters?.kelompokId && uiFilters.kelompokId.length > 0) {
        const kelompokIds = Array.isArray(uiFilters.kelompokId) ? uiFilters.kelompokId : [uiFilters.kelompokId];
        const { data } = await supabase
            .from('students')
            .select('id')
            .in('kelompok_id', kelompokIds);
        return data?.map(s => s.id) || [];
    }

    // Desa filter
    if (uiFilters?.desaId && uiFilters.desaId.length > 0) {
        const desaIds = Array.isArray(uiFilters.desaId) ? uiFilters.desaId : [uiFilters.desaId];
        const { data } = await supabase
            .from('students')
            .select('id')
            .in('desa_id', desaIds);
        return data?.map(s => s.id) || [];
    }

    // Daerah filter
    if (uiFilters?.daerahId && uiFilters.daerahId.length > 0) {
        const daerahIds = Array.isArray(uiFilters.daerahId) ? uiFilters.daerahId : [uiFilters.daerahId];
        const { data } = await supabase
            .from('students')
            .select('id')
            .in('daerah_id', daerahIds);
        return data?.map(s => s.id) || [];
    }

    // Fall back to RLS filters
    if (rlsFilter?.kelompok_id) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('kelompok_id', rlsFilter.kelompok_id);
        return data?.map(s => s.id) || [];
    }

    if (rlsFilter?.desa_id) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('desa_id', rlsFilter.desa_id);
        return data?.map(s => s.id) || [];
    }

    if (rlsFilter?.daerah_id) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('daerah_id', rlsFilter.daerah_id);
        return data?.map(s => s.id) || [];
    }

    // No filters - return empty array to indicate "fetch all"
    return [];
}

/**
 * Build filter conditions for queries
 * Returns class IDs, student IDs, and whether filters are active
 */
export async function buildFilterConditions(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<FilterConditions> {
    const hasFilters = !!(
        uiFilters?.classId ||
        uiFilters?.kelompokId ||
        uiFilters?.desaId ||
        uiFilters?.daerahId ||
        rlsFilter?.kelompok_id ||
        rlsFilter?.desa_id ||
        rlsFilter?.daerah_id
    );

    if (!hasFilters) {
        return { classIds: [], studentIds: [], hasFilters: false };
    }

    const [classIds, studentIds] = await Promise.all([
        getValidClassIds(supabase, uiFilters, rlsFilter),
        getValidStudentIds(supabase, uiFilters, rlsFilter)
    ]);

    return { classIds, studentIds, hasFilters: true };
}

// ============================================================================
// BATCH FETCHING UTILITIES
// ============================================================================

/**
 * Fetch data in batches to avoid Supabase 1000 row limit
 * Uses pagination to fetch all records
 */
export async function fetchAllRecords<T>(
    query: any,
    batchSize: number = 1000
): Promise<T[]> {
    const allRecords: T[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const { data, error } = await query
            .range(offset, offset + batchSize - 1);

        if (error) throw error;

        if (data && data.length > 0) {
            allRecords.push(...data);
            offset += batchSize;
            hasMore = data.length === batchSize;
        } else {
            hasMore = false;
        }
    }

    return allRecords;
}

/**
 * Fetch records in batches for large ID arrays
 * Splits ID array into chunks to avoid query size limits
 */
export async function fetchByIds<T>(
    supabase: SupabaseClient,
    tableName: string,
    columnName: string,
    ids: string[],
    selectFields: string = '*',
    chunkSize: number = 1000
): Promise<T[]> {
    if (ids.length === 0) return [];

    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize));
    }

    const results = await Promise.all(
        chunks.map(async (chunk) => {
            const { data } = await supabase
                .from(tableName)
                .select(selectFields)
                .in(columnName, chunk);
            return data || [];
        })
    );

    return results.flat() as T[];
}
