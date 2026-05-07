import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import LaporanPage from '../page'
import { useLaporanPage } from '../hooks'
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes'
import { canManageMaterials, canAccessMonitoring } from '@/lib/accessControl'

// Mock components that might fail in JSDOM
vi.mock('../components', () => ({
    FilterSection: () => <div data-testid="filter-section" />,
    SummaryCards: () => <div data-testid="summary-cards" />,
    StatsCards: () => <div data-testid="stats-cards" />,
    ReportChart: () => <div data-testid="report-chart" />,
    AttendanceTrendChart: () => <div data-testid="trend-chart" />,
    DataTable: () => <div data-testid="data-table" />
}))

vi.mock('../components/MateriFilterSection', () => ({
    default: () => <div data-testid="materi-filter-section" />
}))

vi.mock('../components/MateriStatsCards', () => ({
    default: () => <div data-testid="materi-stats-cards" />
}))

vi.mock('../components/MateriDataTable', () => ({
    default: () => <div data-testid="materi-data-table" />
}))

vi.mock('../hooks/useMateriReportData', () => ({
    useMateriReportData: vi.fn(() => ({ data: { rows: [] }, isLoading: false }))
}))

// Mock hooks
vi.mock('../hooks', () => ({
    useLaporanPage: vi.fn()
}))

vi.mock('@/hooks/useMyActivityTypes', () => ({
    useMyActivityTypes: vi.fn()
}))

vi.mock('@/lib/accessControl', () => ({
    canManageMaterials: vi.fn(),
    canAccessMonitoring: vi.fn(),
    canAccessOverview: vi.fn(),
}))

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
    createClient: vi.fn(() => ({
        from: vi.fn(() => ({
            select: vi.fn(() => ({
                eq: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: { id: 'year-1' }, error: null }))
                }))
            })),
            order: vi.fn(() => Promise.resolve({ data: [], error: null }))
        }))
    }))
}))

// Mock SWR
vi.mock('swr', () => ({
    default: vi.fn(() => ({ data: [], isLoading: false }))
}))

describe('LaporanPage Access Control', () => {
    const mockUserProfile = {
        id: 'user-1',
        role: 'teacher',
        permissions: { can_manage_materials: false }
    }

    beforeEach(() => {
        vi.clearAllMocks()
        
        ;(useLaporanPage as any).mockReturnValue({
            userProfile: mockUserProfile,
            filters: { period: 'daily' },
            loading: false,
            hasData: true,
            classOptions: [],
            periodOptions: []
        })

        ;(useMyActivityTypes as any).mockReturnValue({
            activityTypes: []
        })
    })

    it('should NOT show tab header for users without material access permission', () => {
        ;(canAccessMonitoring as any).mockReturnValue(false)

        render(<LaporanPage />)

        // Neither tab button should be rendered
        expect(screen.queryByText('Materi')).toBeNull()
        expect(screen.queryByText('Presensi')).toBeNull()
        
        // But content should be visible (Presensi filter section)
        expect(screen.getByTestId('filter-section')).toBeDefined()
    })

    it('should show Materi tab for users with material access permission', () => {
        ;(canAccessMonitoring as any).mockReturnValue(true)

        render(<LaporanPage />)

        // Both tabs should be rendered
        expect(screen.getByText('Materi')).toBeDefined()
        expect(screen.getByText('Presensi')).toBeDefined()
    })

    it('should reset tab to presensi if user loses access to materi', () => {
        // Initial render with access and tab set to materi
        ;(canAccessMonitoring as any).mockReturnValue(true)
        ;(useLaporanPage as any).mockReturnValue({
            userProfile: { ...mockUserProfile, permissions: { can_access_monitoring: true } },
            filters: { period: 'daily' },
            loading: false,
            hasData: true,
            classOptions: [],
            periodOptions: []
        })
        
        const { rerender } = render(<LaporanPage />)
        
        // Simulating access loss
        ;(canAccessMonitoring as any).mockReturnValue(false)
        ;(useLaporanPage as any).mockReturnValue({
            userProfile: { ...mockUserProfile, permissions: { can_manage_materials: false } },
            filters: { period: 'daily' },
            loading: false,
            hasData: true,
            classOptions: [],
            periodOptions: []
        })

        rerender(<LaporanPage />)
        
        expect(screen.queryByText('Materi')).toBeNull()
        expect(screen.queryByTestId('materi-filter-section')).toBeNull()
        expect(screen.getByTestId('filter-section')).toBeDefined() // Presensi filter section
    })
})
