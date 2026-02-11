'use client'

import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'

interface DeleteStudentModalProps {
  isOpen: boolean
  onClose: () => void
  onSoftDelete: () => void
  onHardDelete: () => void
  studentId: string
  studentName: string
  hasAttendance: boolean
  isLoading?: boolean
  userProfile?: {
    id: string
    role: string
    permissions?: {
      can_soft_delete_students?: boolean
      can_hard_delete_students?: boolean
    }
  } | null
  studentDeletedAt?: string | null
}

export default function DeleteStudentModal({
  isOpen,
  onClose,
  onSoftDelete,
  onHardDelete,
  studentId,
  studentName,
  hasAttendance,
  isLoading = false,
  userProfile,
  studentDeletedAt
}: DeleteStudentModalProps) {
  // Check permissions
  const isSuperadmin = userProfile?.role === 'superadmin'
  const isAdmin = userProfile?.role === 'admin' || isSuperadmin
  const canSoftDelete = isAdmin || userProfile?.permissions?.can_soft_delete_students === true
  const canHardDelete = isSuperadmin // ONLY superadmin can hard delete

  // Check if student is already soft deleted
  const isAlreadySoftDeleted = !!studentDeletedAt
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md m-4">
      <div className="p-6">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/20">
          <svg 
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>

        {/* Content */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {isAlreadySoftDeleted ? 'Hapus Permanen Siswa' : 'Hapus Siswa'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Apakah Anda yakin ingin menghapus siswa <br /> <strong>"{studentName}"</strong>?
          </p>

          {/* Warning Box - Show different message based on state */}
          {isAlreadySoftDeleted ? (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>⚠️ PERINGATAN KERAS:</strong> Siswa ini sudah di-soft delete. Hapus permanen akan <strong>MENGHAPUS DATA SELAMANYA</strong> termasuk semua riwayat absensi. Tindakan ini <strong>TIDAK DAPAT DIBATALKAN</strong>.
              </p>
            </div>
          ) : hasAttendance ? (
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Peringatan:</strong> Siswa ini memiliki riwayat absensi. Gunakan <strong>Hapus (Data Tersimpan)</strong> untuk menjaga data historis.
              </p>
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Soft Delete - only if not already soft deleted */}
          {!isAlreadySoftDeleted && canSoftDelete && (
            <Button
              type="button"
              onClick={onSoftDelete}
              disabled={isLoading}
              loading={isLoading}
              loadingText="Memproses..."
              variant={canHardDelete ? 'outline' : 'danger'}
              className="w-full px-4 py-2"
            >
              Hapus (Data Tersimpan)
            </Button>
          )}

          {/* Hard Delete - ONLY for superadmin AND ONLY if already soft deleted */}
          {isAlreadySoftDeleted && canHardDelete && (
            <Button
              type="button"
              onClick={onHardDelete}
              disabled={isLoading}
              loading={isLoading}
              loadingText="Memproses..."
              variant="danger"
              className="w-full px-4 py-2"
            >
              Hapus Permanen ⚠️
            </Button>
          )}

          {/* Show message if no actions available */}
          {!canSoftDelete && !canHardDelete && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Anda tidak memiliki izin untuk menghapus siswa.
              </p>
            </div>
          )}

          <Button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            variant="outline"
            className="w-full px-4 py-2"
          >
            Batal
          </Button>
        </div>
      </div>
    </Modal>
  )
}

