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
  status?: string

  // View mode for class monitoring
  classViewMode: 'separated' | 'combined'

  // Comparison chart state
  comparisonViewMode: 'table' | 'chart'
  comparisonLevel: 'class' | 'kelompok' | 'desa' | 'daerah'

  // Category group filter for laporan
  categoryGroup?: 'caberawit' | 'muda_mudi' | 'orang_tua'

  // Count meetings as unique days instead of raw records (daerah-level only)
  uniqueDaysMode?: boolean
}
interface DashboardState {
  filters: DashboardFilters
  setFilters: (filters: Partial<DashboardFilters>) => void
  setFilter: (key: keyof DashboardFilters, value: any) => void
  resetFilters: () => void
  clearStore: () => void
}
const defaultFilters: DashboardFilters = {
  period: 'month',
  customDateRange: undefined,
  daerah: [],
  desa: [],
  kelompok: [],
  kelas: [],
  status: 'active',
  classViewMode: 'separated',
  comparisonViewMode: 'table',
  comparisonLevel: 'class',
  uniqueDaysMode: false,
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
      
      resetFilters: () => set({ filters: defaultFilters }),
      
      clearStore: () => {
        set({ filters: defaultFilters })
        if (typeof window !== 'undefined') {
          localStorage.removeItem('dashboard-storage')
        }
      }
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
          status: state.filters.status,
          classViewMode: state.filters.classViewMode,
          comparisonViewMode: state.filters.comparisonViewMode,
          comparisonLevel: state.filters.comparisonLevel,
          categoryGroup: state.filters.categoryGroup,
          uniqueDaysMode: state.filters.uniqueDaysMode,
          // Don't persist custom date range (should be fresh)
          customDateRange: undefined
        }
      })
    }
  )
)