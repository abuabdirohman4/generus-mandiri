'use client'

import { create } from 'zustand'

interface Student {
  id: string
  name: string
  gender: string | null
  class_id: string
  created_at: string
  updated_at: string
  category?: string | null
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
  classes: {
    id: string
    name: string
  } | null
}

interface SiswaState {
  // Modal state
  showModal: boolean
  modalMode: 'create' | 'edit'
  selectedStudent: Student | null
  showBatchModal: boolean
  
  // Filter state
  selectedClassFilter: string
  
  // UI state
  submitting: boolean
  
  // Actions
  setShowModal: (show: boolean) => void
  setModalMode: (mode: 'create' | 'edit') => void
  setSelectedStudent: (student: Student | null) => void
  setSelectedClassFilter: (classId: string) => void
  setSubmitting: (submitting: boolean) => void
  setShowBatchModal: (show: boolean) => void
  
  // Combined actions
  openCreateModal: () => void
  openEditModal: (student: Student) => void
  closeModal: () => void
  openBatchModal: () => void
  closeBatchModal: () => void
}

export const useSiswaStore = create<SiswaState>((set) => ({
  // Initial state
  showModal: false,
  modalMode: 'create',
  selectedStudent: null,
  showBatchModal: false,
  selectedClassFilter: '',
  submitting: false,
  
  // Individual setters
  setShowModal: (show) => set({ showModal: show }),
  setModalMode: (mode) => set({ modalMode: mode }),
  setSelectedStudent: (student) => set({ selectedStudent: student }),
  setSelectedClassFilter: (classId) => set({ selectedClassFilter: classId }),
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
}))
