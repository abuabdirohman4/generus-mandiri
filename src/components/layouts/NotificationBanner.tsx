'use client'

import { useNotifications } from '@/hooks/useNotifications'
import { AlertIcon, CheckCircleIcon, InfoIcon } from '@/lib/icons'
import { sanitizeHtml } from '@/lib/htmlText'
import { DEFAULT_DISPLAY_CONFIG } from '@/types/notification'

const TYPE_STYLES = {
  success: {
    wrapper: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-900 dark:text-green-100',
    body: 'text-green-700 dark:text-green-300',
    dismiss: 'text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-200',
  },
  warning: {
    wrapper: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-700',
    icon: 'text-yellow-600 dark:text-yellow-400',
    title: 'text-yellow-900 dark:text-yellow-100',
    body: 'text-yellow-700 dark:text-yellow-300',
    dismiss: 'text-yellow-500 dark:text-yellow-400 hover:text-yellow-700 dark:hover:text-yellow-200',
  },
  broadcast: {
    wrapper: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    body: 'text-blue-700 dark:text-blue-300',
    dismiss: 'text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200',
  },
} as const

type BannerType = keyof typeof TYPE_STYLES

function getStyles(type: string) {
  return TYPE_STYLES[(type as BannerType) in TYPE_STYLES ? (type as BannerType) : 'broadcast']
}

function BannerIcon({ type, className }: { type: string; className: string }) {
  const resolved = (type as BannerType) in TYPE_STYLES ? (type as BannerType) : 'broadcast'
  if (resolved === 'success') return <CheckCircleIcon className={className} />
  if (resolved === 'warning') return <AlertIcon className={className} />
  return <InfoIcon className={className} />
}

export default function NotificationBanner() {
  const { notifications: listNotifications, dismiss } = useNotifications()
  // Banner uses allNotifications via separate filter: mode=banner|both, not dismissed
  // We access raw via hook — but since useNotifications already filters showInList,
  // we pull from the hook directly and only check mode here (banner doesn't care about showInList)

  const undismissed = listNotifications
    .filter(n => {
      if (n.is_dismissed) return false
      if (n.is_read) return false  // banner hilang otomatis setelah dibaca
      const cfg = n.display_config ?? DEFAULT_DISPLAY_CONFIG
      return cfg.mode === 'banner' || cfg.mode === 'both'
    })
    .slice(0, 3)
  if (undismissed.length === 0) return null

  return (
    <div className="flex flex-col gap-2 px-3 sm:px-6 lg:px-8">
      {undismissed.map(notif => {
        const styles = getStyles(notif.type)
        return (
          <div key={notif.id} className={`relative rounded-lg border px-4 py-3 ${styles.wrapper}`}>
            <div className="flex items-start gap-3">
              <BannerIcon type={notif.type} className={`w-6 h-6 mt-0.5 shrink-0 ${styles.icon}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${styles.title}`}>{notif.title}</p>
                <div
                  className={`prose prose-sm dark:prose-invert max-w-none text-sm mt-0.5 ${styles.body}`}
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(notif.body) }}
                />
              </div>
              <button
                onClick={() => dismiss(notif.id)}
                className={`shrink-0 transition-colors ${styles.dismiss}`}
                aria-label="Tutup notifikasi"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
