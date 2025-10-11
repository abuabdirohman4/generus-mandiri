import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Dayjs } from 'dayjs'

export interface LaporanFilters {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  classId: string
  startDate: Dayjs | null
  endDate: Dayjs | null
}

interface LaporanState {
  filters: LaporanFilters
  setFilters: (filters: Partial<LaporanFilters>) => void
  resetFilters: () => void
  setFilter: (key: keyof LaporanFilters, value: any) => void
}

const defaultFilters: LaporanFilters = {
  period: 'monthly',
  classId: '',
  startDate: null,
  endDate: null
}

export const useLaporanStore = create<LaporanState>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      resetFilters: () => set({ filters: defaultFilters }),
      
      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value }
      }))
    }),
    {
      name: 'laporan-storage',
      partialize: (state) => ({ 
        filters: {
          period: state.filters.period,
          classId: state.filters.classId,
          // Don't persist dates as they should be fresh on each visit
          startDate: null,
          endDate: null
        }
      })
    }
  )
)

// Computed values and actions
export const useLaporan = () => {
  const store = useLaporanStore()
  
  return {
    ...store,
    // Helper to check if any filters are active
    hasActiveFilters: store.filters.classId !== '' || 
                     store.filters.startDate !== null || 
                     store.filters.endDate !== null,
    // Helper to get filter count
    filterCount: [
      store.filters.classId !== '',
      store.filters.startDate !== null,
      store.filters.endDate !== null
    ].filter(Boolean).length
  }
}
