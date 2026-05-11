import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { type DataFilters } from '@/components/shared/DataFilter'

interface StudentSidebarState {
    isOpen: boolean
    showFilters: boolean
    filters: DataFilters
    setIsOpen: (isOpen: boolean) => void
    setShowFilters: (showFilters: boolean) => void
    setFilters: (filters: DataFilters | ((prev: DataFilters) => DataFilters)) => void
    resetFilters: () => void
}

const initialFilters: DataFilters = {
    daerah: [],
    desa: [],
    kelompok: [],
    kelas: [],
    gender: '',
    status: 'active',
    meetingType: [],
    activityType: [],
    activityLevel: []
}

export const useStudentSidebarStore = create<StudentSidebarState>()(
    persist(
        (set) => ({
            isOpen: false,
            showFilters: false,
            filters: initialFilters,
            
            setIsOpen: (isOpen) => set({ isOpen }),
            setShowFilters: (showFilters) => set({ showFilters }),
            setFilters: (update) => set((state) => ({
                filters: typeof update === 'function' ? update(state.filters) : update
            })),
            resetFilters: () => set({ filters: initialFilters })
        }),
        {
            name: 'student-sidebar-storage',
            partialize: (state) => ({ 
                isOpen: state.isOpen,
                showFilters: state.showFilters,
                filters: state.filters
            })
        }
    )
)
