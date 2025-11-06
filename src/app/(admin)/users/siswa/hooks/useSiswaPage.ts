'use client'

import { useCallback, useState, useMemo } from 'react'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'
import { useSiswaStore } from '../stores/siswaStore'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { createStudent, updateStudent, deleteStudent, type Student } from '../actions'

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

  // Students with conditional classId
  // For teachers, don't filter by classId - fetch all students and filter client-side
  // For admins, use selectedClassFilter
  const classId = userProfile?.role === 'teacher' 
    ? undefined  // Don't filter by classId for teachers
    : selectedClassFilter || undefined

  const { students, isLoading: studentsLoading, mutate: mutateStudents } = useStudents({
    classId,
    enabled: !!userProfile
  })

  // Combined loading state
  const loading = profileLoading || classesLoading || studentsLoading

  // CRUD Mutations
  const { trigger: createStudentMutation } = useSWRMutation(
    '/api/students',
    async (url, { arg }: { arg: FormData }) => {
      const result = await createStudent(arg)
      return result
    }
  )

  const { trigger: updateStudentMutation } = useSWRMutation(
    '/api/students',
    async (url, { arg }: { arg: { studentId: string; formData: FormData } }) => {
      const result = await updateStudent(arg.studentId, arg.formData)
      return result
    }
  )

  const { trigger: deleteStudentMutation } = useSWRMutation(
    '/api/students',
    async (url, { arg }: { arg: string }) => {
      const result = await deleteStudent(arg)
      return result
    }
  )

  // Handlers
  const handleCreateStudent = useCallback(async (formData: FormData) => {
    try {
      setSubmitting(true)
      await createStudentMutation(formData)
      await mutateStudents() // Await revalidation before closing
      toast.success('Siswa berhasil ditambahkan')
      closeModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error creating student:', error)
    } finally {
      setSubmitting(false)
    }
  }, [createStudentMutation, mutateStudents, closeModal, setSubmitting])

  const handleUpdateStudent = useCallback(async (formData: FormData) => {
    if (!selectedStudent) return

    try {
      setSubmitting(true)
      await updateStudentMutation({ studentId: selectedStudent.id, formData })
      await mutateStudents() // Await revalidation before closing
      toast.success('Siswa berhasil diupdate')
      closeModal()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error updating student:', error)
    } finally {
      setSubmitting(false)
    }
  }, [selectedStudent, updateStudentMutation, mutateStudents, closeModal, setSubmitting])

  const handleDeleteStudent = useCallback(async (studentId: string) => {
    try {
      await deleteStudentMutation(studentId)
      toast.success('Siswa berhasil dihapus')
      mutateStudents() // Revalidate students data
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Error deleting student:', error)
    }
  }, [deleteStudentMutation, mutateStudents])

  const handleSubmit = useCallback(async (formData: FormData) => {
    if (modalMode === 'create') {
      await handleCreateStudent(formData)
    } else {
      await handleUpdateStudent(formData)
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
  const handleDataFilterChange = useCallback((filters: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[]; gender?: string }) => {
    setDataFilters(filters)
  }, [setDataFilters])

  // Filter students based on data filters and teacher classes
  const filteredStudents = useMemo(() => {
    let result = students || []
    
    // For teachers, filter by their assigned classes (support multiple classes per student)
    if (userProfile?.role === 'teacher' && userProfile.classes?.length) {
      const teacherClassIds = userProfile.classes.map(c => c.id)
      result = result.filter(s => {
        // Check if student has at least one class that matches teacher's classes
        // Ensure classes is always an array
        const studentClasses = Array.isArray(s.classes) ? s.classes : []
        const studentClassIds = studentClasses.map(c => c.id)
        return studentClassIds.some(classId => teacherClassIds.includes(classId))
      })
    }
    
    // Apply data filters
    if (dataFilters.daerah.length > 0) {
      result = result.filter(s => s.daerah_id && dataFilters.daerah.includes(s.daerah_id))
    }
    if (dataFilters.desa.length > 0) {
      result = result.filter(s => s.desa_id && dataFilters.desa.includes(s.desa_id))
    }
    if (dataFilters.kelompok.length > 0) {
      result = result.filter(s => s.kelompok_id && dataFilters.kelompok.includes(s.kelompok_id))
    }
    // For teachers, skip kelas filter because backend already filtered by teacher's classes
    // The kelas filter is only for admin/superadmin to filter across all students
    if (dataFilters.kelas.length > 0 && userProfile?.role !== 'teacher') {
      // Support comma-separated class IDs from DataFilter
      // Filter by checking if student has at least one class in selected classes
      const selectedClassIds = dataFilters.kelas.flatMap(k => k.split(','))
      result = result.filter(s => {
        const studentClassIds = (s.classes || []).map(c => c.id)
        // Also check class_id for backward compatibility
        const allStudentClassIds = s.class_id ? [...studentClassIds, s.class_id] : studentClassIds
        return allStudentClassIds.some(classId => selectedClassIds.includes(classId))
      })
    }
    // Apply gender filter
    if (dataFilters.gender && dataFilters.gender !== '') {
      result = result.filter(s => s.gender === dataFilters.gender)
    }

    return result
  }, [students, dataFilters, userProfile])

  return {
    // State
    students: filteredStudents,
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
    handleDataFilterChange
  }
}
