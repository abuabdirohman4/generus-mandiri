'use client'

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Button from '@/components/ui/button/Button'
import SiswaSkeleton from '@/components/ui/skeleton/SiswaSkeleton'
import DataFilter from '@/components/shared/DataFilter'
import { StatsCards, StudentModal, StudentsTable, BatchImportModal, AssignStudentsModal } from './components'
import ArchiveStudentModal from './components/ArchiveStudentModal'
import TransferRequestModal from './components/TransferRequestModal'
import PendingTransferRequestsSection from './components/PendingTransferRequestsSection'
import { useSiswaPage } from './hooks'
import { useAssignStudentsStore } from './stores/assignStudentsStore'
import {
  archiveStudent,
  unarchiveStudent,
  createTransferRequest,
  approveTransferRequest,
  rejectTransferRequest,
  getPendingTransferRequests,
  type Student
} from './actions/management'
import { toast } from 'sonner'

export default function SiswaPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = searchParams.get('tab') || 'students'

  const {
    students,
    classes,
    daerah,
    desa,
    kelompok,
    userProfile,
    loading,
    showModal,
    modalMode,
    selectedStudent,
    selectedClassFilter,
    submitting,
    showBatchModal,
    dataFilters,
    openCreateModal,
    handleEditStudent,
    handleDeleteStudent,
    handleSubmit,
    handleClassFilterChange,
    closeModal,
    openBatchModal,
    closeBatchModal,
    handleBatchImportSuccess,
    handleDataFilterChange
  } = useSiswaPage()

  const { showModal: showAssignModal, openModal: openAssignModal, closeModal: closeAssignModal } = useAssignStudentsStore()
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin'

  // State for new modals
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedStudentsForAction, setSelectedStudentsForAction] = useState<Student[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false)

  // Fetch pending transfer requests
  const fetchPendingRequests = useCallback(async () => {
    if (!isAdmin) return
    setPendingRequestsLoading(true)
    try {
      const result = await getPendingTransferRequests()
      if (result.success && result.requests) {
        setPendingRequests(result.requests)
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error)
    } finally {
      setPendingRequestsLoading(false)
    }
  }, [isAdmin])

  // Fetch on mount and when tab changes to pending-transfers
  useEffect(() => {
    if (activeTab === 'pending-transfers' && isAdmin) {
      fetchPendingRequests()
    }
  }, [activeTab, isAdmin, fetchPendingRequests])

  // Handlers for new actions
  const handleArchiveClick = useCallback((student: Student) => {
    setSelectedStudentsForAction([student])
    setShowArchiveModal(true)
  }, [])

  const handleTransferClick = useCallback((students: Student[]) => {
    setSelectedStudentsForAction(students)
    setShowTransferModal(true)
  }, [])

  const handleArchiveSubmit = useCallback(
    async (status: 'graduated' | 'inactive', notes?: string) => {
      if (selectedStudentsForAction.length === 0) return

      setArchiveLoading(true)
      try {
        const student = selectedStudentsForAction[0]
        const result = await archiveStudent({
          studentId: student.id,
          status,
          notes
        })

        if (result.success) {
          toast.success(`Siswa berhasil diarsipkan sebagai ${status === 'graduated' ? 'Lulus' : 'Tidak Aktif'}`)
          setShowArchiveModal(false)
          handleBatchImportSuccess() // Refresh students
        } else {
          toast.error(result.error || 'Gagal mengarsipkan siswa')
        }
      } catch (error) {
        toast.error('Terjadi kesalahan saat mengarsipkan siswa')
        console.error('Archive error:', error)
      } finally {
        setArchiveLoading(false)
      }
    },
    [selectedStudentsForAction, handleBatchImportSuccess]
  )

  const handleTransferSubmit = useCallback(
    async (data: {
      studentIds: string[]
      toDaerahId: string
      toDesaId: string
      toKelompokId: string
      toClassIds?: string[]
      reason?: string
      notes?: string
    }) => {
      setTransferLoading(true)
      try {
        const result = await createTransferRequest({
          studentIds: data.studentIds,
          toDaerahId: data.toDaerahId,
          toDesaId: data.toDesaId,
          toKelompokId: data.toKelompokId,
          toClassIds: data.toClassIds,
          reason: data.reason,
          notes: data.notes
        })

        if (result.success) {
          if (result.autoApproved) {
            toast.success('Transfer berhasil dilakukan (auto-approved)')
          } else {
            toast.success('Permintaan transfer berhasil dibuat')
          }
          setShowTransferModal(false)
          handleBatchImportSuccess() // Refresh students
          return { success: true, autoApproved: result.autoApproved }
        } else {
          toast.error(result.error || 'Gagal membuat permintaan transfer')
          return { success: false, error: result.error }
        }
      } catch (error) {
        toast.error('Terjadi kesalahan saat membuat permintaan transfer')
        console.error('Transfer error:', error)
        return { success: false, error: 'Unexpected error' }
      } finally {
        setTransferLoading(false)
      }
    },
    [handleBatchImportSuccess]
  )

  const handleApproveRequest = useCallback(
    async (requestId: string, reviewNotes?: string) => {
      const result = await approveTransferRequest(requestId, reviewNotes)
      if (!result.success) {
        throw new Error(result.error || 'Failed to approve')
      }
    },
    []
  )

  const handleRejectRequest = useCallback(
    async (requestId: string, reviewNotes?: string) => {
      const result = await rejectTransferRequest(requestId, reviewNotes)
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject')
      }
    },
    []
  )

  const handleTabChange = useCallback(
    (tab: string) => {
      router.push(`/users/siswa?tab=${tab}`)
    },
    [router]
  )

  if (loading) {
    return <SiswaSkeleton />
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {userProfile?.role === 'teacher' && userProfile.classes?.length === 1 && userProfile.classes[0]?.name ? (
                  <> {userProfile.classes[0].name}</>
                ) : (
                  'Siswa'
                )}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Kelola data siswa
              </p>
            </div>
            <div className="flex flex-col md:flex-row gap-2">
              {isAdmin ? (
                <>
                  <Button
                    onClick={openCreateModal}
                    className="px-4 py-2 w-full"
                  >
                    Tambah
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      onClick={openBatchModal}
                      variant="outline"
                      className="px-4 py-2 flex-1"
                    >
                      Batch
                    </Button>
                    <Button
                      onClick={openAssignModal}
                      variant="outline"
                      className="px-4 py-2 flex-1"
                    >
                      Assign
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={openCreateModal}
                    className="px-4 py-2"
                  >
                    Tambah
                  </Button>
                  <Button
                    onClick={openBatchModal}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    Batch
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs (only for admin) */}
        {isAdmin && (
          <div className="mb-6">
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabChange('students')}
                  className={`${
                    activeTab === 'students'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
                >
                  Siswa
                </button>
                <button
                  onClick={() => handleTabChange('pending-transfers')}
                  className={`${
                    activeTab === 'pending-transfers'
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                >
                  Permintaan Transfer
                  {pendingRequests.length > 0 && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <>
            {/* Filter Section */}
            <DataFilter
              filters={dataFilters}
              onFilterChange={handleDataFilterChange}
              userProfile={userProfile}
              daerahList={daerah || []}
              desaList={desa || []}
              kelompokList={kelompok || []}
              classList={classes || []}
              showKelas={true}
              showGender={true}
              cascadeFilters={false}
            />

            {/* Stats Cards */}
            <StatsCards students={students} userProfile={userProfile} />

            {/* Students Table */}
            <StudentsTable
              students={students}
              userRole={userProfile?.role || null}
              onEdit={handleEditStudent}
              onDelete={handleDeleteStudent}
              onArchive={isAdmin ? handleArchiveClick : undefined}
              onTransfer={isAdmin ? handleTransferClick : undefined}
              userProfile={userProfile}
              classes={classes}
            />
          </>
        )}

        {/* Pending Transfers Tab (admin only) */}
        {activeTab === 'pending-transfers' && isAdmin && (
          <PendingTransferRequestsSection
            requests={pendingRequests}
            onApprove={handleApproveRequest}
            onReject={handleRejectRequest}
            onRefresh={fetchPendingRequests}
            isLoading={pendingRequestsLoading}
          />
        )}

        {/* Modal Form */}
        <StudentModal
          isOpen={showModal}
          onClose={closeModal}
          mode={modalMode}
          student={selectedStudent}
          userProfile={userProfile}
          classes={classes}
          daerah={daerah}
          desa={desa}
          kelompok={kelompok}
          onSubmit={handleSubmit}
          submitting={submitting}
        />

        {/* Batch Import Modal */}
        <BatchImportModal
          isOpen={showBatchModal}
          onClose={closeBatchModal}
          onSuccess={handleBatchImportSuccess}
        />

        {/* Assign Students Modal */}
        <AssignStudentsModal
          isOpen={showAssignModal}
          onClose={closeAssignModal}
          onSuccess={handleBatchImportSuccess}
        />

        {/* Archive Student Modal */}
        <ArchiveStudentModal
          isOpen={showArchiveModal}
          onClose={() => setShowArchiveModal(false)}
          onArchive={handleArchiveSubmit}
          studentName={selectedStudentsForAction[0]?.full_name || ''}
          isLoading={archiveLoading}
        />

        {/* Transfer Request Modal */}
        <TransferRequestModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSubmit={handleTransferSubmit}
          selectedStudents={selectedStudentsForAction.map((s) => ({
            id: s.id,
            name: s.full_name,
            daerah_id: s.daerah_id,
            desa_id: s.desa_id,
            kelompok_id: s.kelompok_id,
            daerah_name: s.daerah?.name,
            desa_name: s.desa?.name,
            kelompok_name: s.kelompok?.name
          }))}
          daerah={daerah || []}
          desa={desa || []}
          kelompok={kelompok || []}
          classes={classes || []}
          userProfile={{
            role: userProfile?.role || '',
            daerah_id: userProfile?.daerah_id,
            desa_id: userProfile?.desa_id,
            kelompok_id: userProfile?.kelompok_id
          }}
          isLoading={transferLoading}
        />
      </div>
    </div>
  )
}
