'use client'

import { useCallback, useMemo } from 'react'
import { useTeachers } from '@/hooks/useTeachers'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { useGuruStore } from '../stores/guruStore'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'
import { deleteTeacher, getTeacherDeleteImpact } from '../actions'
import { isAdminKelompok, isAdminDesa, isAdminDaerah } from '@/lib/userUtils'

export function useGuruPage() {
  const { teachers, isLoading, error, mutate } = useTeachers()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()
  
  const {
    isModalOpen,
    editingGuru,
    resetPasswordModal,
    deleteConfirm,
    formSettingsModal,
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openResetPasswordModal,
    closeResetPasswordModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    setDeleteImpact,
    openFormSettingsModal,
    closeFormSettingsModal,
    setFilters
  } = useGuruStore()

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    let result = (teachers as any[]) || []
    
    if (filters.daerah.length > 0) {
      result = result.filter(t => t.daerah_id && filters.daerah.includes(t.daerah_id))
    }
    if (filters.desa.length > 0) {
      result = result.filter(t => t.desa_id && filters.desa.includes(t.desa_id))
    }
    if (filters.kelompok.length > 0) {
      result = result.filter(t => t.kelompok_id && filters.kelompok.includes(t.kelompok_id))
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      result = result.filter(t =>
        t.username?.toLowerCase().includes(searchTerm) ||
        t.full_name?.toLowerCase().includes(searchTerm) ||
        t.email?.toLowerCase().includes(searchTerm)
      )
    }
    
    return result
  }, [teachers, filters])

  // Delete mutation
  const { trigger: deleteTeacherMutation } = useSWRMutation(
    '/api/guru',
    async (url, { arg }: { arg: string }) => {
      return await deleteTeacher(arg)
    }
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm.guru) return
    
    try {
      const result = await deleteTeacherMutation(deleteConfirm.guru.id)
      if (result.success) {
        toast.success('Guru berhasil dihapus')
        mutate()
        closeDeleteConfirm()
      } else {
        toast.error(result.message || 'Gagal menghapus guru')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus guru')
    }
  }, [deleteConfirm.guru, deleteTeacherMutation, mutate, closeDeleteConfirm])

  const handleShowDeleteConfirm = useCallback(async (guru: any) => {
    openDeleteConfirm(guru)
    setDeleteImpact(null, true)

    try {
      const result = await getTeacherDeleteImpact(guru.id)
      if (result.success) {
        setDeleteImpact(result.data || null, false)
      } else {
        toast.error(result.message || 'Gagal memuat dampak penghapusan')
        setDeleteImpact(null, false)
      }
    } catch {
      setDeleteImpact(null, false)
    }
  }, [openDeleteConfirm, setDeleteImpact])

  const handleOrganisasiFilterChange = useCallback((organisasiFilters: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[] }) => {
    setFilters(organisasiFilters)
  }, [setFilters])

  return {
    teachers: filteredTeachers,
    daerah,
    desa,
    kelompok,
    userProfile,
    isLoading,
    error,
    isModalOpen,
    editingGuru,
    resetPasswordModal,
    deleteConfirm,
    formSettingsModal,
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openResetPasswordModal,
    closeResetPasswordModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    openFormSettingsModal,
    closeFormSettingsModal,
    handleShowDeleteConfirm,
    handleDelete,
    handleOrganisasiFilterChange,
    mutate
  }
}
