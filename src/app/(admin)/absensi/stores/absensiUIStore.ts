import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewMode = 'list' | 'card' | 'chart'

interface AbsensiUIStore {
  // View mode state
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // NOTE: Pagination moved to URL query params (?page=N)
  // This avoids hydration mismatch and follows web standards

  // Class filter state
  selectedClassFilter: string
  setSelectedClassFilter: (classId: string) => void
  
  // Organisation filter state
  dataFilters: {
    daerah: string[]
    desa: string[]
    kelompok: string[]
    kelas: string[]
    meetingType?: string[]
  }
  setDataFilters: (filters: { daerah: string[]; desa: string[]; kelompok: string[]; kelas: string[]; meetingType?: string[] }) => void

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
  selectedClassFilter: '',
  dataFilters: { daerah: [], desa: [], kelompok: [], kelas: [], meetingType: [] },
  showCreateModal: false,
  editingMeeting: null
}

export const useAbsensiUIStore = create<AbsensiUIStore>()(
  persist(
    (set) => ({
      ...initialState,

      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
      setSelectedClassFilter: (classId: string) => set({ selectedClassFilter: classId }),
      setDataFilters: (filters) => set({ dataFilters: filters }),
      setShowCreateModal: (show: boolean) => set({ showCreateModal: show }),
      setEditingMeeting: (meeting: any | null) => set({ editingMeeting: meeting }),

      reset: () => set(initialState),
    }),
    {
      name: 'absensi-ui-store',
      // Persist user preferences only
      // NOTE: Pagination is now handled via URL query params (?page=N)
      partialize: (state) => ({
        viewMode: state.viewMode,
        selectedClassFilter: state.selectedClassFilter
      }),
    }
  )
)
