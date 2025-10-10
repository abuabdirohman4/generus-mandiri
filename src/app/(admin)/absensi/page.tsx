'use client'

import { useState, useEffect } from 'react'
import { useMeetings } from './hooks/useMeetings'
import { useClasses } from '@/hooks/useClasses'
import { useUserProfile } from '@/stores/userProfileStore'
import ViewModeToggle, { ViewMode } from './components/ViewModeToggle'
import CreateMeetingModal from './components/CreateMeetingModal'
import MeetingList from './components/MeetingList'
import MeetingCards from './components/MeetingCards'
import MeetingChart from './components/MeetingChart'
import ClassFilter from '@/components/shared/ClassFilter'
import LoadingState from './components/LoadingState'
import Spinner from '@/components/ui/spinner/Spinner'
import Pagination from '@/components/ui/pagination/Pagination'

export default function AbsensiPage() {
  const { profile: userProfile } = useUserProfile()
  const { classes, isLoading: classesLoading } = useClasses()
  const [selectedClassFilter, setSelectedClassFilter] = useState('')
  
  // Determine classId based on user role
  const classId = userProfile?.role === 'teacher' 
    ? userProfile.classes?.[0]?.id || undefined
    : selectedClassFilter && selectedClassFilter.trim() !== '' ? selectedClassFilter : undefined

  const { 
    meetings, 
    currentPage,
    totalPages,
    goToPage,
    useDummyData,
    toggleDummyData,
    isDummy,
    isLoading, 
    error, 
    mutate 
  } = useMeetings(classId)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMeeting, setEditingMeeting] = useState<any>(null)

  // Track revalidating state
  const isRevalidating = isLoading && meetings.length > 0

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

  const handleClassFilterChange = (value: string) => {
    setSelectedClassFilter(value)
  }

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentPage])

  // Only show loading skeleton on initial load (when no data yet)
  const initialLoading = (isLoading && meetings.length === 0) || classesLoading

  if (initialLoading) {
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
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pengajian
              {userProfile?.role === 'teacher' && userProfile.classes?.[0]?.name && (
                <> {userProfile.classes[0].name}</>
              )}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Kelola pertemuan dan kehadiran siswa
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Toggle Dummy Data Button - Only show if isDummy is true */}
            {isDummy && (
              <button
                onClick={toggleDummyData}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                  useDummyData
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {useDummyData ? 'Dummy Data ON' : 'Dummy Data OFF'}
              </button>
            )}

            {/* View Mode Toggle */}
            <ViewModeToggle
              currentMode={viewMode}
              onModeChange={setViewMode}
            />
          </div>
        </div>

        {/* Class Filter */}
        <ClassFilter
          userProfile={userProfile}
          classes={classes}
          selectedClassFilter={selectedClassFilter}
          onClassFilterChange={handleClassFilterChange}
        />

        {/* Revalidating Overlay */}
        {isRevalidating && (
          <div className="fixed top-20 right-6 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
              <Spinner size={20} />
              <span className="text-sm text-gray-600 dark:text-gray-400">Memperbarui data...</span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="mb-8">
          {viewMode === 'list' && (
            <>
              <MeetingList
                meetings={meetings}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
              {!isLoading && totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  className="mt-6"
                />
              )}
            </>
          )}

          {viewMode === 'card' && (
            <>
              <MeetingCards
                meetings={meetings}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
              {!isLoading && totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  className="mt-6"
                />
              )}
            </>
          )}

          {viewMode === 'chart' && (
            <>
              <MeetingChart
                meetings={meetings}
                onEdit={handleEdit}
                onDelete={handleDelete}
                isLoading={isLoading}
              />
              {!isLoading && totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={goToPage}
                  className="mt-6"
                />
              )}
            </>
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
          classId={classId}
        />
      </div>
    </div>
  )
}
