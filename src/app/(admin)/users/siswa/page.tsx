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
  getAllOrganisationsForTransfer
} from './actions/management'
import type { Student } from './actions'
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

  // Permission checks for student management actions
  const canArchive = isAdmin || userProfile?.permissions?.can_archive_students === true
  const canTransfer = isAdmin || userProfile?.permissions?.can_transfer_students === true
  const canSoftDelete = isAdmin || userProfile?.permissions?.can_soft_delete_students === true

  // State for new modals
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedStudentsForAction, setSelectedStudentsForAction] = useState<Student[]>([])
  const [archiveLoading, setArchiveLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [pendingRequestsLoading, setPendingRequestsLoading] = useState(false)
  const [allOrganisations, setAllOrganisations] = useState<{
    daerah: any[]
    desa: any[]
    kelompok: any[]
  }>({ daerah: [], desa: [], kelompok: [] })
  const [studentsWithPendingTransfer, setStudentsWithPendingTransfer] = useState<Set<string>>(new Set())

  // Fetch pending transfer requests
  const fetchPendingRequests = useCallback(async () => {
    if (!isAdmin) return
    setPendingRequestsLoading(true)
    try {
      const result = await getPendingTransferRequests()
      if (result.success && result.requests) {
        setPendingRequests(result.requests)

        // Extract student IDs with pending transfers
        const studentIds = new Set<string>()
        result.requests.forEach(req => {
          if (req.student_ids && Array.isArray(req.student_ids)) {
            req.student_ids.forEach((id: string) => studentIds.add(id))
          }
        })
        setStudentsWithPendingTransfer(studentIds)
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error)
    } finally {
      setPendingRequestsLoading(false)
    }
  }, [isAdmin])

  // Fetch pending requests on mount (to show tab badge count)
  useEffect(() => {
    if (isAdmin) {
      fetchPendingRequests()
    }
  }, [isAdmin, fetchPendingRequests])

  // Refresh when tab becomes active
  useEffect(() => {
    if (activeTab === 'pending-transfers' && isAdmin) {
      fetchPendingRequests()
    }
  }, [activeTab, isAdmin, fetchPendingRequests])

  // Fetch ALL organisations for transfer modal (no user hierarchy filter)
  useEffect(() => {
    const fetchAllOrganisations = async () => {
      const result = await getAllOrganisationsForTransfer()
      if (result.success) {
        setAllOrganisations({
          daerah: result.daerah,
          desa: result.desa,
          kelompok: result.kelompok
        })
      }
    }

    // Only fetch when admin (since only admin can transfer)
    if (isAdmin) {
      fetchAllOrganisations()
    }
  }, [isAdmin])

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
            // Refresh pending requests to show tab
            await fetchPendingRequests()
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
    [handleBatchImportSuccess, fetchPendingRequests]
  )

  const handleUnarchive = useCallback(
    async (student: Student) => {
      try {
        const result = await unarchiveStudent(student.id)

        if (result.success) {
          toast.success('Siswa berhasil dikembalikan ke status aktif')
          handleBatchImportSuccess() // Refresh students
        } else {
          toast.error(result.error || 'Gagal mengembalikan siswa')
        }
      } catch (error) {
        toast.error('Terjadi kesalahan saat mengembalikan siswa')
        console.error('Unarchive error:', error)
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
      // Refresh pending requests after approve
      await fetchPendingRequests()
    },
    [fetchPendingRequests]
  )

  const handleRejectRequest = useCallback(
    async (requestId: string, reviewNotes?: string) => {
      const result = await rejectTransferRequest(requestId, reviewNotes)
      if (!result.success) {
        throw new Error(result.error || 'Failed to reject')
      }
      // Refresh pending requests after reject
      await fetchPendingRequests()
    },
    [fetchPendingRequests]
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
                {/* Show tab only when there are pending requests */}
                {pendingRequests.length > 0 && (
                  <button
                    onClick={() => handleTabChange('pending-transfers')}
                    className={`${
                      activeTab === 'pending-transfers'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2`}
                  >
                    Permintaan Transfer
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
                      {pendingRequests.length}
                    </span>
                  </button>
                )}
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
              showStatus={true}
              cascadeFilters={true}
            />

            {/* Stats Cards */}
            <StatsCards students={students.filter(s => {
              const status = dataFilters.status || 'active'
              const studentStatus = s.status || 'active' // Fallback to 'active' if undefined
              return status === 'all' || studentStatus === status
            })} userProfile={userProfile} />

            {/* Students Table */}
            <StudentsTable
              students={students.filter(s => {
                const status = dataFilters.status || 'active'
                const studentStatus = s.status || 'active' // Fallback to 'active' if undefined
                return status === 'all' || studentStatus === status
              })}
              userRole={userProfile?.role || null}
              onEdit={handleEditStudent}
              onDelete={handleDeleteStudent}
              onArchive={canArchive ? handleArchiveClick : undefined}
              onTransfer={canTransfer ? handleTransferClick : undefined}
              onUnarchive={canArchive ? handleUnarchive : undefined}
              userProfile={userProfile}
              classes={classes}
              studentsWithPendingTransfer={studentsWithPendingTransfer}
            />
          </>
        )}

        {/* Pending Transfers Tab (admin only) */}
        {activeTab === 'pending-transfers' && isAdmin && (
          <PendingTransferRequestsSection
            requests={pendingRequests}
            currentUserId={userProfile?.id || ''}
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
          studentName={selectedStudentsForAction[0]?.name || ''}
          isLoading={archiveLoading}
        />

        {/* Transfer Request Modal */}
        <TransferRequestModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onSubmit={handleTransferSubmit}
          selectedStudents={selectedStudentsForAction.map((s) => ({
            id: s.id,
            name: s.name,
            daerah_id: s.daerah_id || undefined,
            desa_id: s.desa_id || undefined,
            kelompok_id: s.kelompok_id || undefined,
            daerah_name: s.daerah_name,
            desa_name: s.desa_name,
            kelompok_name: s.kelompok_name
          }))}
          daerah={allOrganisations.daerah}
          desa={allOrganisations.desa}
          kelompok={allOrganisations.kelompok}
          classes={(classes || []).map((c) => ({
            ...c,
            kelompok_id: c.kelompok_id || undefined
          }))}
          userProfile={{
            role: userProfile?.role || '',
            daerah_id: userProfile?.daerah_id || undefined,
            desa_id: userProfile?.desa_id || undefined,
            kelompok_id: userProfile?.kelompok_id || undefined
          }}
          isLoading={transferLoading}
        />
      </div>
    </div>
  )
}
