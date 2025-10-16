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
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openResetPasswordModal,
    closeResetPasswordModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    setFilters
  } = useGuruStore()

  // Filter teachers
  const filteredTeachers = useMemo(() => {
    let result = teachers || []
    
    if (filters.daerah) {
      result = result.filter(t => t.daerah_id === filters.daerah)
    }
    if (filters.desa) {
      result = result.filter(t => t.desa_id === filters.desa)
    }
    if (filters.kelompok) {
      result = result.filter(t => t.kelompok_id === filters.kelompok)
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
  const { trigger: deleteGuruMutation } = useSWRMutation(
    '/api/guru',
    async (url, { arg }: { arg: string }) => {
      const { deleteTeacher } = await import('../actions')
      return await deleteTeacher(arg)
    }
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm.guru) return
    
    try {
      await deleteGuruMutation(deleteConfirm.guru.id)
      toast.success('Guru berhasil dihapus')
      mutate()
      closeDeleteConfirm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus guru')
    }
  }, [deleteConfirm.guru, deleteGuruMutation, mutate, closeDeleteConfirm])

  const handleOrganisasiFilterChange = useCallback((organisasiFilters: { daerah: string; desa: string; kelompok: string }) => {
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
    filters,
    openCreateModal,
    openEditModal,
    closeModal,
    openResetPasswordModal,
    closeResetPasswordModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    handleDelete,
    handleOrganisasiFilterChange,
    mutate
  }
}
