'use client'

import { create } from 'zustand'

export interface BatchStudent {
  id: string
  name: string
  gender: string
  error?: string
}

interface BatchImportState {
  // Modal state
  showBatchModal: boolean
  
  // Step management
  currentStep: number // 1-3
  
  // Configuration
  batchSize: number // 1-20
  selectedClassId: string
  
  // Students data
  students: BatchStudent[]
  
  // Import progress
  importProgress: number // 0-100
  isImporting: boolean
  
  // Actions
  setShowBatchModal: (show: boolean) => void
  setCurrentStep: (step: number) => void
  setBatchSize: (size: number) => void
  setSelectedClassId: (classId: string) => void
  setStudents: (students: BatchStudent[]) => void
  addStudent: (student: BatchStudent) => void
  updateStudent: (id: string, updates: Partial<BatchStudent>) => void
  removeStudent: (id: string) => void
  setImportProgress: (progress: number) => void
  setIsImporting: (importing: boolean) => void
  
  // Step navigation
  nextStep: () => void
  prevStep: () => void
  resetToStep1: () => void
  
  // Combined actions
  openBatchModal: () => void
  closeBatchModal: () => void
  resetBatchImport: () => void
}

export const useBatchImportStore = create<BatchImportState>((set, get) => ({
  // Initial state
  showBatchModal: false,
  currentStep: 1,
  batchSize: 5,
  selectedClassId: '',
  students: [],
  importProgress: 0,
  isImporting: false,
  
  // Individual setters
  setShowBatchModal: (show) => set({ showBatchModal: show }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setBatchSize: (size) => set({ batchSize: Math.max(1, Math.min(20, size)) }),
  setSelectedClassId: (classId) => set({ selectedClassId: classId }),
  setStudents: (students) => set({ students }),
  addStudent: (student) => set((state) => ({ students: [...state.students, student] })),
  updateStudent: (id, updates) => set((state) => ({
    students: state.students.map(s => s.id === id ? { ...s, ...updates } : s)
  })),
  removeStudent: (id) => set((state) => ({
    students: state.students.filter(s => s.id !== id)
  })),
  setImportProgress: (progress) => set({ importProgress: Math.max(0, Math.min(100, progress)) }),
  setIsImporting: (importing) => set({ isImporting: importing }),
  
  // Step navigation
  nextStep: () => set((state) => ({ currentStep: Math.min(3, state.currentStep + 1) })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  resetToStep1: () => set({ currentStep: 1 }),
  
  // Combined actions
  openBatchModal: () => set({
    showBatchModal: true,
    currentStep: 1,
    batchSize: 5,
    selectedClassId: '',
    students: [],
    importProgress: 0,
    isImporting: false
  }),
  
  closeBatchModal: () => set({
    showBatchModal: false,
    currentStep: 1,
    batchSize: 5,
    selectedClassId: '',
    students: [],
    importProgress: 0,
    isImporting: false
  }),
  
  resetBatchImport: () => set({
    currentStep: 1,
    batchSize: 5,
    selectedClassId: '',
    students: [],
    importProgress: 0,
    isImporting: false
  })
}))
