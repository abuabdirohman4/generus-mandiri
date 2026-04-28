'use client'

import useSWR from 'swr'
import { getMyAllowedClassesForMeeting } from '@/app/(admin)/absensi/actions/meetings/actions'

const fetcher = () => getMyAllowedClassesForMeeting()

export function useMyAllowedClasses() {
  const { data, isLoading } = useSWR(
    'my-allowed-classes-for-meeting',
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
    }
  )

  return {
    // null = no restriction (teacher sees all classes in their scope)
    // string[] = only these class IDs are allowed
    allowedClassIds: data?.allowedClassIds ?? null,
    isLoading,
  }
}
