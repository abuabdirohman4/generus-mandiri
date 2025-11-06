'use client'

import { create } from 'zustand'

interface AssignStudentsState {
  showModal: boolean
  selectedClassId: string
  selectedStudentIds: string[]
  searchQuery: string
  filterClassId: string
  
  openModal: () => void
  closeModal: () => void
  setSelectedClassId: (classId: string) => void
  toggleStudent: (studentId: string) => void
  selectAll: (studentIds: string[]) => void
  clearSelection: () => void
  setSearchQuery: (query: string) => void
  setFilterClassId: (classId: string) => void
}

export const useAssignStudentsStore = create<AssignStudentsState>((set) => ({
  showModal: false,
  selectedClassId: '',
  selectedStudentIds: [],
  searchQuery: '',
  filterClassId: '',
  
  openModal: () => set({ 
    showModal: true, 
    selectedClassId: '', 
    selectedStudentIds: [],
    searchQuery: '',
    filterClassId: ''
  }),
  
  closeModal: () => set({ 
    showModal: false, 
    selectedClassId: '', 
    selectedStudentIds: [],
    searchQuery: '',
    filterClassId: ''
  }),
  
  setSelectedClassId: (classId) => set({ selectedClassId: classId }),
  
  toggleStudent: (studentId) => set((state) => ({
    selectedStudentIds: state.selectedStudentIds.includes(studentId)
      ? state.selectedStudentIds.filter(id => id !== studentId)
      : [...state.selectedStudentIds, studentId]
  })),
  
  selectAll: (studentIds) => set((state) => {
    const allSelected = studentIds.length > 0 && studentIds.every(id => state.selectedStudentIds.includes(id))
    return {
      selectedStudentIds: allSelected ? [] : [...studentIds]
    }
  }),
  
  clearSelection: () => set({ selectedStudentIds: [] }),
  
  setSearchQuery: (query) => set({ searchQuery: query }),
  
  setFilterClassId: (classId) => set({ filterClassId: classId })
}))

