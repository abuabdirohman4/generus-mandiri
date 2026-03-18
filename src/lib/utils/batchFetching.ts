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

    // Split into chunks of 10 to stay safely under Supabase's 1000-row response limit.
    // With ~20 students per meeting, 10 meetings = ~200 rows per chunk (well under 1000).
    // Previously used 100 which could produce ~2000 rows/chunk → silently truncated at 1000.
    const chunkSize = 10
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
