'use client'

import { MEETING_TYPES } from '@/lib/constants/meetingTypes'

interface MeetingTypeBadgeProps {
  meetingTypeCode?: string | null
  isSambungCapable?: boolean
}

const MEETING_TYPE_COLORS = {
  PEMBINAAN: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SAMBUNG_KELOMPOK: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  SAMBUNG_DESA: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  SAMBUNG_DAERAH: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  SAMBUNG_PUSAT: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
}

export default function MeetingTypeBadge({ meetingTypeCode, isSambungCapable }: MeetingTypeBadgeProps) {
  // Don't show if not sambung capable
  // if (isSambungCapable === false && isHasMultipleClasses === false) {
  //   return null
  // }

  // Don't show if no meeting type
  if (!meetingTypeCode) {
    return null
  }

  const meetingType = Object.values(MEETING_TYPES).find(t => t.code === meetingTypeCode)
  if (!meetingType) {
    return null
  }

  const colorClass = MEETING_TYPE_COLORS[meetingTypeCode as keyof typeof MEETING_TYPE_COLORS] || 
    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'

  return (
    // <span className={`inline-flex items-center px-2 py-1 my-2 rounded-full text-xs font-medium ${colorClass}`}>
    //   {meetingType.label}
    // </span>
    <span>{meetingType.label}</span>
  )
}
