/**
 * Generic batch fetcher for any table using .in() on 'id'.
 * PostgREST encodes .in() as a query string — large arrays exceed URL limits.
 * Splits into chunks of 100 and fetches in parallel.
 */
export async function fetchInBatches(
    supabaseClient: any,
    table: string,
    ids: string[],
    selectQuery: string,
    chunkSize = 100,
    column = 'id'
): Promise<{ data: any[] | null; error: any }> {
    if (!ids || ids.length === 0) {
        return { data: [], error: null }
    }

    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += chunkSize) {
        chunks.push(ids.slice(i, i + chunkSize))
    }

    try {
        const results = await Promise.all(
            chunks.map(chunk =>
                supabaseClient
                    .from(table)
                    .select(selectQuery)
                    .in(column, chunk)
            )
        )

        const allData: any[] = []
        for (const result of results) {
            if (result.error) {
                return { data: null, error: result.error }
            }
            if (result.data) {
                allData.push(...result.data)
            }
        }

        return { data: allData, error: null }
    } catch (error: any) {
        return { data: null, error: error }
    }
}

/**
 * Fetch students in batches to avoid URL length limits with large ID arrays.
 * PostgREST encodes .in() as a query string — 773 UUIDs (~28KB) exceeds the limit.
 */
export async function fetchStudentsInBatches(
    supabaseClient: any,
    studentIds: string[],
    selectQuery: string
): Promise<{ data: any[] | null; error: any }> {
    if (!studentIds || studentIds.length === 0) {
        return { data: [], error: null }
    }

    const chunkSize = 100
    const chunks: string[][] = []
    for (let i = 0; i < studentIds.length; i += chunkSize) {
        chunks.push(studentIds.slice(i, i + chunkSize))
    }

    try {
        const results = await Promise.all(
            chunks.map(chunk =>
                supabaseClient
                    .from('students')
                    .select(selectQuery)
                    .in('id', chunk)
            )
        )

        const allData: any[] = []
        for (const result of results) {
            if (result.error) {
                return { data: null, error: result.error }
            }
            if (result.data) {
                allData.push(...result.data)
            }
        }

        return { data: allData, error: null }
    } catch (error: any) {
        return { data: null, error: error }
    }
}

/**
 * Fetch attendance logs in batches to avoid database query limits
 * 
 * Supabase/PostgREST has default row limits and URL length constraints.
 * This function splits meeting IDs into chunks and fetches them in parallel
 * to ensure all attendance data is retrieved regardless of dataset size.
 * 
 * @param supabaseClient - Supabase client instance (regular or admin)
 * @param meetingIds - Array of meeting IDs to fetch attendance for
 * @returns Combined attendance data from all batches
 */
export async function fetchAttendanceLogsInBatches(
    supabaseClient: any,
    meetingIds: string[]
): Promise<{ data: any[] | null; error: any }> {
    if (!meetingIds || meetingIds.length === 0) {
        return { data: [], error: null }
    }

    // Split into chunks of 3 to stay safely under Supabase's 1000-row response limit.
    // Real-world meetings can have 175+ students: 3 × 175 = ~525 rows/chunk (safe).
    // Previously 10 meetings × 175 students = ~1750 rows/chunk → silently truncated at 1000
    // causing some meetings to show 0 attendance stats in card view.
    const chunkSize = 3
    const chunks: string[][] = []
    for (let i = 0; i < meetingIds.length; i += chunkSize) {
        chunks.push(meetingIds.slice(i, i + chunkSize))
    }

    try {
        // Fetch all chunks in parallel for better performance
        const results = await Promise.all(
            chunks.map(chunk =>
                supabaseClient
                    .from('attendance_logs')
                    .select('meeting_id, student_id, status')
                    .in('meeting_id', chunk)
            )
        )

        // Combine results from all chunks
        const allData: any[] = []
        for (const result of results) {
            if (result.error) {
                console.error('Error fetching batch:', result.error)
                return { data: null, error: result.error }
            }
            if (result.data) {
                allData.push(...result.data)
            }
        }

        return { data: allData, error: null }
    } catch (error: any) {
        console.error('Error in batch fetch:', error)
        return { data: null, error: error }
    }
}

/**
 * Batch by one column while keeping extra filters applied per chunk.
 * Use when a query filters by TWO .in() columns simultaneously (compound filter).
 * Chunks `chunkIds` (e.g. student_id ~773 UUIDs) into `chunkSize`, applies
 * `applyExtraFilter` (e.g. .in('material_item_id', ids)) on each chunk in parallel.
 * PostgREST encodes .in() as query string — large arrays exceed URL/header limits.
 */
export async function fetchInBatchesWithFilter(
    supabaseClient: any,
    table: string,
    chunkColumn: string,
    chunkIds: string[],
    selectQuery: string,
    applyExtraFilter: (q: any) => any = (q) => q,
    chunkSize = 100,
): Promise<{ data: any[] | null; error: any }> {
    if (!chunkIds || chunkIds.length === 0) return { data: [], error: null }
    const chunks: string[][] = []
    for (let i = 0; i < chunkIds.length; i += chunkSize) {
        chunks.push(chunkIds.slice(i, i + chunkSize))
    }
    try {
        const results = await Promise.all(
            chunks.map(chunk =>
                applyExtraFilter(
                    supabaseClient.from(table).select(selectQuery).in(chunkColumn, chunk)
                )
            )
        )
        const allData: any[] = []
        for (const r of results) {
            if (r.error) return { data: null, error: r.error }
            if (r.data) allData.push(...r.data)
        }
        return { data: allData, error: null }
    } catch (error: any) {
        return { data: null, error }
    }
}
