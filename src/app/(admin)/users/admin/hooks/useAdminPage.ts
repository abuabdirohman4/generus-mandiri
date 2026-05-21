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
import { deleteAdmin } from '../actions'

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
    let result = (admins as any[]) || []
    
    if (filters.daerah.length > 0) {
      result = result.filter(a => a.daerah_id && filters.daerah.includes(a.daerah_id))
    }
    if (filters.desa.length > 0) {
      result = result.filter(a => a.desa_id && filters.desa.includes(a.desa_id))
    }
    if (filters.kelompok.length > 0) {
      result = result.filter(a => a.kelompok_id && filters.kelompok.includes(a.kelompok_id))
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
      return await deleteAdmin(arg)
    }
  )

  const handleDelete = useCallback(async () => {
    if (!deleteConfirm.admin) return
    
    try {
      const result = await deleteAdminMutation(deleteConfirm.admin.id)
      if (result.success) {
        toast.success('Admin berhasil dihapus')
        mutate()
        closeDeleteConfirm()
      } else {
        toast.error(result.message || 'Gagal menghapus admin')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus admin')
    }
  }, [deleteConfirm.admin, deleteAdminMutation, mutate, closeDeleteConfirm])

  const handleOrganisasiFilterChange = useCallback((organisasiFilters: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[] }) => {
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
