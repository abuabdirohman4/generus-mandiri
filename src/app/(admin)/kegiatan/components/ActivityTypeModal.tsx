'use client'

import { useState, useEffect } from 'react'
import { createActivityType, updateActivityType } from '../actions'
import { Modal } from '@/components/ui/modal'
import InputField from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import Button from '@/components/ui/button/Button'
import type { ActivityType } from '@/types/activityType'

interface ActivityTypeModalProps {
  isOpen: boolean
  onClose: () => void
  activityType?: ActivityType | null
  onSuccess: () => void
}

export default function ActivityTypeModal({
  isOpen,
  onClose,
  activityType,
  onSuccess,
}: ActivityTypeModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    sort_order: 0,
    is_active: true,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (activityType) {
      setFormData({
        code: activityType.code,
        name: activityType.name,
        description: activityType.description || '',
        sort_order: activityType.sort_order,
        is_active: activityType.is_active,
      })
    } else {
      setFormData({
        code: '',
        name: '',
        description: '',
        sort_order: 0,
        is_active: true,
      })
    }
    setError(undefined)
  }, [activityType, isOpen])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else if (name === 'code') {
      setFormData(prev => ({ ...prev, [name]: value.toUpperCase() }))
    } else if (name === 'sort_order') {
      setFormData(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(undefined)

    try {
      if (activityType) {
        const result = await updateActivityType(activityType.id, {
          name: formData.name,
          description: formData.description,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        if (!result.success) {
          setError(result.message || 'Gagal memperbarui tipe kegiatan')
          return
        }
      } else {
        const result = await createActivityType({
          code: formData.code,
          name: formData.name,
          description: formData.description,
          sort_order: formData.sort_order,
          is_active: formData.is_active,
        })
        if (!result.success) {
          setError(result.message || 'Gagal membuat tipe kegiatan')
          return
        }
      }
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px] m-4">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {activityType ? 'Edit Tipe Kegiatan' : 'Tambah Tipe Kegiatan'}
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Kode</Label>
              <InputField
                id="code"
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                placeholder="Contoh: PENGAJIAN"
                required
                disabled={isLoading || !!activityType}
              />
              {activityType && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Kode tidak dapat diubah setelah dibuat
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="name">Nama</Label>
              <InputField
                id="name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Masukkan nama tipe kegiatan"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="description">Deskripsi (opsional)</Label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Masukkan deskripsi tipe kegiatan"
                disabled={isLoading}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <Label htmlFor="sort_order">Urutan</Label>
              <InputField
                id="sort_order"
                type="number"
                name="sort_order"
                value={String(formData.sort_order)}
                onChange={handleChange}
                placeholder="0"
                disabled={isLoading}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="is_active"
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="is_active">Aktif</Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              variant="outline"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              variant="primary"
              loading={isLoading}
              loadingText="Menyimpan..."
            >
              {activityType ? 'Update' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
