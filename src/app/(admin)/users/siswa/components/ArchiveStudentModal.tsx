'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'

interface ArchiveStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onArchive: (status: 'graduated' | 'inactive', notes?: string) => Promise<void>
  studentName: string
  isLoading?: boolean
}

export default function ArchiveStudentModal({
  isOpen,
  onClose,
  onArchive,
  studentName,
  isLoading = false,
}: ArchiveStudentModalProps) {
  const [status, setStatus] = useState<'graduated' | 'inactive'>('graduated')
  const [notes, setNotes] = useState('')

  const handleSubmit = async () => {
    await onArchive(status, notes || undefined)
    // Reset form
    setStatus('graduated')
    setNotes('')
  }

  const handleClose = () => {
    if (!isLoading) {
      setStatus('graduated')
      setNotes('')
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md m-4">
      <div className="p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 dark:bg-blue-900/20">
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2 text-center">
            Arsipkan Siswa
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
            Arsipkan siswa <strong>"{studentName}"</strong>
          </p>

          {/* Info Box */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 mb-4">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Catatan:</strong> Siswa yang diarsipkan akan disembunyikan
              dari daftar aktif, tetapi tetap muncul di laporan historis.
            </p>
          </div>

          {/* Status Selection */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="status" required>
                Status Arsip
              </Label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'graduated' | 'inactive')}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white disabled:opacity-50"
              >
                <option value="graduated">Lulus (Graduated)</option>
                <option value="inactive">Tidak Aktif (Inactive)</option>
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {status === 'graduated'
                  ? 'Gunakan untuk siswa yang telah menyelesaikan program'
                  : 'Gunakan untuk siswa yang pindah/cuti/tidak aktif'}
              </p>
            </div>

            <div>
              <Label htmlFor="notes">Catatan (Opsional)</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isLoading}
                rows={3}
                placeholder="Tambahkan catatan tentang arsip ini..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-1/2 px-4 py-2"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            loading={isLoading}
            loadingText="Mengarsipkan..."
            variant="primary"
            className="w-full sm:w-1/2 px-4 py-2"
          >
            Arsipkan
          </Button>
        </div>
      </div>
    </Modal>
  )
}
