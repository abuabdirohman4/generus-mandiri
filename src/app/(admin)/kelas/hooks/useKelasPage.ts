'use client'

import { useMemo } from 'react'
import { useKelas } from '@/hooks/useKelas'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { useKelasStore } from '../stores/kelasStore'

export function useKelasPage() {
  const { kelas, isLoading, error, mutate } = useKelas()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()
  
  const {
    isKelompokModalOpen,
    editingClass,
    deleteKelompokConfirm,
    filters,
    openCreateKelompokModal,
    openEditKelompokModal,
    closeKelompokModal,
    openDeleteKelompokConfirm,
    closeDeleteKelompokConfirm,
    setFilters
  } = useKelasStore()

  // Filter classes based on selected organisasi
  const filteredClasses = useMemo(() => {
    let result = kelas || []
    
    if (filters.kelompok) {
      result = result.filter(c => c.kelompok_id === filters.kelompok)
    }
    if (filters.desa) {
      result = result.filter(c => c.kelompok?.desa_id === filters.desa)
    }
    if (filters.daerah) {
      result = result.filter(c => c.kelompok?.desa?.daerah_id === filters.daerah)
    }
    
    return result
  }, [kelas, filters])

  return {
    classes: filteredClasses,
    isLoading,
    error,
    mutate,
    userProfile,
    daerah,
    desa,
    kelompok,
    isModalOpen: isKelompokModalOpen,
    editingClass,
    deleteConfirm: deleteKelompokConfirm,
    filters,
    openCreateModal: openCreateKelompokModal,
    openEditModal: openEditKelompokModal,
    closeModal: closeKelompokModal,
    openDeleteConfirm: openDeleteKelompokConfirm,
    closeDeleteConfirm: closeDeleteKelompokConfirm,
    setFilters
  }
}
