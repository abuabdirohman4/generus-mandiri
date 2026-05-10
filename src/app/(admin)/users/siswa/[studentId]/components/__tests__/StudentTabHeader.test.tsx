import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import StudentTabHeader from '../StudentTabHeader'
import { usePathname } from 'next/navigation'

// Mock next/navigation
const mockRouter = {
    push: vi.fn(),
}

vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useRouter: vi.fn(() => mockRouter),
}))

describe('StudentTabHeader', () => {
    const studentId = 'student-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders all 4 tabs correctly', () => {
        ;(usePathname as any).mockReturnValue(`/users/siswa/${studentId}`)
        
        render(<StudentTabHeader studentId={studentId} />)

        expect(screen.getByText('Profil')).toBeDefined()
        expect(screen.getByText('Presensi')).toBeDefined()
        expect(screen.getByText('Materi')).toBeDefined()
        expect(screen.getByText('Biodata')).toBeDefined()
    })

    it('highlights Profil tab when pathname is root of student detail', () => {
        ;(usePathname as any).mockReturnValue(`/users/siswa/${studentId}`)
        
        render(<StudentTabHeader studentId={studentId} />)

        const profilLink = screen.getByText('Profil').closest('a')!
        expect(profilLink.className).toContain('border-brand-500')
        
        const presensiLink = screen.getByText('Presensi').closest('a')!
        expect(presensiLink.className).toContain('border-transparent')
    })

    it('highlights Presensi tab when pathname contains /presensi', () => {
        ;(usePathname as any).mockReturnValue(`/users/siswa/${studentId}/presensi`)
        
        render(<StudentTabHeader studentId={studentId} />)

        const presensiLink = screen.getByText('Presensi').closest('a')!
        expect(presensiLink.className).toContain('border-brand-500')
        
        const profilLink = screen.getByText('Profil').closest('a')!
        expect(profilLink.className).toContain('border-transparent')
    })

    it('highlights Materi tab when pathname contains /materi', () => {
        ;(usePathname as any).mockReturnValue(`/users/siswa/${studentId}/materi`)
        
        render(<StudentTabHeader studentId={studentId} />)

        const materiLink = screen.getByText('Materi').closest('a')!
        expect(materiLink.className).toContain('border-brand-500')
    })

    it('highlights Biodata tab when pathname contains /biodata', () => {
        ;(usePathname as any).mockReturnValue(`/users/siswa/${studentId}/biodata`)
        
        render(<StudentTabHeader studentId={studentId} />)

        const biodataLink = screen.getByText('Biodata').closest('a')!
        expect(biodataLink.className).toContain('border-brand-500')
    })

    it('shows loading spinner when a tab is clicked', () => {
        ;(usePathname as any).mockReturnValue(`/users/siswa/${studentId}`)
        
        render(<StudentTabHeader studentId={studentId} />)

        const presensiLink = screen.getByText('Presensi').closest('a')!
        const { fireEvent } = require('@testing-library/react')
        fireEvent.click(presensiLink)

        expect(mockRouter.push).toHaveBeenCalledWith(`/users/siswa/${studentId}/presensi`)
        const spinner = document.querySelector('.animate-spin')
        expect(spinner).not.toBeNull()
    })
})
