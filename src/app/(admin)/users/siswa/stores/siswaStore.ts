'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Student } from '../actions'

// Re-export Student type for use in store
export type { Student }

interface DataFilters {
  daerah: string[]
  desa: string[]
  kelompok: string[]
  kelas: string[]
  gender?: string
}

interface SiswaState {
  // Modal state
  showModal: boolean
  modalMode: 'create' | 'edit'
  selectedStudent: Student | null
  showBatchModal: boolean
  
  // Filter state
  selectedClassFilter: string
  dataFilters: DataFilters
  
  // UI state
  submitting: boolean
  
  // Actions
  setShowModal: (show: boolean) => void
  setModalMode: (mode: 'create' | 'edit') => void
  setSelectedStudent: (student: Student | null) => void
  setSelectedClassFilter: (classId: string) => void
  setDataFilters: (filters: DataFilters) => void
  setSubmitting: (submitting: boolean) => void
  setShowBatchModal: (show: boolean) => void
  
  // Combined actions
  openCreateModal: () => void
  openEditModal: (student: Student) => void
  closeModal: () => void
  openBatchModal: () => void
  closeBatchModal: () => void
}

export const useSiswaStore = create<SiswaState>()(
  persist(
    (set) => ({
      // Initial state
      showModal: false,
      modalMode: 'create',
      selectedStudent: null,
      showBatchModal: false,
      selectedClassFilter: '',
      dataFilters: {
        daerah: [],
        desa: [],
        kelompok: [],
        kelas: [],
        gender: ''
      },
      submitting: false,
      
      // Individual setters
      setShowModal: (show) => set({ showModal: show }),
      setModalMode: (mode) => set({ modalMode: mode }),
      setSelectedStudent: (student) => set({ selectedStudent: student }),
      setSelectedClassFilter: (classId) => set({ selectedClassFilter: classId }),
      setDataFilters: (filters) => set({ dataFilters: filters }),
      setSubmitting: (submitting) => set({ submitting }),
      setShowBatchModal: (show) => set({ showBatchModal: show }),
      
      // Combined actions
      openCreateModal: () => set({
        showModal: true,
        modalMode: 'create',
        selectedStudent: null,
        submitting: false
      }),
      
      openEditModal: (student) => set({
        showModal: true,
        modalMode: 'edit',
        selectedStudent: student,
        submitting: false
      }),
      
      closeModal: () => set({
        showModal: false,
        modalMode: 'create',
        selectedStudent: null,
        submitting: false
      }),
      
      openBatchModal: () => set({
        showBatchModal: true
      }),
      
      closeBatchModal: () => set({
        showBatchModal: false
      })
    }),
    {
      name: 'siswa-storage',
      partialize: (state) => ({
        selectedClassFilter: state.selectedClassFilter,
        dataFilters: state.dataFilters
      })
    }
  )
)
