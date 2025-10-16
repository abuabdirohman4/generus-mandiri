'use client'

import { useState, useEffect, useMemo } from 'react'
import { useMeetings } from './hooks/useMeetings'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { useAbsensiUIStore } from '@/stores/absensiUIStore'
import ViewModeToggle, { ViewMode } from './components/ViewModeToggle'
import CreateMeetingModal from './components/CreateMeetingModal'
import MeetingList from './components/MeetingList'
import MeetingCards from './components/MeetingCards'
import MeetingChart from './components/MeetingChart'
import DataFilter from '@/components/shared/DataFilter'
import LoadingState from './components/LoadingState'
import Spinner from '@/components/ui/spinner/Spinner'
import Pagination from '@/components/ui/pagination/Pagination'

export default function AbsensiPage() {
  const { profile: userProfile } = useUserProfile()
  const { classes, isLoading: classesLoading } = useClasses()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  
  // Get UI state from Zustand store
  const {
    viewMode,
    setViewMode,
    selectedClassFilter,
    setSelectedClassFilter,
    dataFilters,
    setDataFilters,
    showCreateModal,
    setShowCreateModal,
    editingMeeting,
    setEditingMeeting
  } = useAbsensiUIStore()
  
  // Calculate valid class IDs based on organisasi filters
  const validClassIds = useMemo(() => {
    if (userProfile?.role === 'teacher') {
      return userProfile.classes?.map(c => c.id) || []
    }
    
    let filtered = classes || []
    
    // Filter by organisasi hierarchy
    if (dataFilters.daerah) {
      // Get desa IDs in selected daerah
      const desaInDaerah = (desa || []).filter(d => d.daerah_id === dataFilters.daerah)
      const desaIds = desaInDaerah.map(d => d.id)
      
      // Get kelompok IDs in those desas
      const kelompokInDesa = (kelompok || []).filter(k => desaIds.includes(k.desa_id))
      const kelompokIds = kelompokInDesa.map(k => k.id)
      
      // Filter classes by those kelompoks
      filtered = filtered.filter(c => c.kelompok_id && kelompokIds.includes(c.kelompok_id))
    }
    
    if (dataFilters.desa) {
      // Get kelompok IDs in selected desa
      const kelompokInDesa = (kelompok || []).filter(k => k.desa_id === dataFilters.desa)
      const kelompokIds = kelompokInDesa.map(k => k.id)
      
      // Filter classes by those kelompoks
      filtered = filtered.filter(c => c.kelompok_id && kelompokIds.includes(c.kelompok_id))
    }
    
    if (dataFilters.kelompok) {
      // Filter classes by selected kelompok
      filtered = filtered.filter(c => c.kelompok_id === dataFilters.kelompok)
    }
    
    if (dataFilters.kelas) {
      // Specific class selected
      filtered = filtered.filter(c => c.id === dataFilters.kelas)
    }
    
    return filtered.map(c => c.id)
  }, [classes, desa, kelompok, dataFilters, userProfile])

  // Determine classId based on user role and filters
  const classId = useMemo(() => {
    if (userProfile?.role === 'teacher') {
      return userProfile.classes?.[0]?.id || undefined
    }
    
    // If specific class is selected, use that
    if (dataFilters.kelas && dataFilters.kelas.trim() !== '') {
      return dataFilters.kelas
    }
    
    // If "Semua Kelas" is selected (no specific class), return undefined
    // This will fetch all meetings, and we'll filter them client-side
    return undefined
  }, [userProfile, dataFilters.kelas])

  const { 
    meetings: allMeetings, 
    currentPage,
    totalPages,
    goToPage,
    isLoading, 
    error, 
    mutate 
  } = useMeetings(classId)

  // Filter meetings based on valid class IDs when "Semua Kelas" is selected
  const meetings = useMemo(() => {
    if (userProfile?.role === 'teacher') {
      return allMeetings || []
    }
    
    // If specific class is selected, return all meetings (already filtered by backend)
    if (dataFilters.kelas && dataFilters.kelas.trim() !== '') {
      return allMeetings || []
    }
    
    // If "Semua Kelas" is selected, filter by valid class IDs
    if (validClassIds.length > 0) {
      return (allMeetings || []).filter(meeting => {
        // Handle the actual database structure: meeting.classes is a single object
        if (meeting.classes && typeof meeting.classes === 'object') {
          // If classes is a single object with id
          if ('id' in meeting.classes) {
            return validClassIds.includes(meeting.classes.id)
          }
        }
        
        // Fallback: check class_id directly
        if (meeting.class_id && validClassIds.includes(meeting.class_id)) {
          return true
        }
        
        return false
      })
    }
    
    // If no valid classes found, return empty array
    return []
  }, [allMeetings, validClassIds, dataFilters.kelas, userProfile])

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
        {/* Dummy Data Indicator */}
        {process.env.NEXT_PUBLIC_USE_DUMMY_DATA === 'true' && (
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>Mode Dummy Data:</strong> Data yang ditampilkan adalah data dummy untuk keperluan pengembangan.
                </p>
              </div>
            </div>
          </div>
        )}

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
            {/* View Mode Toggle */}
            <ViewModeToggle />
          </div>
        </div>

        {/* Filters */}
        <DataFilter
          filters={dataFilters}
          onFilterChange={setDataFilters}
          userProfile={userProfile}
          daerahList={daerah || []}
          desaList={desa || []}
          kelompokList={kelompok || []}
          classList={classes || []}
          showKelas={true}
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
