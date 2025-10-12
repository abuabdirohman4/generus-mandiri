import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Dayjs } from 'dayjs'

export interface LaporanFilters {
  // General mode filters
  month: number
  year: number
  viewMode: 'general' | 'detailed'
  
  // Detailed mode filters - Period-specific
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  classId: string
  
  // Daily filters
  startDate: Dayjs | null
  endDate: Dayjs | null
  
  // Weekly filters (for mobile: stored as week numbers, for desktop: converted from Dayjs)
  weekYear: number        // Year for week selection
  weekMonth: number       // Month for week selection (1-12)
  startWeekNumber: number // Week number in month (1-5, dynamically calculated)
  endWeekNumber: number   // Week number in month (1-5, dynamically calculated)
  
  // Monthly filters
  monthYear: number      // Year for month selection
  startMonth: number     // 1-12
  endMonth: number       // 1-12
  
  // Yearly filters
  startYear: number
  endYear: number
}

interface LaporanState {
  filters: LaporanFilters
  setFilters: (filters: Partial<LaporanFilters>) => void
  resetFilters: () => void
  setFilter: (key: keyof LaporanFilters, value: any) => void
  resetMonthlyFilters: () => void
}

const getCurrentMonth = () => 10 // Use October for dummy data compatibility
const getCurrentYear = () => 2025 // Use 2025 for dummy data compatibility

// Helper function to get default monthly range
const getDefaultMonthlyRange = () => ({
  monthYear: getCurrentYear(),
  startMonth: 10, // October
  endMonth: 12    // December
})

const defaultFilters: LaporanFilters = {
  // General mode defaults
  month: getCurrentMonth(),
  year: getCurrentYear(),
  viewMode: 'general',
  
  // Detailed mode defaults
  period: 'monthly',
  classId: '',
  
  // Daily filters
  startDate: null,
  endDate: null,
  
  // Weekly filters
  weekYear: getCurrentYear(),
  weekMonth: getCurrentMonth(),
  startWeekNumber: 1,
  endWeekNumber: 1,
  
  // Monthly filters
  ...getDefaultMonthlyRange(),
  
  // Yearly filters
  startYear: getCurrentYear(),
  endYear: getCurrentYear()
}

export const useLaporanStore = create<LaporanState>()(
  persist(
    (set, get) => ({
      filters: defaultFilters,
      
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      resetFilters: () => set({ filters: defaultFilters }),
      
      resetMonthlyFilters: () => set((state) => ({
        filters: { ...state.filters, ...getDefaultMonthlyRange() }
      })),
      
      setFilter: (key, value) => set((state) => {
        const newFilters = { ...state.filters, [key]: value }
        
        // Reset period-specific filters when period changes
        if (key === 'period') {
          switch (value) {
            case 'daily':
              newFilters.startDate = null
              newFilters.endDate = null
              break
            case 'weekly':
              newFilters.weekYear = getCurrentYear()
              newFilters.weekMonth = getCurrentMonth()
              newFilters.startWeekNumber = 1
              newFilters.endWeekNumber = 1
              break
            case 'monthly':
              Object.assign(newFilters, getDefaultMonthlyRange())
              break
            case 'yearly':
              newFilters.startYear = getCurrentYear()
              newFilters.endYear = getCurrentYear()
              break
          }
        }
        return { filters: newFilters }
      })
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
          
          // Persist period-specific settings but reset date-based ones
          weekYear: state.filters.weekYear,
          weekMonth: state.filters.weekMonth,
          startWeekNumber: state.filters.startWeekNumber,
          endWeekNumber: state.filters.endWeekNumber,
          monthYear: state.filters.monthYear,
          startMonth: state.filters.startMonth,
          endMonth: state.filters.endMonth,
          startYear: state.filters.startYear,
          endYear: state.filters.endYear,
          
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
