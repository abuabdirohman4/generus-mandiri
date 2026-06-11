'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { sanitizeHtml } from '@/lib/htmlText'
import { CloseLineIcon } from '@/lib/icons'
import type { NotificationWithStatus } from '@/types/notification'
import { DEFAULT_DISPLAY_CONFIG } from '@/types/notification'

// Inline SVG icons — TANPA atribut width/height supaya className (w-12 dll) bekerja.
// Icon dari @/lib/icons (SVGR) punya width="24" height="24" hardcoded yang menang
// atas Tailwind class, jadi tidak bisa di-resize. Pola ini ikuti MonitoringIcon di icons.tsx.
const AlertIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M13.9497 3.875C13.0836 2.375 10.9186 2.375 10.0525 3.875L2.54699 16.875C1.68096 18.375 2.76349 20.25 4.49554 20.25H19.5067C21.2387 20.25 22.3212 18.375 21.4552 16.875L13.9497 3.875ZM11.3516 4.625C11.6403 4.125 12.3619 4.125 12.6506 4.625L20.1562 17.625C20.4448 18.125 20.084 18.75 19.5067 18.75H4.49554C3.91819 18.75 3.55735 18.125 3.84603 17.625L11.3516 4.625ZM12.0018 8.56075C12.416 8.56075 12.7518 8.89653 12.7518 9.31075V13.5303C12.7518 13.9445 12.416 14.2803 12.0018 14.2803C11.5876 14.2803 11.2518 13.9445 11.2518 13.5303V9.31075C11.2518 8.89653 11.5876 8.56075 12.0018 8.56075ZM11.0009 16.0803C11.0009 15.528 11.4486 15.0803 12.0009 15.0803H12.0016C12.5539 15.0803 13.0016 15.528 13.0016 16.0803C13.0016 16.6326 12.5539 17.0803 12.0016 17.0803H12.0009C11.4486 17.0803 11.0009 16.6326 11.0009 16.0803Z" fill="currentColor" />
  </svg>
)

const CheckCircleIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M3.55078 12C3.55078 7.33417 7.3332 3.55176 11.999 3.55176C16.6649 3.55176 20.4473 7.33417 20.4473 12C20.4473 16.6659 16.6649 20.4483 11.999 20.4483C7.3332 20.4483 3.55078 16.6659 3.55078 12ZM11.999 2.05176C6.50477 2.05176 2.05078 6.50574 2.05078 12C2.05078 17.4943 6.50477 21.9483 11.999 21.9483C17.4933 21.9483 21.9473 17.4943 21.9473 12C21.9473 6.50574 17.4933 2.05176 11.999 2.05176ZM15.5126 10.6333C15.8055 10.3405 15.8055 9.86558 15.5126 9.57269C15.2197 9.27979 14.7448 9.27979 14.4519 9.57269L11.1883 12.8364L9.54616 11.1942C9.25327 10.9014 8.7784 10.9014 8.4855 11.1942C8.19261 11.4871 8.19261 11.962 8.4855 12.2549L10.6579 14.4273C10.7986 14.568 10.9894 14.647 11.1883 14.647C11.3872 14.647 11.578 14.568 11.7186 14.4273L15.5126 10.6333Z" fill="currentColor" />
  </svg>
)

const InfoIcon = ({ className = '' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path fillRule="evenodd" clipRule="evenodd" d="M3.5 12C3.5 7.30558 7.30558 3.5 12 3.5C16.6944 3.5 20.5 7.30558 20.5 12C20.5 16.6944 16.6944 20.5 12 20.5C7.30558 20.5 3.5 16.6944 3.5 12ZM12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM10.9991 7.52507C10.9991 8.07736 11.4468 8.52507 11.9991 8.52507H12.0001C12.5524 8.52507 13.0001 8.07736 13.0001 7.52507C13.0001 6.97279 12.5524 6.52507 12.0001 6.52507H11.9991C11.4468 6.52507 10.9991 6.97279 10.9991 7.52507ZM12.0001 17.3714C11.5859 17.3714 11.2501 17.0356 11.2501 16.6214V10.9449C11.2501 10.5307 11.5859 10.1949 12.0001 10.1949C12.4143 10.1949 12.7501 10.5307 12.7501 10.9449V16.6214C12.7501 17.0356 12.4143 17.3714 12.0001 17.3714Z" fill="currentColor" />
  </svg>
)

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
  const { allNotifications, dismiss, markRead } = useNotifications()
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
    if (!notif.is_read) markRead([notif.id])
    dismiss(notif.id)
  }, [notif, dismiss, markRead])

  const handleCta = useCallback(() => {
    if (!notif) return
    if (!notif.is_read) markRead([notif.id])
    dismiss(notif.id)
    if (notif.action_url) {
      if (notif.action_url.startsWith('http')) {
        window.open(notif.action_url, '_blank', 'noopener')
      } else {
        router.push(notif.action_url)
      }
    }
  }, [notif, dismiss, markRead, router])

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
            <cfg.Icon className={`w-12 h-12 ${cfg.iconColor}`} />
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
              className={`w-full rounded-full py-2 font-semibold transition ${cfg.btnClass}`}
            >
              {notif.action_label || 'Buka'}
            </button>
          )}

          {isAcknowledge && (
            <button
              onClick={handleClose}
              className={`w-full rounded-full py-2 font-semibold transition ${cfg.btnClass}`}
            >
              Mengerti
            </button>
          )}

          {isFree && (
            <button
              onClick={handleClose}
              className={`w-full rounded-full py-2 font-semibold transition ${cfg.btnClass}`}
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
