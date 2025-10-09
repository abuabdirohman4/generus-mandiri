'use client'

import { useState } from 'react'
import { useMeetings } from './hooks/useMeetings'
import ViewModeToggle, { ViewMode } from './components/ViewModeToggle'
import CreateMeetingModal from './components/CreateMeetingModal'
import MeetingList from './components/MeetingList'
import MeetingCards from './components/MeetingCards'
import MeetingChart from './components/MeetingChart'
import LoadingState from './components/LoadingState'

export default function AbsensiPage() {
  const { meetings, isLoading, error, mutate } = useMeetings()
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<any>(null)

  const handleCreateSuccess = () => {
    mutate() // Refresh meetings list
  }

  const handleEdit = (meeting: any) => {
    setEditingMeeting(meeting)
    // For now, just show the create modal with pre-filled data
    // In a real implementation, you'd have a separate edit modal
    setShowCreateModal(true)
  }

  const handleDelete = (meetingId: string) => {
    mutate() // Refresh meetings list
  }

  if (isLoading) {
    return <LoadingState />
  }

  if (error) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Terjadi kesalahan
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {error.message || 'Gagal memuat data pertemuan'}
            </p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Absensi
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kelola pertemuan dan kehadiran siswa
            </p>
          </div>

          {/* View Mode Toggle */}
          <ViewModeToggle
            currentMode={viewMode}
            onModeChange={setViewMode}
          />
        </div>

        {/* Content */}
        <div className="mb-8">
          {viewMode === 'list' && (
            <MeetingList
              meetings={meetings}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {viewMode === 'card' && (
            <MeetingCards
              meetings={meetings}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}

          {viewMode === 'chart' && (
            <MeetingChart
              meetings={meetings}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-20 md:bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50"
          title="Buat Pertemuan Baru"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Create Meeting Modal */}
        <CreateMeetingModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            setEditingMeeting(null)
          }}
          onSuccess={handleCreateSuccess}
        />
      </div>
    </div>
  )
}
