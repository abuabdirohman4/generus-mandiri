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
    
    if (filters.kelompok.length > 0) {
      result = result.filter(c => c.kelompok_id && filters.kelompok.includes(c.kelompok_id))
    }
    if (filters.desa.length > 0) {
      result = result.filter(c => c.kelompok?.desa_id && filters.desa.includes(c.kelompok.desa_id))
    }
    if (filters.daerah.length > 0) {
      result = result.filter(c => c.kelompok?.desa?.daerah_id && filters.daerah.includes(c.kelompok.desa.daerah_id))
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
