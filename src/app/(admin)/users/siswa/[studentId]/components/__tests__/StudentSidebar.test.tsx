import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import StudentSidebar from '../StudentSidebar'
import { useRouter } from 'next/navigation'

// Mock next/navigation
const mockRouter = {
    replace: vi.fn(),
}

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => mockRouter),
    usePathname: vi.fn(() => '/users/siswa/1'),
}))

vi.mock('swr', () => ({
    default: vi.fn(() => ({ data: [], isLoading: false }))
}))

vi.mock('@/stores/userProfileStore', () => ({
    useUserProfile: vi.fn(() => ({ profile: { role: 'superadmin' } }))
}))

vi.mock('@/app/(admin)/organisasi/actions/daerah', () => ({ getAllDaerah: vi.fn() }))
vi.mock('@/app/(admin)/organisasi/actions/desa', () => ({ getAllDesa: vi.fn() }))
vi.mock('@/app/(admin)/organisasi/actions/kelompok', () => ({ getAllKelompok: vi.fn() }))
vi.mock('@/app/(admin)/users/siswa/actions/classes/actions', () => ({ getAllClasses: vi.fn() }))

vi.mock('@/components/shared/DataFilter', () => ({
    default: ({ onFilterChange }: any) => (
        <div data-testid="mock-data-filter">
            <button onClick={() => onFilterChange({ daerah: [], desa: [], kelompok: [], kelas: ['c2'], gender: '', status: 'active', meetingType: [], activityType: [], activityLevel: [] })}>
                Filter Class C2
            </button>
            <button onClick={() => onFilterChange({ daerah: [], desa: [], kelompok: [], kelas: [], gender: '', status: 'active', meetingType: [], activityType: [], activityLevel: [] })}>
                Clear Filters
            </button>
        </div>
    )
}))

vi.mock('../stores/studentSidebarStore', () => {
    let state = {
        isOpen: true,
        showFilters: false,
        filters: { daerah: [], desa: [], kelompok: [], kelas: [], gender: '', status: 'active', meetingType: [], activityType: [], activityLevel: [] }
    }
    return {
        useStudentSidebarStore: vi.fn(() => ({
            ...state,
            setIsOpen: vi.fn((val) => { state.isOpen = val }),
            setShowFilters: vi.fn((val) => { state.showFilters = val }),
            setFilters: vi.fn((val) => { state.filters = val })
        }))
    }
})

describe('StudentSidebar', () => {
    const students = [
        { 
            id: '1', name: 'Alice', class_id: 'c1', class_name: 'Kelas 1', 
            kelompok_id: 'k1', kelompok_name: 'K1', desa_id: 'ds1', desa_name: 'D1', daerah_id: 'd1',
            status: 'active', classes: [{ id: 'c1', name: 'Kelas 1' }]
        },
        { 
            id: '2', name: 'Bob', class_id: 'c2', class_name: 'Kelas 2', 
            kelompok_id: 'k2', kelompok_name: 'K2', desa_id: 'ds2', desa_name: 'D2', daerah_id: 'd2',
            status: 'active', classes: [{ id: 'c2', name: 'Kelas 2' }]
        },
    ]

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders student list correctly', () => {
        render(
            <StudentSidebar
                students={students}
                currentStudentId=""
                userRole="superadmin"
            />
        )

        expect(screen.getByText('Alice')).toBeDefined()
        expect(screen.getByText('Bob')).toBeDefined()
        expect(screen.getByText('Kelas 1 · K1 · D1')).toBeDefined()
    })

    it('filters by class', async () => {
        render(
            <StudentSidebar
                students={students}
                currentStudentId=""
                userRole="teacher"
            />
        )

        // Use the mock button to simulate filter change
        fireEvent.click(screen.getByText('Filter Class C2'))

        await waitFor(() => {
            expect(screen.queryByText('Alice')).toBeNull()
            expect(screen.getByText('Bob')).toBeDefined()
        })
    })

    it('filters by search query', async () => {
        render(
            <StudentSidebar
                students={students}
                currentStudentId=""
                userRole="teacher"
            />
        )

        const input = screen.getByPlaceholderText('Cari siswa...')
        fireEvent.change(input, { target: { value: 'bob' } })

        await waitFor(() => {
            expect(screen.queryByText('Alice')).toBeNull()
            expect(screen.getByText('Bob')).toBeDefined()
        })
    })

    it('calls router.replace when student is selected', async () => {
        render(
            <StudentSidebar
                students={students}
                currentStudentId="1"
                userRole="teacher"
            />
        )

        // Clear filters to see all students
        fireEvent.click(screen.getByText('Clear Filters'))

        const bobButton = await screen.findByText('Bob')
        fireEvent.click(bobButton)
        
        expect(mockRouter.replace).toHaveBeenCalledWith('/users/siswa/2')
    })
})
