import { create } from 'zustand'

type TabType = 'daerah' | 'desa' | 'kelompok'

interface OrganisasiState {
  activeTab: TabType
  isModalOpen: boolean
  editingItem: any | null
  deleteConfirm: { isOpen: boolean; item: any; type: TabType }
  
  // Filters for conditional tab filtering
  daerahFilter: string
  desaFilter: string
  
  // Actions
  setActiveTab: (tab: TabType) => void
  openCreateModal: () => void
  openEditModal: (item: any) => void
  closeModal: () => void
  openDeleteConfirm: (item: any, type: TabType) => void
  closeDeleteConfirm: () => void
  setDaerahFilter: (value: string) => void
  setDesaFilter: (value: string) => void
}

export const useOrganisasiStore = create<OrganisasiState>((set) => ({
  activeTab: 'daerah',
  isModalOpen: false,
  editingItem: null,
  deleteConfirm: { isOpen: false, item: null, type: 'daerah' },
  daerahFilter: '',
  desaFilter: '',
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  openCreateModal: () => set({ isModalOpen: true, editingItem: null }),
  openEditModal: (item) => set({ isModalOpen: true, editingItem: item }),
  closeModal: () => set({ isModalOpen: false, editingItem: null }),
  openDeleteConfirm: (item, type) => set({ deleteConfirm: { isOpen: true, item, type } }),
  closeDeleteConfirm: () => set({ deleteConfirm: { isOpen: false, item: null, type: 'daerah' } }),
  setDaerahFilter: (value) => set({ daerahFilter: value, desaFilter: '' }), // Reset desa when daerah changes
  setDesaFilter: (value) => set({ desaFilter: value })
}))
