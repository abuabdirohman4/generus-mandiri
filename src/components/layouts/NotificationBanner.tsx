'use client'

import { useNotifications } from '@/hooks/useNotifications'

export default function NotificationBanner() {
  const { notifications, dismiss } = useNotifications()

  // Show the most recent undismissed notification
  const latest = notifications.find(n => !n.is_dismissed)
  if (!latest) return null

  return (
    <div className="relative bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        {/* Bell icon */}
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{latest.title}</p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-0.5 line-clamp-2">{latest.body}</p>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => dismiss(latest.id)}
          className="flex-shrink-0 text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 transition-colors"
          aria-label="Tutup notifikasi"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
