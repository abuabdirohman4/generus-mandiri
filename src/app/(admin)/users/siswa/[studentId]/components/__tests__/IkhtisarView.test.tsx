import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import IkhtisarView from '../IkhtisarView'
import useSWR from 'swr'

// Mock useSWR
vi.mock('swr', () => ({
    default: vi.fn(),
}))

// Mock overview action
vi.mock('../../actions/overview', () => ({
    getStudentOverview: vi.fn(),
}))

vi.mock('@/stores/userProfileStore', () => ({
    useUserProfile: vi.fn(() => ({
        profile: { role: 'superadmin' },
        isInitialized: true
    }))
}))

vi.mock('@/lib/accessControl', () => ({
    canAccessMonitoring: vi.fn(() => true)
}))

// Mock icons to avoid SVG issues in Vitest
vi.mock('@/lib/icons', () => ({
    CalenderIcon: () => <div data-testid="calendar-icon" />,
    BookOpenIcon: () => <div data-testid="book-icon" />,
    CheckCircleIcon: () => <div data-testid="check-icon" />,
    TimeIcon: () => <div data-testid="time-icon" />,
    ChevronDownIcon: () => <div data-testid="chevron-icon" />,
    ShootingStarIcon: () => <div data-testid="star-icon" />,
}))

describe('IkhtisarView', () => {
    const studentId = 'student-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders skeleton when loading', () => {
        ;(useSWR as any).mockReturnValue({
            isLoading: true,
            data: null,
            error: null,
        })

        render(<IkhtisarView studentId={studentId} />)

        const skeleton = document.querySelector('.animate-pulse')
        expect(skeleton).toBeDefined()
    })

    it('renders student info, attendance and materi correctly', () => {
        const mockData = {
            student: {
                id: studentId,
                name: 'John Doe',
                classes: [{ id: 'c1', name: 'Kelas A' }],
                gender: 'Laki-laki'
            },
            attendance: {
                semester: { hadir: 10, absen: 2, izin: 1, sakit: 0, total: 13 },
                monthly: { hadir: 5, absen: 0, izin: 0, sakit: 0, total: 5 }
            },
            materi: {
                semester: { tuntas: 5, total: 10, percentage: 50, avgNilai: 85 },
                monthly: { tuntas: 2, total: 2, percentage: 100, avgNilai: 90 }
            }
        }

        ;(useSWR as any).mockReturnValue({
            isLoading: false,
            data: mockData,
            error: null,
        })

        render(<IkhtisarView studentId={studentId} />)

        expect(screen.getByText('John Doe')).toBeDefined()
        expect(screen.getByText('Kelas A')).toBeDefined()
        expect(screen.getByText('10')).toBeDefined() // Present count (semester default)
        expect(screen.getByText('50%')).toBeDefined() // Materi percentage
        expect(screen.getByText('85')).toBeDefined() // Avg Nilai
    })

    it('handles missing data with error state', () => {
        ;(useSWR as any).mockReturnValue({
            isLoading: false,
            data: null,
            error: new Error('Gagal'),
        })

        render(<IkhtisarView studentId={studentId} />)

        expect(screen.getByText('Gagal memuat data overview')).toBeDefined()
    })
})
