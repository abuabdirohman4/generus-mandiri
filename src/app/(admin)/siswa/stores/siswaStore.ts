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
  
  // Combined actions
  openCreateModal: () => void
  openEditModal: (student: Student) => void
  closeModal: () => void
}

export const useSiswaStore = create<SiswaState>((set) => ({
  // Initial state
  showModal: false,
  modalMode: 'create',
  selectedStudent: null,
  selectedClassFilter: '',
  submitting: false,
  
  // Individual setters
  setShowModal: (show) => set({ showModal: show }),
  setModalMode: (mode) => set({ modalMode: mode }),
  setSelectedStudent: (student) => set({ selectedStudent: student }),
  setSelectedClassFilter: (classId) => set({ selectedClassFilter: classId }),
  setSubmitting: (submitting) => set({ submitting }),
  
  // Combined actions
  openCreateModal: () => set({
    showModal: true,
    modalMode: 'create',
    selectedStudent: null
  }),
  
  openEditModal: (student) => set({
    showModal: true,
    modalMode: 'edit',
    selectedStudent: student
  }),
  
  closeModal: () => set({
    showModal: false,
    modalMode: 'create',
    selectedStudent: null
  })
}))
