'use client'

import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/button/Button'
import Spinner from '@/components/ui/spinner/Spinner'
import ConfirmModal from '@/components/ui/modal/ConfirmModal'
import { ChevronDownIcon } from '@/lib/icons'
import { getIdCardTemplatesAction, deleteIdCardTemplateAction } from '../actions/template/actions'
import type { IdCardTemplate } from '@/types/idCardTemplate'

interface TemplateListProps {
  onEdit: (id: string) => void
  onDeleted?: (id: string) => void
  editingId?: string
  refreshKey?: number
}

export default function TemplateList({ onEdit, onDeleted, editingId, refreshKey }: TemplateListProps) {
  const [templates, setTemplates] = useState<IdCardTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<IdCardTemplate | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(true)

  const loadTemplates = useCallback(async () => {
    setIsLoading(true)
    const res = await getIdCardTemplatesAction()
    if (res.success && res.data) {
      setTemplates(res.data)
    } else {
      toast.error(res.message || 'Gagal memuat daftar template')
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadTemplates()
  }, [loadTemplates, refreshKey])

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await deleteIdCardTemplateAction(deleteTarget.id)
      if (!res.success) throw new Error(res.message)
      toast.success('Template berhasil dihapus')
      onDeleted?.(deleteTarget.id)
      setDeleteTarget(null)
      loadTemplates()
    } catch (err: any) {
      toast.error(err.message || 'Gagal menghapus template')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <button
        type="button"
        onClick={() => setIsCollapsed(prev => !prev)}
        className="flex w-full items-center justify-between text-left"
        aria-expanded={!isCollapsed}
      >
        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Template Tersimpan {templates.length > 0 && `(${templates.length})`}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`}
        />
      </button>

      {!isCollapsed && (
        <div className="mt-3">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size={24} />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">Belum ada template.</p>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {templates.map(t => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className={`text-sm ${editingId === t.id ? 'font-semibold text-brand-600 dark:text-brand-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t.name}
                    {editingId === t.id && <span className="ml-2 text-xs text-gray-400">(sedang diedit)</span>}
                  </span>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => onEdit(t.id)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(t)}>
                      Hapus
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Template?"
        message={`Template "${deleteTarget?.name}" akan dihapus permanen beserta gambarnya.`}
        confirmText="Hapus"
        isDestructive
        isLoading={isDeleting}
      />
    </div>
  )
}
