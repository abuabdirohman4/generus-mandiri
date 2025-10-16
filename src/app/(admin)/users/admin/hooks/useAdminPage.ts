'use client'

import { useCallback, useMemo } from 'react'
import { useAdmins } from '@/hooks/useAdmins'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { useAdminStore } from '../stores/adminStore'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'

export function useAdminPage() {
  const { admins, isLoading, error, mutate } = useAdmins()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()
  
  const {
    isModalOpen,
    editingAdmin,
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
  } = useAdminStore()

  // Filter admins
  const filteredAdmins = useMemo(() => {
    let result = admins || []
    
    if (filters.daerah) {
      result = result.filter(a => a.daerah_id === filters.daerah)
    }
    if (filters.desa) {
      result = result.filter(a => a.desa_id === filters.desa)
    }
    if (filters.kelompok) {
      result = result.filter(a => a.kelompok_id === filters.kelompok)
    }
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      result = result.filter(a =>
        a.username?.toLowerCase().includes(searchTerm) ||
        a.full_name?.toLowerCase().includes(searchTerm) ||
        a.email?.toLowerCase().includes(searchTerm)
      )
    }
    
    return result
  }, [admins, filters])

  // Delete mutation
  const { trigger: deleteAdminMutation } = useSWRMutation(
    '/api/admin',
    async (url, { arg }: { arg: string }) => {
      const { deleteAdmin } = await import('../actions')
      return await deleteAdmin(arg)
    }
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm.admin) return
    
    try {
      await deleteAdminMutation(deleteConfirm.admin.id)
      toast.success('Admin berhasil dihapus')
      mutate()
      closeDeleteConfirm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus admin')
    }
  }, [deleteConfirm.admin, deleteAdminMutation, mutate, closeDeleteConfirm])

  const handleOrganisasiFilterChange = useCallback((organisasiFilters: { daerah: string; desa: string; kelompok: string }) => {
    setFilters(organisasiFilters)
  }, [setFilters])

  return {
    admins: filteredAdmins,
    daerah,
    desa,
    kelompok,
    userProfile,
    isLoading,
    error,
    isModalOpen,
    editingAdmin,
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
