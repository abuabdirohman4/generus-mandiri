import useSWR from 'swr'
import { getMeetingFormSettings, MeetingFormSettings } from '@/app/(admin)/users/guru/actions'
import { meetingFormSettingsKeys } from '@/lib/swr'

const DEFAULT_SETTINGS: MeetingFormSettings = {
  showTitle: true,
  showTopic: false,
  showDescription: false,
  showDate: true,
  showMeetingType: true,
  showClassSelection: true,
  showStudentSelection: false,
  showGenderFilter: false
}

export function useMeetingFormSettings(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? meetingFormSettingsKeys.settings(userId) : null,
    async () => {
      if (!userId) return DEFAULT_SETTINGS

      const result = await getMeetingFormSettings(userId)
      return result.success && result.data ? result.data : DEFAULT_SETTINGS
    },
    {
      revalidateOnFocus: false, // Settings rarely change
      dedupingInterval: 5 * 60 * 1000, // 5 minutes cache
      fallbackData: DEFAULT_SETTINGS, // Show immediately
    }
  )

  return {
    settings: data || DEFAULT_SETTINGS,
    isLoading,
    error,
    mutate
  }
}
