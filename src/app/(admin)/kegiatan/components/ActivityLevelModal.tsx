'use client'

import { useState, useEffect } from 'react'
import { updateActivityLevel } from '../actions'
import { Modal } from '@/components/ui/modal'
import InputField from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import Button from '@/components/ui/button/Button'
import type { ActivityLevel } from '@/types/activityType'

interface ActivityLevelModalProps {
  isOpen: boolean
  onClose: () => void
  activityLevel?: ActivityLevel | null
  onSuccess: () => void
}

export default function ActivityLevelModal({
  isOpen,
  onClose,
  activityLevel,
  onSuccess,
}: ActivityLevelModalProps) {
  const [name, setName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (activityLevel) {
      setName(activityLevel.name)
    } else {
      setName('')
    }
    setError(undefined)
  }, [activityLevel, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activityLevel) return

    setIsLoading(true)
    setError(undefined)

    try {
      await updateActivityLevel(activityLevel.id, { name })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] m-4">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Edit Tingkat Kegiatan
        </h3>

        {error && (
          <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {activityLevel && (
              <div>
                <Label htmlFor="code">Kode</Label>
                <InputField
                  id="code"
                  type="text"
                  name="code"
                  value={activityLevel.code}
                  onChange={() => {}}
                  disabled={true}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Kode tidak dapat diubah
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="name">Nama</Label>
              <InputField
                id="name"
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Masukkan nama tingkat kegiatan"
                required
                disabled={isLoading}
              />
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
              Update
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
