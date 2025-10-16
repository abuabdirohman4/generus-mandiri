import { create } from 'zustand'

interface GuruState {
  // Modal states
  isModalOpen: boolean
  editingGuru: any | null
  resetPasswordModal: { isOpen: boolean; guru: any }
  deleteConfirm: { isOpen: boolean; guru: any }
  
  // Filter states
  filters: {
    daerah: string
    desa: string
    kelompok: string
    kelas: string
    search: string
  }
  
  // Actions
  openCreateModal: () => void
  openEditModal: (guru: any) => void
  closeModal: () => void
  openResetPasswordModal: (guru: any) => void
  closeResetPasswordModal: () => void
  openDeleteConfirm: (guru: any) => void
  closeDeleteConfirm: () => void
  setFilters: (filters: Partial<GuruState['filters']>) => void
  resetFilters: () => void
}

export const useGuruStore = create<GuruState>((set) => ({
  // Initial state
  isModalOpen: false,
  editingGuru: null,
  resetPasswordModal: { isOpen: false, guru: null },
  deleteConfirm: { isOpen: false, guru: null },
  filters: { daerah: '', desa: '', kelompok: '', kelas: '', search: '' },
  
  // Actions
  openCreateModal: () => set({ isModalOpen: true, editingGuru: null }),
  openEditModal: (guru) => set({ isModalOpen: true, editingGuru: guru }),
  closeModal: () => set({ isModalOpen: false, editingGuru: null }),
  openResetPasswordModal: (guru) => set({ resetPasswordModal: { isOpen: true, guru } }),
  closeResetPasswordModal: () => set({ resetPasswordModal: { isOpen: false, guru: null } }),
  openDeleteConfirm: (guru) => set({ deleteConfirm: { isOpen: true, guru } }),
  closeDeleteConfirm: () => set({ deleteConfirm: { isOpen: false, guru: null } }),
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters } 
  })),
  resetFilters: () => set({ filters: { daerah: '', desa: '', kelompok: '', kelas: '', search: '' } })
}))
