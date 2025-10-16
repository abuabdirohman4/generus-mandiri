import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'list' | 'card' | 'chart'

interface AbsensiUIStore {
  // View mode state
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
  
  // Pagination state
  currentPage: number
  setCurrentPage: (page: number) => void
  
  // Class filter state
  selectedClassFilter: string
  setSelectedClassFilter: (classId: string) => void
  
  // Organisation filter state
  dataFilters: {
    daerah: string
    desa: string
    kelompok: string
    kelas: string
  }
  setDataFilters: (filters: { daerah: string; desa: string; kelompok: string; kelas: string }) => void
  
  // Modal state
  showCreateModal: boolean
  setShowCreateModal: (show: boolean) => void
  
  // Editing meeting state
  editingMeeting: any | null
  setEditingMeeting: (meeting: any | null) => void
  
  // Reset function
  reset: () => void
}

const initialState = {
  viewMode: 'list' as ViewMode,
  currentPage: 1,
  selectedClassFilter: '',
  dataFilters: { daerah: '', desa: '', kelompok: '', kelas: '' },
  showCreateModal: false,
  editingMeeting: null,
}

export const useAbsensiUIStore = create<AbsensiUIStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
      setCurrentPage: (page: number) => set({ currentPage: page }),
      setSelectedClassFilter: (classId: string) => set({ selectedClassFilter: classId }),
      setDataFilters: (filters) => set({ dataFilters: filters }),
      setShowCreateModal: (show: boolean) => set({ showCreateModal: show }),
      setEditingMeeting: (meeting: any | null) => set({ editingMeeting: meeting }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'absensi-ui-store',
      // Persist user preferences, not transient UI state
      partialize: (state) => ({ 
        viewMode: state.viewMode,
        selectedClassFilter: state.selectedClassFilter
      }),
    }
  )
)
