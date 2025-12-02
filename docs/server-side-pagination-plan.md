# Server-Side Pagination + Hybrid Batching - Implementation Plan

**Status**: 📋 PLANNED (Not Yet Implemented)
**Priority**: HIGH (for long-term scalability)
**Estimated Effort**: 3-4 hours
**Created**: 2025-12-02

---

## Executive Summary

This document outlines the plan to refactor the attendance page (`/absensi`) from **client-side pagination** (fetch all meetings) to **server-side pagination** (fetch per page) with **hybrid batching** for large meetings.

### Why This Is Needed

**Current Problems**:
1. ❌ **Slow initial load** as meetings grow (currently ~500ms for 100 meetings, will be 3s+ for 500)
2. ❌ **Memory inefficient** (loads ALL meetings into browser, even if user only views page 1)
3. ❌ **Cannot handle large meetings** (>800 students per meeting will hit Supabase 1000 record limit)
4. ❌ **Not scalable** for multi-year data accumulation

**Future Requirements**:
- Pengajian Desa/Daerah meetings with **1,000-2,000 students**
- Meeting history growing to **500-1,000+ meetings** over time
- Need to maintain **<200ms initial load** regardless of data size

---

## Architecture Overview

### Current Architecture (Client-Side Pagination)

```
┌─────────────┐
│   Browser   │
│             │
│  Page Load  │──────┐
└─────────────┘      │
                     │ Fetch ALL meetings (limit 1000)
                     ▼
              ┌──────────────┐
              │   Server     │
              │              │
              │ getMeetings  │
              │ WithStats()  │
              └──────────────┘
                     │
                     │ Fetch all attendance for all meetings
                     ▼
              ┌──────────────┐
              │   Database   │
              │              │
              │ attendance_  │
              │   logs       │
              └──────────────┘
                     │
                     │ Return 100 meetings with stats
                     ▼
              ┌──────────────┐
              │  SWR Cache   │
              │              │
              │ Cache ALL    │
              │  meetings    │
              └──────────────┘
                     │
                     │ Client slices for pagination
                     ▼
              ┌──────────────┐
              │  Display     │
              │  Page 1      │
              │  (10 items)  │
              └──────────────┘

User clicks Page 2 → Instant (use cached data)
```

**Performance**:
- Initial load: ~500ms for 100 meetings
- Page navigation: 0ms (instant)
- Total time to view 5 pages: **500ms**

**Problems**:
- Fetches 90 unused meetings if user only views page 1
- Gets slower as meeting count grows

### Proposed Architecture (Server-Side Pagination)

```
┌─────────────┐
│   Browser   │
│             │
│  Page Load  │──────┐
└─────────────┘      │
                     │ Fetch page 1 ONLY (offset 0, limit 10)
                     ▼
              ┌──────────────┐
              │   Server     │
              │              │
              │ getMeetings  │
              │ WithStats()  │
              │ (page=1)     │
              └──────────────┘
                     │
                     │ Fetch attendance for 10 meetings only
                     ▼
              ┌──────────────┐
              │   Database   │
              │              │
              │ attendance_  │
              │   logs       │
              │ (10 meetings)│
              └──────────────┘
                     │
                     │ Return 10 meetings with stats + total count
                     ▼
              ┌──────────────┐
              │  SWR Cache   │
              │              │
              │ Cache page 1 │
              └──────────────┘
                     │
                     │ Display immediately
                     ▼
              ┌──────────────┐
              │  Display     │
              │  Page 1      │
              │  (10 items)  │
              └──────────────┘

User clicks Page 2 → Fetch page 2 (~150ms) → Cache → Display
```

**Performance**:
- Initial load: ~150ms (regardless of total meetings)
- Page navigation: ~150ms (network request)
- Total time to view 5 pages: **~750ms** (slower than current for multi-page browsing)

**Benefits**:
- ✅ Constant fast initial load
- ✅ Scales to 10,000+ meetings
- ✅ Lower memory usage
- ✅ Can handle large individual meetings

---

## Hybrid Batching Strategy

### Problem: Large Meetings Exceed 1000 Record Limit

**Scenario**:
```
Meeting: Pengajian Daerah
Students: 2,000 siswa
Attendance records: 2,000 records

Current batch fetching:
- Fetch meetings 1-10 → attendance logs for these 10 meetings
- If 1 meeting has 2,000 students → EXCEEDS 1000 LIMIT
- Result: Incomplete data (only 1,000 of 2,000 records)
```

### Solution: Detect and Handle Large Meetings Separately

```typescript
// In getMeetingsWithStats()

// Step 1: Fetch meeting metadata first (without attendance)
const meetings = await supabase
  .from('meetings')
  .select('*, student_snapshot')
  .range(offset, offset + limit - 1)

// Step 2: Classify meetings by size
const normalMeetings = []
const largeMeetings = []

meetings.forEach(meeting => {
  const studentCount = meeting.student_snapshot?.length || 0

  if (studentCount > 800) {
    largeMeetings.push(meeting)
  } else {
    normalMeetings.push(meeting)
  }
})

// Step 3: Fetch attendance with different strategies

// For normal meetings: Batch fetch (existing function)
const normalAttendance = await fetchAttendanceLogsInBatches(
  supabase,
  normalMeetings.map(m => m.id)
)

// For large meetings: Individual fetch with pagination
const largeAttendance = []
for (const meeting of largeMeetings) {
  const attendance = await fetchLargeMeetingAttendance(
    supabase,
    meeting.id,
    meeting.student_snapshot.length
  )
  largeAttendance.push(...attendance)
}

// Step 4: Combine and calculate stats
const allAttendance = [...normalAttendance, ...largeAttendance]
```

### New Function: fetchLargeMeetingAttendance

```typescript
/**
 * Fetch attendance for a single large meeting (>800 students)
 * Uses pagination to avoid Supabase's 1000 record limit
 */
export async function fetchLargeMeetingAttendance(
  supabaseClient: any,
  meetingId: string,
  expectedRecords: number
): Promise<any[]> {
  const BATCH_SIZE = 900 // Stay under 1000 limit
  const batches = Math.ceil(expectedRecords / BATCH_SIZE)

  const results = []

  for (let i = 0; i < batches; i++) {
    const offset = i * BATCH_SIZE
    const { data, error } = await supabaseClient
      .from('attendance_logs')
      .select('meeting_id, student_id, status')
      .eq('meeting_id', meetingId)
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) {
      console.error('Error fetching large meeting attendance:', error)
      throw error
    }

    results.push(...(data || []))
  }

  console.log(`[LARGE MEETING] Fetched ${results.length} records for meeting ${meetingId}`)

  return results
}
```

---

## Implementation Plan

### Phase 1: Add Server-Side Pagination Support

**File**: `src/app/(admin)/absensi/actions.ts`

**Changes**:

1. Update `getMeetingsWithStats` signature:
```typescript
export async function getMeetingsWithStats(
  classId?: string,
  page: number = 1,        // NEW
  pageSize: number = 10    // NEW
): Promise<{
  success: boolean
  data: MeetingWithStats[] | null
  total: number            // NEW: Total count for pagination
  hasMore: boolean         // NEW: Whether there are more pages
  error?: string
}>
```

2. Add pagination to meeting query:
```typescript
const offset = (page - 1) * pageSize

// Fetch total count first
const { count } = await supabase
  .from('meetings')
  .select('*', { count: 'exact', head: true })
  .eq(/* filters */)

// Fetch paginated meetings
const { data: meetings } = await supabase
  .from('meetings')
  .select(/* ... */)
  .range(offset, offset + pageSize - 1)
  .order('date', { ascending: false })

return {
  success: true,
  data: meetingsWithStats,
  total: count || 0,
  hasMore: offset + pageSize < (count || 0)
}
```

### Phase 2: Add Hybrid Batching

**File**: `src/lib/utils/batchFetching.ts`

**New Functions**:

1. `detectLargeMeetings(meetings)` - Classify meetings by size
2. `fetchLargeMeetingAttendance(client, meetingId, count)` - Handle large meetings
3. Update `fetchAttendanceLogsInBatches` to work with hybrid approach

**Code** (see Hybrid Batching Strategy section above)

### Phase 3: Update SWR Hook for Pagination

**File**: `src/app/(admin)/absensi/hooks/useMeetings.ts`

**Changes**:

1. Accept `page` and `pageSize` parameters:
```typescript
export function useMeetings(
  classId?: string,
  page: number = 1,
  pageSize: number = 10
) {
  // SWR key includes page for separate caching
  const swrKey = userId
    ? `/api/meetings/${classId || 'all'}/${userId}?page=${page}&size=${pageSize}`
    : null

  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    async () => {
      const result = await getMeetingsWithStats(classId, page, pageSize)

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch meetings')
      }

      return {
        meetings: result.data || [],
        total: result.total,
        hasMore: result.hasMore
      }
    },
    {
      revalidateOnFocus: false,  // Don't refetch on focus for pagination
      dedupingInterval: 5000,     // 5 seconds
      keepPreviousData: true      // Keep previous page while loading next
    }
  )

  return {
    meetings: data?.meetings || [],
    total: data?.total || 0,
    hasMore: data?.hasMore || false,
    error,
    isLoading,
    mutate
  }
}
```

### Phase 4: Persist Pagination State in Zustand

**File**: `src/app/(admin)/absensi/stores/absensiUIStore.ts`

**Changes**:

Add pagination state:
```typescript
interface AbsensiUIState {
  // ... existing state

  // Pagination state (NEW)
  currentPage: number
  pageSize: number
  setCurrentPage: (page: number) => void
  setPageSize: (size: number) => void
}

export const useAbsensiUIStore = create<AbsensiUIState>()(
  persist(
    (set) => ({
      // ... existing state

      // Pagination state
      currentPage: 1,
      pageSize: 10,
      setCurrentPage: (page) => set({ currentPage: page }),
      setPageSize: (size) => set({ pageSize: size })
    }),
    {
      name: 'absensi-ui-storage'
    }
  )
)
```

### Phase 5: Update Page Component

**File**: `src/app/(admin)/absensi/page.tsx`

**Changes**:

1. Replace `useState` with Zustand:
```typescript
// OLD
const [currentPage, setCurrentPage] = useState(1)

// NEW
const { currentPage, pageSize, setCurrentPage } = useAbsensiUIStore()
```

2. Update hook usage:
```typescript
// OLD
const { meetings, isLoading, mutate } = useMeetings(classId)

// NEW
const { meetings, total, hasMore, isLoading, mutate } = useMeetings(
  classId,
  currentPage,
  pageSize
)
```

3. Remove client-side slicing:
```typescript
// OLD - Delete this
const paginatedMeetings = filteredMeetings.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
)

// NEW - Use meetings directly (already paginated from server)
const displayedMeetings = meetings
```

4. Update pagination component:
```typescript
<Pagination
  currentPage={currentPage}
  totalPages={Math.ceil(total / pageSize)}
  onPageChange={setCurrentPage}
/>
```

### Phase 6: Handle Filters with Pagination

**Challenge**: When user applies filter, need to reset to page 1 and refetch.

**Solution**:
```typescript
// In page.tsx
useEffect(() => {
  // Reset to page 1 when filters change
  if (currentPage !== 1) {
    setCurrentPage(1)
  }
}, [dataFilters, classId])

// SWR will automatically refetch when key changes
```

---

## Testing Plan

### Test Scenarios

1. **Normal Pagination**
   - Load page 1 → should be fast (~150ms)
   - Click page 2 → should load and cache
   - Go back to page 1 → should use cache (instant)

2. **Large Meeting Handling**
   - Create test meeting with 1,500 students
   - Add attendance records for all students
   - Load page containing this meeting
   - Verify all 1,500 records are fetched correctly

3. **Pagination State Persistence**
   - Navigate to page 3
   - Switch browser tab
   - Return to tab
   - Verify still on page 3 (not reset to 1)

4. **Filters with Pagination**
   - Go to page 3
   - Apply class filter
   - Verify resets to page 1
   - Verify correct filtered results

5. **Performance Testing**
   - Create 500 meetings
   - Measure initial load time (should be <200ms)
   - Navigate through 5 pages
   - Measure total time

### Expected Results

| Metric | Current | After Implementation | Target |
|--------|---------|---------------------|--------|
| Initial load (100 meetings) | ~500ms | ~150ms | <200ms ✅ |
| Initial load (500 meetings) | ~2500ms | ~150ms | <200ms ✅ |
| Page navigation (cached) | 0ms | 0ms | <50ms ✅ |
| Page navigation (not cached) | 0ms | ~150ms | <200ms ✅ |
| Large meeting (2000 students) | ❌ Fails | ✅ Works | Works ✅ |
| Memory usage (500 meetings) | High | Low | Low ✅ |

---

## Rollback Plan

If implementation causes issues:

1. **Revert Changes**: All changes are in specific files, easy to revert
2. **Feature Flag**: Add environment variable to toggle between modes:
   ```typescript
   const useServerSidePagination = process.env.NEXT_PUBLIC_SERVER_SIDE_PAGINATION === 'true'
   ```
3. **Gradual Rollout**: Enable for admins first, then teachers, then all users

---

## Migration Strategy

### Option A: Big Bang (Recommended)

**When**: When ready to implement (estimated after 200-300 meetings accumulated)

**How**:
1. Implement all changes in a feature branch
2. Test thoroughly
3. Deploy to production in one release
4. Monitor for issues

**Pros**: Clean, no maintaining two code paths
**Cons**: Higher risk if issues occur

### Option B: Gradual Migration

**When**: Immediately, but behind feature flag

**How**:
1. Implement server-side pagination behind feature flag
2. Enable for specific users (admins) first
3. Gradually roll out to all users
4. Remove old code path after stable

**Pros**: Lower risk, can rollback easily
**Cons**: More complex, maintain two code paths temporarily

---

## Future Enhancements

### 1. Prefetch Next Page
```typescript
// Prefetch next page on hover or in background
const { mutate } = useSWRConfig()

const prefetchNextPage = () => {
  mutate(
    `/api/meetings/${classId}/${userId}?page=${currentPage + 1}`,
    getMeetingsWithStats(classId, currentPage + 1, pageSize)
  )
}
```

### 2. Infinite Scroll
Alternative to pagination - load more on scroll:
```typescript
const [meetings, setMeetings] = useState([])
const [page, setPage] = useState(1)

const loadMore = async () => {
  const result = await getMeetingsWithStats(classId, page + 1, 10)
  setMeetings([...meetings, ...result.data])
  setPage(page + 1)
}
```

### 3. Virtual Scrolling
For very large datasets, render only visible items:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: totalMeetings,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80 // estimated row height
})
```

---

## Dependencies

**Required**:
- None (all changes use existing dependencies)

**Optional** (for future enhancements):
- `@tanstack/react-virtual` - for virtual scrolling
- `react-intersection-observer` - for infinite scroll

---

## Success Metrics

**How to measure success**:

1. **Performance**:
   - Initial load time reduced by >60%
   - Consistent load times regardless of data size

2. **Scalability**:
   - Successfully handles meetings with 2,000+ students
   - No errors or data loss

3. **User Experience**:
   - Pagination state persists across tab switches
   - Smooth page transitions (<200ms)

4. **Technical**:
   - Memory usage reduced by >70%
   - Database query count optimized

---

## Appendix: Code Examples

### Complete getMeetingsWithStats Implementation

```typescript
export async function getMeetingsWithStats(
  classId?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{
  success: boolean
  data: MeetingWithStats[] | null
  total: number
  hasMore: boolean
  error?: string
}> {
  'use server'

  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()
    const user = await getCurrentUser()
    const profile = await getCurrentUserProfile()

    // Calculate pagination
    const offset = (page - 1) * pageSize

    // Build query
    let query = supabase
      .from('meetings')
      .select(`
        *,
        classes (
          id, name, kelompok_id,
          kelompok (id, name, desa_id, desa (id, name, daerah_id, daerah (id, name)))
        )
      `, { count: 'exact' })

    // Apply filters (classId, date range, etc.)
    if (classId) {
      query = query.or(`class_id.eq.${classId},class_ids.cs.{${classId}}`)
    }

    // Apply permissions filter
    if (profile.role === 'teacher') {
      const teacherClassIds = await getTeacherClassIds(user.id)
      query = query.or(
        teacherClassIds.map(id => `class_ids.cs.{${id}}`).join(',')
      )
    }

    // Get total count
    const { count, error: countError } = await query

    if (countError) throw countError

    // Get paginated data
    const { data: meetings, error: meetingsError } = await query
      .range(offset, offset + pageSize - 1)
      .order('date', { ascending: false })

    if (meetingsError) throw meetingsError

    // Classify meetings by size
    const normalMeetings = []
    const largeMeetings = []

    meetings.forEach(meeting => {
      const studentCount = meeting.student_snapshot?.length || 0
      if (studentCount > 800) {
        largeMeetings.push(meeting)
      } else {
        normalMeetings.push(meeting)
      }
    })

    // Fetch attendance with hybrid strategy
    let allAttendance = []

    // Normal meetings: batch fetch
    if (normalMeetings.length > 0) {
      const { data: normalAttendance } = await fetchAttendanceLogsInBatches(
        adminClient,
        normalMeetings.map(m => m.id)
      )
      allAttendance.push(...(normalAttendance || []))
    }

    // Large meetings: individual fetch
    for (const meeting of largeMeetings) {
      const attendance = await fetchLargeMeetingAttendance(
        adminClient,
        meeting.id,
        meeting.student_snapshot?.length || 0
      )
      allAttendance.push(...attendance)
    }

    // Calculate stats for each meeting
    const meetingsWithStats = meetings.map(meeting => {
      const meetingAttendance = allAttendance.filter(
        a => a.meeting_id === meeting.id
      )

      const totalStudents = meeting.student_snapshot?.length || 0
      const presentCount = meetingAttendance.filter(a => a.status === 'H').length
      const absentCount = meetingAttendance.filter(a => a.status === 'A').length
      const sickCount = meetingAttendance.filter(a => a.status === 'S').length
      const excusedCount = meetingAttendance.filter(a => a.status === 'I').length

      const attendancePercentage = totalStudents > 0
        ? Math.round((presentCount / totalStudents) * 100)
        : 0

      return {
        ...meeting,
        attendancePercentage,
        totalStudents,
        presentCount,
        absentCount,
        sickCount,
        excusedCount
      }
    })

    return {
      success: true,
      data: meetingsWithStats,
      total: count || 0,
      hasMore: offset + pageSize < (count || 0)
    }
  } catch (error: any) {
    console.error('Error in getMeetingsWithStats:', error)
    return {
      success: false,
      data: null,
      total: 0,
      hasMore: false,
      error: error.message
    }
  }
}
```

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-02 | Claude | Initial documentation |

---

**Next Steps**:
1. Review this plan with team
2. Prioritize implementation (suggest: when meetings reach 200+)
3. Create GitHub issue for tracking
4. Implement when ready
