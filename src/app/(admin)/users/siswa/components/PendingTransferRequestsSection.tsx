'use client'

import { useState } from 'react'
import Button from '@/components/ui/button/Button'
import { toast } from 'sonner'

// Helper function to format relative time
function formatRelativeTime(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'baru saja'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} menit yang lalu`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam yang lalu`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} hari yang lalu`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} minggu yang lalu`

  return `${Math.floor(diffInSeconds / 2592000)} bulan yang lalu`
}

interface TransferRequest {
  id: string
  student_ids: string[]
  from_daerah_id: string
  from_desa_id: string
  from_kelompok_id: string
  to_daerah_id: string
  to_desa_id: string
  to_kelompok_id: string
  requested_at: string
  reason?: string
  notes?: string
  requester?: {
    full_name: string
  }
  students?: Array<{
    id: string
    full_name: string
  }>
}

interface PendingTransferRequestsSectionProps {
  requests: TransferRequest[]
  onApprove: (requestId: string, reviewNotes?: string) => Promise<void>
  onReject: (requestId: string, reviewNotes?: string) => Promise<void>
  onRefresh: () => void
  isLoading?: boolean
}

export default function PendingTransferRequestsSection({
  requests,
  onApprove,
  onReject,
  onRefresh,
  isLoading = false,
}: PendingTransferRequestsSectionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [processingId, setProcessingId] = useState<string | null>(null)

  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Tidak ada permintaan transfer pending
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Semua permintaan transfer sudah diproses
          </p>
        </div>
      </div>
    )
  }

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId)
    try {
      await onApprove(requestId, reviewNotes[requestId])
      toast.success('Transfer request disetujui')
      setReviewNotes((prev) => {
        const { [requestId]: _, ...rest } = prev
        return rest
      })
      onRefresh()
    } catch (error) {
      toast.error('Gagal menyetujui transfer request')
    } finally {
      setProcessingId(null)
    }
  }

  const handleReject = async (requestId: string) => {
    if (!reviewNotes[requestId]?.trim()) {
      toast.error('Catatan penolakan wajib diisi')
      return
    }

    setProcessingId(requestId)
    try {
      await onReject(requestId, reviewNotes[requestId])
      toast.success('Transfer request ditolak')
      setReviewNotes((prev) => {
        const { [requestId]: _, ...rest } = prev
        return rest
      })
      onRefresh()
    } catch (error) {
      toast.error('Gagal menolak transfer request')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white">
          Permintaan Transfer Pending ({requests.length})
        </h2>
        <Button onClick={onRefresh} variant="outline" size="sm" disabled={isLoading}>
          <svg
            className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Refresh
        </Button>
      </div>

      {requests.map((request) => (
        <div
          key={request.id}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                    Pending
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatRelativeTime(request.requested_at)}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {request.students?.length || 0} siswa akan ditransfer
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Oleh: {request.requester?.full_name || 'Unknown'}
                </p>
              </div>
              <button
                onClick={() => setExpandedId(expandedId === request.id ? null : request.id)}
                className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg
                  className={`w-5 h-5 transform transition-transform ${
                    expandedId === request.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Expanded Content */}
          {expandedId === request.id && (
            <div className="p-4 space-y-4">
              {/* Students List */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Daftar Siswa:
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded p-2">
                  {request.students?.map((student) => (
                    <div
                      key={student.id}
                      className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
                    >
                      <span>•</span>
                      <span>{student.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reason */}
              {request.reason && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Alasan:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2">
                    {request.reason}
                  </p>
                </div>
              )}

              {/* Notes */}
              {request.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Catatan:
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded p-2">
                    {request.notes}
                  </p>
                </div>
              )}

              {/* Review Notes Input */}
              <div>
                <label
                  htmlFor={`review-notes-${request.id}`}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Catatan Review
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    (wajib untuk penolakan)
                  </span>
                </label>
                <textarea
                  id={`review-notes-${request.id}`}
                  value={reviewNotes[request.id] || ''}
                  onChange={(e) =>
                    setReviewNotes((prev) => ({ ...prev, [request.id]: e.target.value }))
                  }
                  rows={2}
                  placeholder="Tambahkan catatan untuk requester..."
                  disabled={processingId === request.id}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={() => handleApprove(request.id)}
                  disabled={processingId === request.id}
                  loading={processingId === request.id}
                  variant="primary"
                  className="flex-1"
                >
                  Setujui
                </Button>
                <Button
                  onClick={() => handleReject(request.id)}
                  disabled={processingId === request.id}
                  loading={processingId === request.id}
                  variant="danger"
                  className="flex-1"
                >
                  Tolak
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
