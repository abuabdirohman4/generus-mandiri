'use client'

import { useState, useCallback } from 'react'
import TemplateList from './TemplateList'
import TemplateClient from './TemplateClient'

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
