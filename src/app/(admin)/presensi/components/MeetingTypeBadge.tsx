'use client'

interface MeetingTypeBadgeProps {
  activityType?: { id: string; code: string; name: string } | null
}

const MEETING_TYPE_COLORS = {
  PEMBINAAN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SAMBUNG_KELOMPOK: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SAMBUNG_DESA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  SAMBUNG_DAERAH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SAMBUNG_PUSAT: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
}

export default function MeetingTypeBadge({ activityType }: MeetingTypeBadgeProps) {
  if (!activityType) {
    return null
  }

  const colorClass = MEETING_TYPE_COLORS[activityType.code as keyof typeof MEETING_TYPE_COLORS] || 
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'

  return (
    <span>{activityType.name}</span>
  )
}
