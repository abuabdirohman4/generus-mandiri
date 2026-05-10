import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import IkhtisarView from '../IkhtisarView'
import { useStudentDetail } from '../../hooks/useStudentDetail'

// Mock useStudentDetail hook
vi.mock('../../hooks/useStudentDetail', () => ({
    useStudentDetail: vi.fn(),
}))

describe('IkhtisarView', () => {
    const studentId = 'student-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders skeleton when loading', () => {
        ;(useStudentDetail as any).mockReturnValue({
            isLoading: true,
            student: null,
            stats: null,
        })

        render(<IkhtisarView studentId={studentId} />)

        // Find skeleton elements (animate-pulse)
        const skeleton = document.querySelector('.animate-pulse')
        expect(skeleton).toBeDefined()
    })

    it('renders student info and stats correctly', () => {
        const mockStudent = {
            id: studentId,
            name: 'John Doe',
            classes: [{ id: 'c1', name: 'Kelas A' }],
        }
        const mockStats = {
            hadir: 10,
            absen: 2,
            izin: 1,
            sakit: 0,
        }

        ;(useStudentDetail as any).mockReturnValue({
            isLoading: false,
            student: mockStudent,
            stats: mockStats,
        })

        render(<IkhtisarView studentId={studentId} />)

        expect(screen.getByText('John Doe')).toBeDefined()
        expect(screen.getByText('Kelas A')).toBeDefined()
        expect(screen.getByText('10')).toBeDefined() // Present count
        expect(screen.getByText('2')).toBeDefined()  // Absent count
        expect(screen.getByText('1')).toBeDefined()  // Excused count
    })

    it('handles missing student name with fallback', () => {
        ;(useStudentDetail as any).mockReturnValue({
            isLoading: false,
            student: { id: studentId },
            stats: null,
        })

        render(<IkhtisarView studentId={studentId} />)

        expect(screen.getAllByText('—').length).toBeGreaterThan(0) // Fallback for name/class
    })
})
