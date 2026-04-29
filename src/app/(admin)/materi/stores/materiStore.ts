import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MateriFilters {
    viewMode: 'by_material' | 'by_class'
    selectedCategoryId: string | null
    selectedTypeId: string | null
    selectedClassId: string | null
    selectedSemester: 1 | 2 | null
    selectedMonth: number | null
    searchQuery: string
    sidebarCollapsed: boolean
}

export interface MateriColumnVisibility {
    showClassColumn: boolean
    showMonthColumn: boolean
}

interface MateriState {
    filters: MateriFilters
    columnVisibility: MateriColumnVisibility
    setFilters: (filters: Partial<MateriFilters>) => void
    setFilter: (key: keyof MateriFilters, value: any) => void
    resetFilters: () => void
    setColumnVisibility: (visibility: Partial<MateriColumnVisibility>) => void
}

const defaultFilters: MateriFilters = {
    viewMode: 'by_material',
    selectedCategoryId: null,
    selectedTypeId: null,
    selectedClassId: null,
    selectedSemester: null,
    selectedMonth: null,
    searchQuery: '',
    sidebarCollapsed: false
}

const defaultColumnVisibility: MateriColumnVisibility = {
    showClassColumn: true,
    showMonthColumn: true,
}

export const useMateriStore = create<MateriState>()(
    persist(
        (set) => ({
            filters: defaultFilters,
            columnVisibility: defaultColumnVisibility,

            setFilters: (newFilters) => set((state) => ({
                filters: { ...state.filters, ...newFilters }
            })),

            setFilter: (key, value) => set((state) => ({
                filters: { ...state.filters, [key]: value }
            })),

            resetFilters: () => set({ filters: defaultFilters }),

            setColumnVisibility: (visibility) => set((state) => ({
                columnVisibility: { ...state.columnVisibility, ...visibility }
            })),
        }),
        {
            name: 'materi-storage',
            partialize: (state) => ({
                filters: {
                    viewMode: state.filters.viewMode,
                    sidebarCollapsed: state.filters.sidebarCollapsed,
                    // Don't persist selections (fresh on reload)
                    selectedCategoryId: null,
                    selectedTypeId: null,
                    selectedClassId: null,
                    selectedSemester: null,
                    selectedMonth: null,
                    searchQuery: ''
                },
                columnVisibility: state.columnVisibility,
            })
        }
    )
)
