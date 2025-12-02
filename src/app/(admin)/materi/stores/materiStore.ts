import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface MateriFilters {
    viewMode: 'by_material' | 'by_class'
    selectedCategoryId: string | null
    selectedTypeId: string | null
    selectedClassId: string | null
    searchQuery: string
    sidebarCollapsed: boolean
}

interface MateriState {
    filters: MateriFilters
    setFilters: (filters: Partial<MateriFilters>) => void
    setFilter: (key: keyof MateriFilters, value: any) => void
    resetFilters: () => void
}

const defaultFilters: MateriFilters = {
    viewMode: 'by_material',
    selectedCategoryId: null,
    selectedTypeId: null,
    selectedClassId: null,
    searchQuery: '',
    sidebarCollapsed: false
}

export const useMateriStore = create<MateriState>()(
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
            name: 'materi-storage',
            partialize: (state) => ({
                filters: {
                    viewMode: state.filters.viewMode,
                    sidebarCollapsed: state.filters.sidebarCollapsed,
                    // Don't persist selections (fresh on reload)
                    selectedCategoryId: null,
                    selectedTypeId: null,
                    selectedClassId: null,
                    searchQuery: ''
                }
            })
        }
    )
)
