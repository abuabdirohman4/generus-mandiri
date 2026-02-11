'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUserProfile } from '@/stores/userProfileStore'

export default function NotificationBadge() {
  const { profile } = useUserProfile()
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (profile?.notification_badge?.pending_transfer_requests) {
      setCount(profile.notification_badge.pending_transfer_requests)
    } else {
      setCount(0)
    }
  }, [profile])

  // Only show for admin and superadmin
  if (!profile || (profile.role !== 'admin' && profile.role !== 'superadmin')) {
    return null
  }

  // Don't show if count is 0
  if (count === 0) {
    return null
  }

  return (
    <Link
      href="/users/siswa?tab=pending-transfers"
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      title={`${count} permintaan transfer pending`}
    >
      {/* Bell Icon */}
      <svg
        className="w-6 h-6 text-gray-700 dark:text-gray-300"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* Badge */}
      <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
        {count > 99 ? '99+' : count}
      </span>
    </Link>
  )
}
