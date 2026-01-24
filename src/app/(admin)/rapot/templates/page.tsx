// src/app/(admin)/rapot/templates/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAllTemplates, deleteTemplate } from './actions'
import type { ReportTemplate } from './types'
import Button from '@/components/ui/button/Button'
import { PencilIcon, TrashBinIcon, PlusIcon } from '@/lib/icons'
import { useUserProfile } from '@/stores/userProfileStore'
import { isSuperAdmin, isAdmin } from '@/lib/userUtils'

export default function TemplatesPage() {
  const router = useRouter()
  const { profile } = useUserProfile()
  const [templates, setTemplates] = useState<ReportTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const isAdminUser = profile && (isSuperAdmin(profile) || isAdmin(profile))

  const loadTemplates = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getAllTemplates()
      if (result.success && result.data) {
        setTemplates(result.data)
      } else {
        setError(result.error || 'Failed to load templates')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus template "${name}"?`)) {
      return
    }

    const result = await deleteTemplate(id)
    if (result.success) {
      loadTemplates()
    } else {
      alert('Error: ' + (result.error || 'Failed to delete template'))
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-4 pb-28 md:pb-0 md:px-6 lg:px-8">
          <div className="mb-8">
            <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-4 pb-28 md:pb-0 md:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-500">Error: {error}</p>
            <Button onClick={loadTemplates} variant="outline" className="mt-4">
              Coba Lagi
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto px-4 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Template Rapot
            </h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Kelola template rapot untuk berbagai jenis kelas
            </p>
          </div>
        </div>

        {/* Templates List */}
        {templates.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              Belum ada template rapot. Klik "Buat Template" untuk membuat yang pertama.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map(template => (
              <div
                key={template.id}
                className="rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-gray-800"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h3>
                      <span className="inline-flex rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        Semester {template.semester}
                      </span>
                    </div>

                    {/* Show classes */}
                    {template.class_masters && template.class_masters.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {template.class_masters.slice(0, 3).map(cm => (
                          <span
                            key={cm.id}
                            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                          >
                            {cm.name}
                          </span>
                        ))}
                        {template.class_masters.length > 3 && (
                          <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                            +{template.class_masters.length - 3} lainnya
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        🌐 Universal (Semua Kelas)
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      template.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {template.is_active ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>

                {/* Description */}
                {template.description && (
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Actions */}
                {isAdminUser && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/rapot/templates/${template.id}`)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(template.id, template.name)}
                      className="flex items-center justify-center rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      <TrashBinIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Floating Create Button */}
        {isAdminUser && (
          <div className="fixed z-50 bottom-[80px] md:bottom-6 right-6">
              <button
                  onClick={() => router.push('/rapot/templates/create')}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center justify-center"
              >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
              </button>
          </div>
        )}
      </div>
    </div>
  )
}