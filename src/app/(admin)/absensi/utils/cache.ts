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
