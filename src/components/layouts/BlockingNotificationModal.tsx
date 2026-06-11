'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { sanitizeHtml } from '@/lib/htmlText'
import { AlertIcon, CheckCircleIcon, InfoIcon, CloseLineIcon } from '@/lib/icons'
import type { NotificationWithStatus } from '@/types/notification'
import { DEFAULT_DISPLAY_CONFIG } from '@/types/notification'

const TYPE_CONFIG = {
  success: {
    label: 'Sukses',
    iconBg: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    titleColor: 'text-green-600 dark:text-green-400',
    btnClass: 'bg-green-600 hover:bg-green-700 text-white',
    Icon: CheckCircleIcon,
  },
  warning: {
    label: 'Peringatan',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-600 dark:text-amber-400',
    btnClass: 'bg-amber-600 hover:bg-amber-700 text-white',
    Icon: AlertIcon,
  },
  info: {
    label: 'Informasi',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-600 dark:text-blue-400',
    btnClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    Icon: InfoIcon,
  },
} as const

function getConfig(type: string) {
  return TYPE_CONFIG[(type as keyof typeof TYPE_CONFIG) in TYPE_CONFIG ? (type as keyof typeof TYPE_CONFIG) : 'info']
}

export default function BlockingNotificationModal() {
  const { allNotifications, dismiss } = useNotifications()
  const router = useRouter()

  // Pick first undismissed notification with mode=modal or mode=both
  const notif: NotificationWithStatus | undefined = allNotifications.find(n => {
    if (n.is_dismissed) return false
    const cfg = n.display_config ?? DEFAULT_DISPLAY_CONFIG
    return cfg.mode === 'modal' || cfg.mode === 'both'
  })

  const displayConfig = notif ? (notif.display_config ?? DEFAULT_DISPLAY_CONFIG) : null
  const isBlocking = displayConfig?.dismiss === 'cta_required'
  const isAcknowledge = displayConfig?.dismiss === 'acknowledge'
  const isFree = displayConfig?.dismiss === 'free'

  // Lock scroll when modal visible
  useEffect(() => {
    if (notif) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [!!notif])

  // Escape key — only for non-blocking
  useEffect(() => {
    if (!notif || isBlocking) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss(notif.id)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [notif, isBlocking, dismiss])

  const handleClose = useCallback(() => {
    if (!notif) return
    dismiss(notif.id)
  }, [notif, dismiss])

  const handleCta = useCallback(() => {
    if (!notif) return
    dismiss(notif.id)
    if (notif.action_url) {
      if (notif.action_url.startsWith('http')) {
        window.open(notif.action_url, '_blank', 'noopener')
      } else {
        router.push(notif.action_url)
      }
    }
  }, [notif, dismiss, router])

  if (!notif || !displayConfig) return null

  const cfg = getConfig(notif.type)

  return (
    <div className="fixed inset-0 z-99999 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={isFree ? handleClose : undefined}
        aria-hidden
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-800 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close X — pojok kanan atas, hanya jika bisa ditutup */}
        {!isBlocking && (
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            aria-label="Tutup"
          >
            <CloseLineIcon className="w-5 h-5" />
          </button>
        )}

        <div className="p-8 flex flex-col items-center text-center">
          {/* Ikon besar di lingkaran — warna ikut tipe */}
          <div className={`flex items-center justify-center w-20 h-20 rounded-full mb-5 ${cfg.iconBg}`}>
            <cfg.Icon className={`w-10 h-10 ${cfg.iconColor}`} />
          </div>

          {/* Judul — warna ikut tipe */}
          <h2 className={`text-xl font-bold mb-4 ${cfg.titleColor}`}>
            {notif.title}
          </h2>

          {/* Body — rata kiri-kanan */}
          <div
            className="prose prose-sm dark:prose-invert max-w-none text-justify text-gray-600 dark:text-gray-300 mb-6"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(notif.body) }}
          />

          {/* Tombol — tengah bawah, lebar penuh, warna ikut tipe */}
          {isBlocking && notif.action_url && (
            <button
              onClick={handleCta}
              className={`w-full rounded-full py-3 font-semibold transition ${cfg.btnClass}`}
            >
              {notif.action_label || 'Buka'}
            </button>
          )}

          {isAcknowledge && (
            <button
              onClick={handleClose}
              className={`w-full rounded-full py-3 font-semibold transition ${cfg.btnClass}`}
            >
              Mengerti
            </button>
          )}

          {isFree && (
            <button
              onClick={handleClose}
              className={`w-full rounded-full py-3 font-semibold transition ${cfg.btnClass}`}
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
