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
  
  // Reset function
  reset: () => void
}

const initialState = {
  viewMode: 'list' as ViewMode,
  currentPage: 1,
}

export const useAbsensiUIStore = create<AbsensiUIStore>()(
  persist(
    (set) => ({
      ...initialState,
      
      setViewMode: (mode: ViewMode) => set({ viewMode: mode }),
      setCurrentPage: (page: number) => set({ currentPage: page }),
      
      reset: () => set(initialState),
    }),
    {
      name: 'absensi-ui-store',
      // Only persist viewMode, not currentPage (reset on each session)
      partialize: (state) => ({ 
        viewMode: state.viewMode 
      }),
    }
  )
)
