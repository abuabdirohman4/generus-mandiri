'use client'

import Button from '@/components/ui/button/Button'
import SiswaSkeleton from '@/components/ui/skeleton/SiswaSkeleton'
import DataFilter from '@/components/shared/DataFilter'
import { StatsCards, StudentModal, StudentsTable, BatchImportModal, AssignStudentsModal } from './components'
import { useSiswaPage } from './hooks'
import { useAssignStudentsStore } from './stores/assignStudentsStore'

export default function SiswaPage() {
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
  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'superadmin';

  if (loading) {
    return <SiswaSkeleton />
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 sm:pb-0 sm:px-6 lg:px-8">
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
          userProfile={userProfile}
          classes={classes}
        />

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
      </div>
    </div>
  )
}
