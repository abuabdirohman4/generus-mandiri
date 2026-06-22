import { mutate } from 'swr'

/**
 * Invalidate meetings cache for a specific user
 * This will trigger a re-fetch of meetings data
 */
export async function invalidateMeetingsCache(userId: string, classId?: string) {
  // Create the exact SWR key pattern used in useMeetings
  const baseKey = classId ? `/api/meetings/${classId}/${userId}` : `/api/meetings/${userId}`
  
  console.log('🔄 Invalidating meetings cache:', { userId, classId, baseKey })
  
  // Invalidate both dummy and non-dummy data with revalidation
  const results = await Promise.all([
    mutate(`${baseKey}?dummy=true`, undefined, { revalidate: true }),
    mutate(`${baseKey}?dummy=false`, undefined, { revalidate: true })
  ])
  
  console.log('✅ Cache invalidation completed:', results)
}

/**
 * Invalidate ALL meetings cache for all users
 * This is useful when a meeting is created/updated by one user
 * and other users need to see the changes immediately
 */
export async function invalidateAllMeetingsCache() {
  console.log('🔄 Invalidating ALL meetings cache...')
  
  // Use SWR's key matcher to invalidate all meeting-related caches
  // This will match any SWR key that starts with '/api/meetings/'
  await mutate(
    (key) => typeof key === 'string' && key.startsWith('/api/meetings/'),
    undefined,
    { revalidate: true }
  )
  
  console.log('✅ All meetings cache invalidated')
}

/**
 * Invalidate specific meeting cache
 */
export async function invalidateMeetingCache(meetingId: string) {
  return mutate(`/api/meeting-attendance/${meetingId}`, undefined, { revalidate: true })
}

interface OptimisticStats {
  totalStudents: number
  presentCount: number
  absentCount: number
  sickCount: number
  excusedCount: number
}

/**
 * Optimistic upsert: sisipkan meeting baru (belum ada di cache) ATAU patch yang sudah ada,
 * lengkap dengan stats kehadiran — tanpa buang data lain di cache. Card muncul instan saat
 * user back ke /presensi; revalidate berat (getMeetingsWithStats) jalan di belakang.
 *
 * Pakai key matcher (function predicate) agar semua varian SWR key /api/meetings/ ter-update
 * sekaligus — mengatasi mismatch classId filter antara list page dan detail page.
 */
export async function upsertMeetingInCache(
  userId: string,
  meeting: any,
  stats: OptimisticStats,
) {
  const attendancePercentage = stats.totalStudents > 0
    ? Math.round((stats.presentCount / stats.totalStudents) * 100)
    : 0
  const merged = { ...meeting, ...stats, attendancePercentage }

  const updater = (current: any) => {
    if (!current?.allMeetings) return current
    const exists = current.allMeetings.some((m: any) => m.id === meeting.id)
    const allMeetings = exists
      ? current.allMeetings.map((m: any) =>
          m.id === meeting.id ? { ...m, ...merged } : m
        )
      : [...current.allMeetings, merged].sort(
          (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    return {
      ...current,
      allMeetings,
      total: exists ? current.total : (current.total ?? allMeetings.length - 1) + 1,
    }
  }

  // Key matcher: cocokkan SEMUA varian key /api/meetings/ milik user ini
  // (dengan/tanpa classId, dummy=true/false) — sehingga filter apapun yang aktif di list page
  // tetap ter-update tanpa perlu tahu classId atau dummy flag yang sedang aktif.
  await mutate(
    (key) => typeof key === 'string' && key.includes(`/api/meetings/`) && key.includes(userId),
    updater,
    { revalidate: true }
  )
}
