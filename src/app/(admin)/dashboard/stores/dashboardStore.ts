import { create } from 'zustand'
import { persist } from 'zustand/middleware'
export interface DashboardFilters {
  // Period selection
  period: 'today' | 'week' | 'month' | 'custom'
  customDateRange?: { start: string; end: string }

  // Organization filters (from DataFilter)
  daerah: string[]
  desa: string[]
  kelompok: string[]
  kelas: string[]

  // Student filters
  gender?: string

  // View mode for class monitoring
  classViewMode: 'separated' | 'combined'

  // Comparison chart state
  comparisonViewMode: 'table' | 'chart'
  comparisonLevel: 'class' | 'kelompok' | 'desa' | 'daerah'
}
interface DashboardState {
  filters: DashboardFilters
  setFilters: (filters: Partial<DashboardFilters>) => void
  setFilter: (key: keyof DashboardFilters, value: any) => void
  resetFilters: () => void
}
const defaultFilters: DashboardFilters = {
  period: 'today',
  customDateRange: undefined,
  daerah: [],
  desa: [],
  kelompok: [],
  kelas: [],
  classViewMode: 'separated',
  comparisonViewMode: 'table',
  comparisonLevel: 'kelompok'
}
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      filters: defaultFilters,
      
      setFilters: (newFilters) => set((state) => ({
        filters: { ...state.filters, ...newFilters }
      })),
      
      setFilter: (key, value) => set((state) => ({
        filters: { ...state.filters, [key]: value }
      })),
      
      resetFilters: () => set({ filters: defaultFilters })
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        filters: {
          // Persist most settings
          period: state.filters.period,
          daerah: state.filters.daerah,
          desa: state.filters.desa,
          kelompok: state.filters.kelompok,
          kelas: state.filters.kelas,
          gender: state.filters.gender,
          classViewMode: state.filters.classViewMode,
          comparisonViewMode: state.filters.comparisonViewMode,
          comparisonLevel: state.filters.comparisonLevel,
          // Don't persist custom date range (should be fresh)
          customDateRange: undefined
        }
      })
    }
  )
)