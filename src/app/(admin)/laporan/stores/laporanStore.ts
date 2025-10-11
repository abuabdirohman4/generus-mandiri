import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Dayjs } from 'dayjs'

export interface LaporanFilters {
  // General mode filters
  month: number
  year: number
  viewMode: 'general' | 'detailed'
  
  // Detailed mode filters (existing)
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

const getCurrentMonth = () => new Date().getMonth() + 1
const getCurrentYear = () => new Date().getFullYear()

const defaultFilters: LaporanFilters = {
  // General mode defaults
  month: getCurrentMonth(),
  year: getCurrentYear(),
  viewMode: 'general',
  
  // Detailed mode defaults
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
          // Persist general mode settings
          month: state.filters.month,
          year: state.filters.year,
          viewMode: state.filters.viewMode,
          
          // Persist detailed mode settings
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
    hasActiveFilters: store.filters.viewMode === 'detailed' ? (
      store.filters.classId !== '' || 
      store.filters.startDate !== null || 
      store.filters.endDate !== null
    ) : (
      store.filters.month !== getCurrentMonth() || 
      store.filters.year !== getCurrentYear() ||
      store.filters.classId !== ''
    ),
    // Helper to get filter count
    filterCount: store.filters.viewMode === 'detailed' ? [
      store.filters.classId !== '',
      store.filters.startDate !== null,
      store.filters.endDate !== null
    ].filter(Boolean).length : [
      store.filters.month !== getCurrentMonth(),
      store.filters.year !== getCurrentYear(),
      store.filters.classId !== ''
    ].filter(Boolean).length
  }
}
