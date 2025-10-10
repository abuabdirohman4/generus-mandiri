'use client'

import { useCallback } from 'react'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'
import { useSiswaStore } from '../stores/siswaStore'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
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
    openCreateModal,
    openEditModal,
    closeModal,
    setSelectedClassFilter,
    setSubmitting
  } = useSiswaStore()

  // User profile
  const { profile: userProfile, loading: profileLoading } = useUserProfile()

  // Classes
  const { classes, isLoading: classesLoading } = useClasses()

  // Students with conditional classId
  const classId = userProfile?.role === 'teacher' 
    ? userProfile.classes?.[0]?.id || undefined
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
      toast.success('Siswa berhasil ditambahkan')
      mutateStudents() // Revalidate students data
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
      toast.success('Siswa berhasil diupdate')
      mutateStudents() // Revalidate students data
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

  return {
    // State
    students,
    classes,
    userProfile,
    loading,
    showModal,
    modalMode,
    selectedStudent,
    selectedClassFilter,
    submitting,
    
    // Actions
    openCreateModal,
    handleEditStudent,
    handleDeleteStudent,
    handleSubmit,
    handleClassFilterChange,
    closeModal
  }
}
