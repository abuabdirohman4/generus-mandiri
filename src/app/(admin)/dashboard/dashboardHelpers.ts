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
    gender?: string;
    day?: string;
    week?: string | string[];
    month?: string
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

// Helper to normalize IDs (handle arrays and comma-separated strings)
function normalizeIds(ids: string | string[] | undefined): string[] {
    if (!ids) return [];
    const idArray = Array.isArray(ids) ? ids : [ids];
    return idArray.flatMap(id => id.split(',')).filter(Boolean);
}

// Helper to convert string[] to uuid[] param for RPC (pass as plain array)
function toUuidArray(ids: string[] | undefined): string[] | null {
    if (!ids || ids.length === 0) return null;
    return ids;
}

/**
 * Get valid class IDs via RPC function (all joins done in-DB, no large arrays over HTTP)
 * @deprecated internal — use buildFilterConditions instead
 */
async function getValidClassIds(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_valid_class_ids', {
        p_class_ids:       toUuidArray(normalizeIds(uiFilters?.classId)),
        p_kelompok_ids:    toUuidArray(normalizeIds(uiFilters?.kelompokId)),
        p_desa_ids:        toUuidArray(normalizeIds(uiFilters?.desaId)),
        p_daerah_ids:      toUuidArray(normalizeIds(uiFilters?.daerahId)),
        p_rls_kelompok_id: rlsFilter?.kelompok_id ?? null,
        p_rls_desa_id:     rlsFilter?.desa_id ?? null,
        p_rls_daerah_id:   rlsFilter?.daerah_id ?? null,
    });

    if (error) {
        console.error('[getValidClassIds] RPC error:', error);
        throw error;
    }

    return (data as string[]) || [];
}

/**
 * Get valid student IDs via RPC function (all joins done in-DB, no large arrays over HTTP)
 * @deprecated internal — use buildFilterConditions instead
 */
async function getValidStudentIds(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<string[]> {
    const { data, error } = await supabase.rpc('get_valid_student_ids', {
        p_class_ids:       toUuidArray(normalizeIds(uiFilters?.classId)),
        p_kelompok_ids:    toUuidArray(normalizeIds(uiFilters?.kelompokId)),
        p_desa_ids:        toUuidArray(normalizeIds(uiFilters?.desaId)),
        p_daerah_ids:      toUuidArray(normalizeIds(uiFilters?.daerahId)),
        p_gender:          uiFilters?.gender ?? null,
        p_rls_kelompok_id: rlsFilter?.kelompok_id ?? null,
        p_rls_desa_id:     rlsFilter?.desa_id ?? null,
        p_rls_daerah_id:   rlsFilter?.daerah_id ?? null,
    });

    if (error) {
        console.error('[getValidStudentIds] RPC error:', error);
        throw error;
    }

    return (data as string[]) || [];
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
        uiFilters?.gender ||
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
    // Single-call fetch: all data in this app fits within one page (max 915 students, 648 classes).
    // The previous while-loop re-used the same query object across iterations, causing Supabase
    // to accumulate duplicate .range() calls → PostgREST 400 Bad Request on 2nd iteration.
    const { data, error } = await query.range(0, batchSize - 1);

    if (error) throw error;

    return (data as T[]) || [];
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
