'use client'

import { useClassMasters } from '@/hooks/useClassMasters'
import { useUserProfile } from '@/stores/userProfileStore'
import { useKelasStore } from '../stores/kelasStore'

export function useClassMastersPage() {
  const { masters, isLoading, error, mutate } = useClassMasters()
  const { profile: userProfile } = useUserProfile()
  
  const {
    isMasterModalOpen,
    editingMaster,
    deleteMasterConfirm,
    openCreateMasterModal,
    openEditMasterModal,
    closeMasterModal,
    openDeleteMasterConfirm,
    closeDeleteMasterConfirm
  } = useKelasStore()

  return {
    masters,
    isLoading,
    error,
    mutate,
    userProfile,
    isModalOpen: isMasterModalOpen,
    editingMaster,
    deleteConfirm: deleteMasterConfirm,
    openCreateModal: openCreateMasterModal,
    openEditModal: openEditMasterModal,
    closeModal: closeMasterModal,
    openDeleteConfirm: openDeleteMasterConfirm,
    closeDeleteConfirm: closeDeleteMasterConfirm
  }
}
