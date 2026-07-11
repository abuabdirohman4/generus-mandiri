'use client'

import { useCallback, useState, useMemo } from 'react'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'
import { useSiswaStore } from '../stores/siswaStore'
import { useStudents, useStudentsPaginated, type UseStudentsPaginatedOptions } from '@/hooks/useStudents'
import { useDebounce } from '@/hooks/useDebounce'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { createStudent, updateStudent, deleteStudent } from '../actions'
import type { PaginatedStudentRow as Student } from '@/types/student'

export function useSiswaPage() {
  // Zustand store
  const {
    showModal,
    modalMode,
    selectedStudent,
    selectedClassFilter,
    submitting,
    showBatchModal,
    dataFilters,
    openCreateModal,
    openEditModal,
    closeModal,
    openBatchModal,
    closeBatchModal,
    setSelectedClassFilter,
    setDataFilters,
    setSubmitting
  } = useSiswaStore()

  // User profile
  const { profile: userProfile, loading: profileLoading } = useUserProfile()

  // Classes
  const { classes, isLoading: classesLoading } = useClasses()

  // Organisasi data
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  // Combined filters for paginated query
  const paginationParams = useMemo(() => {
    const filters: UseStudentsPaginatedOptions['filters'] = {
      daerah: dataFilters.daerah.length > 0 ? dataFilters.daerah : undefined,
      desa: dataFilters.desa.length > 0 ? dataFilters.desa : undefined,
      kelompok: dataFilters.kelompok.length > 0 ? dataFilters.kelompok : undefined,
      gender: dataFilters.gender || undefined,
      status: dataFilters.status || undefined,
    }

    // Process kelas filter logic
    if (dataFilters.kelas.length > 0) {
      filters.kelas = dataFilters.kelas.flatMap(k => k.split(','))
    } else if (selectedClassFilter) {
      filters.kelas = [selectedClassFilter]
    }

    return {
      page,
      pageSize,
      search: debouncedSearch,
      filters
    }
  }, [page, pageSize, debouncedSearch, dataFilters, selectedClassFilter])

  const { data: paginatedData, isLoading: studentsLoading, mutate: mutateStudents } = useStudentsPaginated({
    ...paginationParams,
    enabled: !!userProfile
  })

  // Combined loading state
  const loading = profileLoading || classesLoading || studentsLoading

  // CRUD Mutations
  const { trigger: createStudentMutation } = useSWRMutation(
    '/api/students/create',
    async (url, { arg }: { arg: FormData }) => {
      const result = await createStudent(arg)
      return result
    }
  )

  const { trigger: updateStudentMutation } = useSWRMutation(
    '/api/students/update',
    async (url, { arg }: { arg: { studentId: string; formData: FormData } }) => {
      const result = await updateStudent(arg.studentId, arg.formData)
      return result
    }
  )

  const { trigger: deleteStudentMutation } = useSWRMutation(
    '/api/students/delete',
    async (url, { arg }: { arg: { studentId: string; permanent: boolean } }) => {
      const result = await deleteStudent(arg.studentId, arg.permanent)
      return result
    }
  )

  // Handlers
  const handleCreateStudent = useCallback(async (formData: FormData): Promise<boolean> => {
    try {
      setSubmitting(true)
      const result = await createStudentMutation(formData)
      if (result && !result.success) {
        toast.error(result.message || 'Gagal menambahkan siswa')
        return false
      }
      await mutateStudents()
      toast.success('Siswa berhasil ditambahkan')
      closeModal()
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error creating student:', error)
      return false
    } finally {
      setSubmitting(false)
    }
  }, [createStudentMutation, mutateStudents, closeModal, setSubmitting])

  const handleUpdateStudent = useCallback(async (formData: FormData): Promise<boolean> => {
    if (!selectedStudent) return false

    try {
      setSubmitting(true)
      const result = await updateStudentMutation({ studentId: selectedStudent.id, formData })
      if (result && !result.success) {
        toast.error(result.message || 'Gagal mengupdate siswa')
        return false
      }
      await mutateStudents()
      toast.success('Siswa berhasil diupdate')
      closeModal()
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error updating student:', error)
      return false
    } finally {
      setSubmitting(false)
    }
  }, [selectedStudent, updateStudentMutation, mutateStudents, closeModal, setSubmitting])

  const handleDeleteStudent = useCallback(async (studentId: string, permanent: boolean = false) => {
    try {
      const result = await deleteStudentMutation({ studentId, permanent })
      
      // Handle return value from deleteStudent
      if (result && !result.success) {
        // Error case - show error message
        toast.error(result.error || 'Gagal menghapus siswa')
        return
      }
      
      // Success case
      const message = permanent 
        ? 'Siswa berhasil dihapus permanen' 
        : 'Siswa berhasil dihapus (data tersimpan)'
      toast.success(message)
      mutateStudents() // Revalidate students data
    } catch (error) {
      // Fallback for unexpected errors
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error deleting student:', error)
    }
  }, [deleteStudentMutation, mutateStudents])

  const handleSubmit = useCallback(async (formData: FormData): Promise<boolean> => {
    if (modalMode === 'create') {
      return handleCreateStudent(formData)
    } else {
      return handleUpdateStudent(formData)
    }
  }, [modalMode, handleCreateStudent, handleUpdateStudent])

  const handleEditStudent = useCallback((student: Student) => {
    openEditModal(student)
  }, [openEditModal])

  const handleClassFilterChange = useCallback((classId: string) => {
    setSelectedClassFilter(classId)
  }, [setSelectedClassFilter])

  const handleBatchImportSuccess = useCallback(async () => {
    // Refresh students data after successful batch import
    await mutateStudents()
  }, [mutateStudents])

  // Data filter handler
  const handleDataFilterChange = useCallback((filters: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[]; gender?: string; status?: string }) => {
    setDataFilters(filters)
    setPage(1) // Reset to first page when filter changes
  }, [setDataFilters])

  // Filter students based on data filters and teacher classes
  // Note: filteredStudents is now server-side paginated directly.
  // The rows returned from getStudentsPaginated are already filtered and scoped.
  const filteredStudents = paginatedData.rows || []
  const totalCount = paginatedData.totalCount || 0

  return {
    // State
    students: filteredStudents,
    totalCount,
    page,
    pageSize,
    search,
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
    
    // Actions
    openCreateModal,
    handleEditStudent,
    handleDeleteStudent,
    handleSubmit,
    handleClassFilterChange,
    closeModal,
    openBatchModal,
    closeBatchModal,
    handleBatchImportSuccess,
    handleDataFilterChange,
    setPage,
    setPageSize,
    setSearch
  }
}
