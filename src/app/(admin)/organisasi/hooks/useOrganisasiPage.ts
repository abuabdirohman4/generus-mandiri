'use client'

import { useCallback } from 'react'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { useOrganisasiStore } from '../stores/organisasiStore'
import { deleteDaerah } from '../actions/daerah'
import { deleteDesa } from '../actions/desa'
import { deleteKelompok } from '../actions/kelompok'
import { toast } from 'sonner'

export function useOrganisasiPage() {
  const { daerah, isLoading: daerahLoading, error: daerahError, mutate: mutateDaerah } = useDaerah()
  const { desa, isLoading: desaLoading, error: desaError, mutate: mutateDesa } = useDesa()
  const { kelompok, isLoading: kelompokLoading, error: kelompokError, mutate: mutateKelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()
  
  const {
    activeTab,
    isModalOpen,
    editingItem,
    deleteConfirm,
    daerahFilter,
    desaFilter,
    setActiveTab,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    setDaerahFilter,
    setDesaFilter
  } = useOrganisasiStore()

  const isLoading = daerahLoading || desaLoading || kelompokLoading
  const error = daerahError || desaError || kelompokError

  const handleDelete = useCallback(async () => {
    try {
      switch (deleteConfirm.type) {
        case 'daerah':
          await deleteDaerah(deleteConfirm.item.id)
          mutateDaerah()
          toast.success('Daerah berhasil dihapus')
          break
        case 'desa':
          await deleteDesa(deleteConfirm.item.id)
          mutateDesa()
          toast.success('Desa berhasil dihapus')
          break
        case 'kelompok':
          await deleteKelompok(deleteConfirm.item.id)
          mutateKelompok()
          toast.success('Kelompok berhasil dihapus')
          break
      }
      closeDeleteConfirm()
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error(error instanceof Error ? error.message : 'Gagal menghapus data')
    }
  }, [deleteConfirm, mutateDaerah, mutateDesa, mutateKelompok, closeDeleteConfirm])

  const handleSuccess = useCallback(() => {
    switch (activeTab) {
      case 'daerah':
        mutateDaerah()
        break
      case 'desa':
        mutateDesa()
        break
      case 'kelompok':
        mutateKelompok()
        break
    }
    closeModal()
  }, [activeTab, mutateDaerah, mutateDesa, mutateKelompok, closeModal])

  const tabs = [
    { id: 'daerah', label: 'Daerah', count: daerah?.length || 0 },
    { id: 'desa', label: 'Desa', count: desa?.length || 0 },
    { id: 'kelompok', label: 'Kelompok', count: kelompok?.length || 0 }
  ]

  return {
    daerah,
    desa,
    kelompok,
    userProfile,
    isLoading,
    error,
    activeTab,
    isModalOpen,
    editingItem,
    deleteConfirm,
    daerahFilter,
    desaFilter,
    tabs,
    setActiveTab,
    openCreateModal,
    openEditModal,
    closeModal,
    openDeleteConfirm,
    closeDeleteConfirm,
    setDaerahFilter,
    setDesaFilter,
    handleDelete,
    handleSuccess
  }
}
