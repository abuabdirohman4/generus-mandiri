import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PresensiColumnVisibility {
  showKelompokColumn: boolean
  showDesaColumn: boolean
}

interface PresensiAttendanceStore {
  columnVisibility: PresensiColumnVisibility
  setColumnVisibility: (visibility: Partial<PresensiColumnVisibility>) => void
}

export const usePresensiAttendanceStore = create<PresensiAttendanceStore>()(
  persist(
    (set) => ({
      columnVisibility: { showKelompokColumn: true, showDesaColumn: true },
      setColumnVisibility: (visibility) => set((state) => ({
        columnVisibility: { ...state.columnVisibility, ...visibility }
      })),
    }),
    {
      name: 'presensi-attendance-storage',
      partialize: (state) => ({ columnVisibility: state.columnVisibility }),
    }
  )
)
