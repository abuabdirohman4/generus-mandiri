import { create } from 'zustand'

interface AdminState {
  // Modal states
  isModalOpen: boolean
  editingAdmin: any | null
  resetPasswordModal: { isOpen: boolean; admin: any }
  deleteConfirm: { isOpen: boolean; admin: any }
  
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
  openEditModal: (admin: any) => void
  closeModal: () => void
  openResetPasswordModal: (admin: any) => void
  closeResetPasswordModal: () => void
  openDeleteConfirm: (admin: any) => void
  closeDeleteConfirm: () => void
  setFilters: (filters: Partial<AdminState['filters']>) => void
  resetFilters: () => void
}

export const useAdminStore = create<AdminState>((set) => ({
  // Initial state
  isModalOpen: false,
  editingAdmin: null,
  resetPasswordModal: { isOpen: false, admin: null },
  deleteConfirm: { isOpen: false, admin: null },
  filters: { daerah: '', desa: '', kelompok: '', kelas: '', search: '' },
  
  // Actions
  openCreateModal: () => set({ isModalOpen: true, editingAdmin: null }),
  openEditModal: (admin) => set({ isModalOpen: true, editingAdmin: admin }),
  closeModal: () => set({ isModalOpen: false, editingAdmin: null }),
  openResetPasswordModal: (admin) => set({ resetPasswordModal: { isOpen: true, admin } }),
  closeResetPasswordModal: () => set({ resetPasswordModal: { isOpen: false, admin: null } }),
  openDeleteConfirm: (admin) => set({ deleteConfirm: { isOpen: true, admin } }),
  closeDeleteConfirm: () => set({ deleteConfirm: { isOpen: false, admin: null } }),
  setFilters: (newFilters) => set((state) => ({ 
    filters: { ...state.filters, ...newFilters } 
  })),
  resetFilters: () => set({ filters: { daerah: '', desa: '', kelompok: '', kelas: '', search: '' } })
}))
