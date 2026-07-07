'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import TemplateList from './TemplateList'
import Spinner from '@/components/ui/spinner/Spinner'

const TemplateClient = dynamic(() => import('./TemplateClient'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-20 bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="flex flex-col items-center gap-4">
        <Spinner size={40} />
        <p className="text-gray-500 dark:text-gray-400">Memuat editor template...</p>
      </div>
    </div>
  )
})

export default function TemplateManager() {
  const [editingId, setEditingId] = useState<string | undefined>(undefined)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleSaved = useCallback(() => {
    setEditingId(undefined)
    setRefreshKey(k => k + 1)
  }, [])

  const handleDeleted = useCallback((deletedId: string) => {
    setEditingId(prev => (prev === deletedId ? undefined : prev))
  }, [])

  return (
    <div className="space-y-6">
      <TemplateList onEdit={setEditingId} onDeleted={handleDeleted} editingId={editingId} refreshKey={refreshKey} />
      <TemplateClient
        key={editingId || 'new'}
        templateId={editingId}
        onCancelEdit={editingId ? () => setEditingId(undefined) : undefined}
        onSaved={handleSaved}
      />
    </div>
  )
}
