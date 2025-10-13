import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
  category?: string | null
  kelompok_id?: string | null
  desa_id?: string | null
  daerah_id?: string | null
}

interface AttendanceData {
  [studentId: string]: {
    status: 'H' | 'I' | 'S' | 'A'
    reason?: string
  }
}

interface AttendanceStore {
  // State
  students: Student[]
  attendance: AttendanceData
  selectedDate: Date
  loading: boolean
  saving: boolean
  
  // Actions
  setStudents: (students: Student[]) => void
  setAttendance: (attendance: AttendanceData) => void
  setSelectedDate: (date: Date) => void
  setLoading: (loading: boolean) => void
  setSaving: (saving: boolean) => void
  updateStudentStatus: (studentId: string, status: 'H' | 'I' | 'S' | 'A', reason?: string) => void
  clearAttendance: () => void
  reset: () => void
}

export const useAttendanceStore = create<AttendanceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      students: [],
      attendance: {},
      selectedDate: new Date(),
      loading: false,
      saving: false,

      // Actions
      setStudents: (students) => set({ students }),
      
      setAttendance: (attendance) => set({ attendance }),
      
      setSelectedDate: (selectedDate) => set({ selectedDate }),
      
      setLoading: (loading) => set({ loading }),
      
      setSaving: (saving) => set({ saving }),
      
      updateStudentStatus: (studentId, status, reason) =>
        set((state) => ({
          attendance: {
            ...state.attendance,
            [studentId]: { 
              status, 
              reason: status === 'I' ? reason : undefined 
            }
          }
        })),
      
      clearAttendance: () => set({ attendance: {} }),
      
      reset: () => set({
        students: [],
        attendance: {},
        selectedDate: new Date(),
        loading: false,
        saving: false
      })
    }),
    {
      name: 'attendance-storage',
      // Only persist essential data, not loading states
      partialize: (state) => ({
        students: state.students,
        selectedDate: state.selectedDate.toISOString(), // Serialize date as string
        // Don't persist attendance data as it's date-specific
        // Don't persist loading/saving states
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Convert string back to Date object on rehydration
          state.selectedDate = new Date(state.selectedDate)
        }
      }
    }
  )
)

// Selector hooks for better performance
export const useStudents = () => useAttendanceStore((state) => state.students)
export const useAttendance = () => useAttendanceStore((state) => state.attendance)
export const useSelectedDate = () => useAttendanceStore((state) => state.selectedDate)
export const useAttendanceActions = () => useAttendanceStore((state) => ({
  setStudents: state.setStudents,
  setAttendance: state.setAttendance,
  setSelectedDate: state.setSelectedDate,
  setLoading: state.setLoading,
  setSaving: state.setSaving,
  updateStudentStatus: state.updateStudentStatus,
  clearAttendance: state.clearAttendance,
  reset: state.reset
}))
