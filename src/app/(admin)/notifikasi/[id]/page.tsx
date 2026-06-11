'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { getNotificationDetail } from '../actions'
import type { NotificationWithStatus } from '@/types/notification'
import { sanitizeHtml } from '@/lib/htmlText'
import { AlertIcon, CheckCircleIcon, InfoIcon } from '@/lib/icons'

const TYPE_CONFIG: Record<string, {
  label: string
  strip: string
  icon: string
  title: string
  Icon: React.FC<{ className?: string }>
}> = {
  success: {
    label: 'Sukses',
    strip: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    icon: 'text-green-600 dark:text-green-400',
    title: 'text-green-700 dark:text-green-300',
    Icon: CheckCircleIcon,
  },
  warning: {
    label: 'Tindakan',
    strip: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    icon: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-700 dark:text-amber-300',
    Icon: AlertIcon,
  },
  info: {
    label: 'Informasi',
    strip: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-700 dark:text-blue-300',
    Icon: InfoIcon,
  },
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function NotifikasiDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [notif, setNotif] = useState<NotificationWithStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getNotificationDetail(id).then(res => {
      if (res.success && res.data) {
        setNotif(res.data as NotificationWithStatus)
      } else {
        setError(res.message || 'Notifikasi tidak ditemukan')
      }
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !notif) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8 py-8">
          <p className="text-sm text-gray-500 dark:text-gray-400">{error ?? 'Notifikasi tidak ditemukan'}</p>
          <Link href="/notifikasi" className="mt-4 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400">
            ← Kembali ke Notifikasi
          </Link>
        </div>
      </div>
    )
  }

  const cfg = TYPE_CONFIG[notif.type] ?? TYPE_CONFIG.info

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8 py-6 md:py-8">
        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header strip berwarna */}
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${cfg.strip}`}>
            <cfg.Icon className={`w-6 h-6 ${cfg.icon}`} />
            <span className={`text-sm font-semibold ${cfg.title}`}>{cfg.label}</span>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Meta */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400 dark:text-gray-500">
              {notif.sender_name && (
                <>
                  <span>{notif.sender_name}</span>
                  <span aria-hidden>·</span>
                </>
              )}
              <span>{formatDate(notif.created_at)}</span>
              {notif.edited_at && (
                <>
                  <span aria-hidden>·</span>
                  <span className="italic">diedit</span>
                </>
              )}
            </div>

            {/* Title */}
            <h1 className={`text-xl font-bold leading-snug`}>
              {notif.title}
            </h1>

            {/* Body — rich text HTML */}
            <div
              className="prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(notif.body) }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
