import { create } from 'zustand'
import { ClassWithMaster } from '../actions/classes'
import { ClassMaster } from '../actions/masters'

interface KelasState {
  // Modal states for Kelompok tab
  isKelompokModalOpen: boolean
  editingClass: ClassWithMaster | null
  deleteKelompokConfirm: { isOpen: boolean; classItem: ClassWithMaster | null }
  
  // Modal states for Masters tab
  isMasterModalOpen: boolean
  editingMaster: ClassMaster | null
  deleteMasterConfirm: { isOpen: boolean; master: ClassMaster | null }
  
  // Filter states
  filters: {
    daerah: string[]
    desa: string[]
    kelompok: string[]
    kelas: string[]
  }
  
  // Actions for Kelompok tab
  openCreateKelompokModal: () => void
  openEditKelompokModal: (classItem: ClassWithMaster) => void
  closeKelompokModal: () => void
  openDeleteKelompokConfirm: (classItem: ClassWithMaster) => void
  closeDeleteKelompokConfirm: () => void
  
  // Actions for Masters tab
  openCreateMasterModal: () => void
  openEditMasterModal: (master: ClassMaster) => void
  closeMasterModal: () => void
  openDeleteMasterConfirm: (master: ClassMaster) => void
  closeDeleteMasterConfirm: () => void
  
  // Filter actions
  setFilters: (filters: Partial<KelasState['filters']>) => void
  resetFilters: () => void
}

export const useKelasStore = create<KelasState>((set) => ({
  // Initial states
  isKelompokModalOpen: false,
  editingClass: null,
  deleteKelompokConfirm: { isOpen: false, classItem: null },
  
  isMasterModalOpen: false,
  editingMaster: null,
  deleteMasterConfirm: { isOpen: false, master: null },
  
  filters: { daerah: [], desa: [], kelompok: [], kelas: [] },
  
  // Kelompok actions
  openCreateKelompokModal: () => set({ isKelompokModalOpen: true, editingClass: null }),
  openEditKelompokModal: (classItem) => set({ isKelompokModalOpen: true, editingClass: classItem }),
  closeKelompokModal: () => set({ isKelompokModalOpen: false, editingClass: null }),
  openDeleteKelompokConfirm: (classItem) => set({ deleteKelompokConfirm: { isOpen: true, classItem } }),
  closeDeleteKelompokConfirm: () => set({ deleteKelompokConfirm: { isOpen: false, classItem: null } }),
  
  // Master actions
  openCreateMasterModal: () => set({ isMasterModalOpen: true, editingMaster: null }),
  openEditMasterModal: (master) => set({ isMasterModalOpen: true, editingMaster: master }),
  closeMasterModal: () => set({ isMasterModalOpen: false, editingMaster: null }),
  openDeleteMasterConfirm: (master) => set({ deleteMasterConfirm: { isOpen: true, master } }),
  closeDeleteMasterConfirm: () => set({ deleteMasterConfirm: { isOpen: false, master: null } }),
  
  // Filter actions
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters } 
  })),
  resetFilters: () => set({ filters: { daerah: [], desa: [], kelompok: [], kelas: [] } })
}))
