'use client'

import Button from '@/components/ui/button/Button'
import SiswaSkeleton from '@/components/ui/skeleton/SiswaSkeleton'
import { StatsCards, ClassFilter, StudentModal, StudentsTable } from './components'
import { useSiswaPage } from './hooks'

export default function SiswaPage() {
  const {
    students,
    classes,
    userProfile,
    loading,
    showModal,
    modalMode,
    selectedStudent,
    selectedClassFilter,
    submitting,
    openCreateModal,
    handleEditStudent,
    handleDeleteStudent,
    handleSubmit,
    handleClassFilterChange,
    closeModal
  } = useSiswaPage()

  if (loading) {
    return <SiswaSkeleton />
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Siswa
                {userProfile?.role === 'teacher' && userProfile.class_name && (
                  <> {userProfile.class_name}</>
                )}
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Kelola data siswa
              </p>
            </div>
            <Button
              onClick={openCreateModal}
              className="px-4 py-2"
            >
              Tambah Siswa
            </Button>
          </div>
        </div>

        {/* Filter Section */}
        <ClassFilter
          userProfile={userProfile}
          classes={classes}
          selectedClassFilter={selectedClassFilter}
          onClassFilterChange={handleClassFilterChange}
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
        />

        {/* Modal Form */}
        <StudentModal
          isOpen={showModal}
          onClose={closeModal}
          mode={modalMode}
          student={selectedStudent}
          userProfile={userProfile}
          classes={classes}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </div>
    </div>
  )
}
