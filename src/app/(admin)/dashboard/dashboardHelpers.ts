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

/**
 * Get valid class IDs based on hierarchical filters
 * Uses intersection logic: results must match ALL active filters
 */
export async function getValidClassIds(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<string[]> {
    let validIds: Set<string> | null = null;

    const intersect = (newIds: string[]) => {
        if (validIds === null) {
            validIds = new Set(newIds);
        } else {
            // Filter validIds to keep only those present in newIds
            const newIdSet = new Set(newIds);
            validIds = new Set([...validIds].filter(id => newIdSet.has(id)));
        }
    };

    // Apply organizational filters hierarchically (most specific wins)
    // Hierarchy: Class > Kelompok > Desa > Daerah
    // Skip less specific filters if more specific one is active

    // 1. Class Filter (most specific)
    if (uiFilters?.classId && uiFilters.classId.length > 0) {
        intersect(normalizeIds(uiFilters.classId));
    }
    // 2. Kelompok Filter (skip desa/daerah if active)
    else if (uiFilters?.kelompokId && uiFilters.kelompokId.length > 0) {
        const kelompokIds = Array.isArray(uiFilters.kelompokId) ? uiFilters.kelompokId : [uiFilters.kelompokId];
        const { data } = await supabase
            .from('classes')
            .select('id')
            .in('kelompok_id', kelompokIds);
        intersect(data?.map(c => c.id) || []);
    }
    // 3. Desa Filter (only if no kelompok filter)
    else if (uiFilters?.desaId && uiFilters.desaId.length > 0) {
        const desaIds = Array.isArray(uiFilters.desaId) ? uiFilters.desaId : [uiFilters.desaId];

        // CRITICAL FIX: Use chunked queries for both desa → kelompok and kelompok → classes
        // Two-query pattern with chunking to avoid URL length limit
        const allKelompok: any[] = [];

        // Step 1: Chunk desa IDs (10 per chunk for kelompok query)
        const DESA_CHUNK_SIZE = 10;
        for (let i = 0; i < desaIds.length; i += DESA_CHUNK_SIZE) {
            const chunk = desaIds.slice(i, i + DESA_CHUNK_SIZE);

            const { data: kelompokData, error: kelompokError } = await supabase
                .from('kelompok')
                .select('id')
                .in('desa_id', chunk);

            if (kelompokError) {
                console.error('[getValidClassIds] Kelompok query error:', kelompokError);
            }

            if (kelompokData) {
                allKelompok.push(...kelompokData);
            }
        }

        if (allKelompok.length > 0) {
            const kelompokIds = allKelompok.map(k => k.id);

            // Step 2: Chunk kelompok IDs for class query (50 per chunk)
            const allClasses: any[] = [];
            const KELOMPOK_CHUNK_SIZE = 50;

            for (let i = 0; i < kelompokIds.length; i += KELOMPOK_CHUNK_SIZE) {
                const chunk = kelompokIds.slice(i, i + KELOMPOK_CHUNK_SIZE);

                const { data: classData, error: classError } = await supabase
                    .from('classes')
                    .select('id')
                    .in('kelompok_id', chunk);

                if (classError) {
                    console.error('[getValidClassIds] Classes query error:', classError);
                }

                if (classData) {
                    allClasses.push(...classData);
                }
            }

            intersect(allClasses.map(c => c.id));
        } else {
            // No kelompok found for selected desa
            console.log('[getValidClassIds] No kelompok found, returning empty');
            intersect([]);
        }
    }
    // 4. Daerah Filter (only if no desa filter)
    else if (uiFilters?.daerahId && uiFilters.daerahId.length > 0) {
        const daerahIds = Array.isArray(uiFilters.daerahId) ? uiFilters.daerahId : [uiFilters.daerahId];

        // Two-query pattern: PostgREST nested filter can fail silently
        // Step 1: Get desa IDs for selected daerah
        const { data: desaData } = await supabase
            .from('desa')
            .select('id')
            .in('daerah_id', daerahIds);

        if (desaData && desaData.length > 0) {
            const desaIds = desaData.map(d => d.id);

            // Step 2: Get kelompok IDs for those desa
            const { data: kelompokData } = await supabase
                .from('kelompok')
                .select('id')
                .in('desa_id', desaIds);

            if (kelompokData && kelompokData.length > 0) {
                const kelompokIds = kelompokData.map(k => k.id);

                // Step 3: Get classes for those kelompok
                const { data } = await supabase
                    .from('classes')
                    .select('id')
                    .in('kelompok_id', kelompokIds);

                intersect(data?.map(c => c.id) || []);
            } else {
                intersect([]);
            }
        } else {
            intersect([]);
        }
    }

    // 5. RLS Filters (Apply as intersection)
    if (rlsFilter?.kelompok_id) {
        const { data } = await supabase
            .from('classes')
            .select('id')
            .eq('kelompok_id', rlsFilter.kelompok_id);
        intersect(data?.map(c => c.id) || []);
    }

    if (rlsFilter?.desa_id) {
        // Two-query pattern for RLS desa filter
        const { data: kelompokData } = await supabase
            .from('kelompok')
            .select('id')
            .eq('desa_id', rlsFilter.desa_id);

        if (kelompokData && kelompokData.length > 0) {
            const kelompokIds = kelompokData.map(k => k.id);
            const { data } = await supabase
                .from('classes')
                .select('id')
                .in('kelompok_id', kelompokIds);
            intersect(data?.map(c => c.id) || []);
        } else {
            intersect([]);
        }
    }

    if (rlsFilter?.daerah_id) {
        // Two-query pattern for RLS daerah filter
        const { data: desaData } = await supabase
            .from('desa')
            .select('id')
            .eq('daerah_id', rlsFilter.daerah_id);

        if (desaData && desaData.length > 0) {
            const desaIds = desaData.map(d => d.id);
            const { data: kelompokData } = await supabase
                .from('kelompok')
                .select('id')
                .in('desa_id', desaIds);

            if (kelompokData && kelompokData.length > 0) {
                const kelompokIds = kelompokData.map(k => k.id);
                const { data } = await supabase
                    .from('classes')
                    .select('id')
                    .in('kelompok_id', kelompokIds);
                intersect(data?.map(c => c.id) || []);
            } else {
                intersect([]);
            }
        } else {
            intersect([]);
        }
    }

    // If validIds is null, it means no filters were applied that affect class selection
    // In this context, it implies "all classes" (or empty if we strictly require filters)
    // However, buildFilterConditions checks hasFilters. If hasFilters is true, 
    // at least one filter should have populated validIds.
    // If validIds is still null here, it might mean only student filters were active?
    // But getValidClassIds is called when hasFilters is true.
    // We'll return [] if null to be safe, but usually it should be populated if relevant filters exist.
    // Actually, if only student filters are active, class IDs might not be restricted?
    // But buildFilterConditions calls both.

    return validIds ? Array.from(validIds) : [];
}

/**
 * Get valid student IDs based on hierarchical filters
 * Uses intersection logic: results must match ALL active filters
 */
export async function getValidStudentIds(
    supabase: SupabaseClient,
    uiFilters?: DashboardFilters,
    rlsFilter?: RLSFilter | null
): Promise<string[]> {
    let validIds: Set<string> | null = null;

    const intersect = (newIds: string[]) => {
        if (validIds === null) {
            validIds = new Set(newIds);
        } else {
            const newIdSet = new Set(newIds);
            validIds = new Set([...validIds].filter(id => newIdSet.has(id)));
        }
    };

    // Apply organizational filters hierarchically (most specific wins)
    // Hierarchy: Class > Kelompok > Desa > Daerah
    // Skip less specific filters if more specific one is active

    // 1. Class Filter (most specific - via student_classes junction)
    if (uiFilters?.classId && uiFilters.classId.length > 0) {
        const classIds = normalizeIds(uiFilters.classId);
        const { data } = await supabase
            .from('student_classes')
            .select('student_id')
            .in('class_id', classIds);
        intersect(data?.map(sc => sc.student_id) || []);
    }
    // 2. Kelompok Filter (skip desa/daerah if active)
    else if (uiFilters?.kelompokId && uiFilters.kelompokId.length > 0) {
        const kelompokIds = Array.isArray(uiFilters.kelompokId) ? uiFilters.kelompokId : [uiFilters.kelompokId];
        const { data } = await supabase
            .from('students')
            .select('id')
            .in('kelompok_id', kelompokIds);
        intersect(data?.map(s => s.id) || []);
    }
    // 3. Desa Filter (only if no kelompok filter)
    else if (uiFilters?.desaId && uiFilters.desaId.length > 0) {
        const desaIds = Array.isArray(uiFilters.desaId) ? uiFilters.desaId : [uiFilters.desaId];

        // CRITICAL FIX: Use chunked queries to avoid HTTP URL length limit (~8000 chars)
        // When filtering by many desa (5+), the .in() query URL can exceed server limits
        // Chunk size = 50 UUIDs (~1800 chars) to stay well under limit
        const allStudents: any[] = [];
        const CHUNK_SIZE = 50; // Conservative limit for UUID arrays in URL

        for (let i = 0; i < desaIds.length; i += CHUNK_SIZE) {
            const chunk = desaIds.slice(i, i + CHUNK_SIZE);

            const { data: studentData, error: studentError } = await supabase
                .from('students')
                .select('id')
                .in('desa_id', chunk);

            if (studentError) {
                console.error('[getValidStudentIds] Chunked query error:', studentError);
                throw studentError;
            }

            if (studentData && studentData.length > 0) {
                allStudents.push(...studentData);
            }
        }

        intersect(allStudents.map(s => s.id));
    }
    // 4. Daerah Filter (only if no desa filter)
    else if (uiFilters?.daerahId && uiFilters.daerahId.length > 0) {
        const daerahIds = Array.isArray(uiFilters.daerahId) ? uiFilters.daerahId : [uiFilters.daerahId];
        const { data } = await supabase
            .from('students')
            .select('id')
            .in('daerah_id', daerahIds);
        intersect(data?.map(s => s.id) || []);
    }

    // 5. Gender Filter (applied independently)
    if (uiFilters?.gender) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('gender', uiFilters.gender);
        intersect(data?.map(s => s.id) || []);
    }

    // 6. RLS Filters
    if (rlsFilter?.kelompok_id) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('kelompok_id', rlsFilter.kelompok_id);
        intersect(data?.map(s => s.id) || []);
    }

    if (rlsFilter?.desa_id) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('desa_id', rlsFilter.desa_id);
        intersect(data?.map(s => s.id) || []);
    }

    if (rlsFilter?.daerah_id) {
        const { data } = await supabase
            .from('students')
            .select('id')
            .eq('daerah_id', rlsFilter.daerah_id);
        intersect(data?.map(s => s.id) || []);
    }

    return validIds ? Array.from(validIds) : [];
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
