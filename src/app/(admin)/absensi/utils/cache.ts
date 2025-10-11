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
 * Invalidate specific meeting cache
 */
export async function invalidateMeetingCache(meetingId: string) {
  return mutate(`/api/meeting-attendance/${meetingId}`, undefined, { revalidate: true })
}
