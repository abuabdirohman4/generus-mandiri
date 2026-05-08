import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LaporanTab = 'presensi' | 'materi' | 'overview'

interface MateriFilters {
  classId: string
  daerahId: string
  desaId: string
  kelompokId: string
  academicYearId: string
  semester: 1 | 2
  categoryId: string
  month: number | undefined
}

interface LaporanState {
  activeTab: LaporanTab
  materiFilters: MateriFilters
  materiViewMode: 'per_materi' | 'per_siswa'
  
  // Actions
  setActiveTab: (tab: LaporanTab) => void
  setMateriFilters: (filters: Partial<MateriFilters>) => void
  setMateriViewMode: (mode: 'per_materi' | 'per_siswa') => void
  resetMateriFilters: () => void
  clearStore: () => void
}

const initialMateriFilters: MateriFilters = {
  classId: '',
  daerahId: '',
  desaId: '',
  kelompokId: '',
  academicYearId: '',
  semester: 1,
  categoryId: '',
  month: undefined,
}

export const useLaporanStore = create<LaporanState>()(
  persist(
    (set) => ({
      activeTab: 'presensi',
      materiFilters: initialMateriFilters,
      materiViewMode: 'per_siswa',

      setActiveTab: (tab) => set({ activeTab: tab }),

      setMateriFilters: (newFilters) => 
        set((state) => {
          const updatedFilters = { ...state.materiFilters, ...newFilters }
          
          // Cascade resets
          if ('daerahId' in newFilters) {
            updatedFilters.desaId = ''
            updatedFilters.kelompokId = ''
            updatedFilters.classId = ''
          } else if ('desaId' in newFilters) {
            updatedFilters.kelompokId = ''
            updatedFilters.classId = ''
          } else if ('kelompokId' in newFilters) {
            updatedFilters.classId = ''
          }

          return { materiFilters: updatedFilters }
        }),

      setMateriViewMode: (mode) => set({ materiViewMode: mode }),

      resetMateriFilters: () => set({ materiFilters: initialMateriFilters }),
      
      clearStore: () => set({ 
        activeTab: 'presensi',
        materiFilters: initialMateriFilters,
        materiViewMode: 'per_siswa'
      }),
    }),
    {
      name: 'laporan-materi-storage',
      partialize: (state) => ({ materiFilters: state.materiFilters }),
    }
  )
)
