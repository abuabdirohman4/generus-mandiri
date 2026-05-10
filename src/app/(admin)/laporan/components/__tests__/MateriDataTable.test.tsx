import React from 'react'
import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MateriDataTable from '../MateriDataTable'
import { useLaporanStore } from '@/stores/laporanStore'

vi.mock('@/stores/laporanStore', () => ({
    useLaporanStore: vi.fn(),
}))

vi.mock('@/lib/icons', () => ({
    ReportIcon: () => <div data-testid="report-icon">ReportIcon</div>
}))

vi.mock('@/components/table/Table', () => ({
    default: ({ columns, data, renderCell }: any) => (
        <table>
            <thead>
                <tr>{columns.map((c: any) => <th key={c.key}>{c.label}</th>)}</tr>
            </thead>
            <tbody>
                {data.map((row: any, i: number) => (
                    <tr key={i}>
                        {columns.map((c: any) => <td key={c.key}>{renderCell(c, row)}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    )
}))

describe('MateriDataTable', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders actions column when viewMode is per_siswa', () => {
        ;(useLaporanStore as any).mockReturnValue({
            materiViewMode: 'per_siswa',
            setMateriViewMode: vi.fn(),
        })

        const mockSiswaRows = [
            { student_id: 's1', student_name: 'Budi', percentage: 80, tuntas_count: 8, total_materials: 10, avg_nilai: 85 }
        ]

        render(<MateriDataTable rows={[]} siswaRows={mockSiswaRows} isLoading={false} />)

        expect(screen.getByText('Detail')).toBeDefined()
        expect(screen.getByRole('link')).toBeDefined()
        expect(screen.getByRole('link').getAttribute('href')).toBe('/users/siswa/s1/materi')
    })

    it('does not render actions column when viewMode is per_materi', () => {
        ;(useLaporanStore as any).mockReturnValue({
            materiViewMode: 'per_materi',
            setMateriViewMode: vi.fn(),
        })

        const mockRows = [
            { material_item_id: 'm1', material_name: 'Materi X', material_type_name: 'Tipe A', category_name: 'Kategori 1', percentage: 70, tuntas_count: 7, total_students: 10, avg_nilai: 75 }
        ]

        render(<MateriDataTable rows={mockRows} siswaRows={[]} isLoading={false} />)

        expect(screen.queryByText('Detail')).toBeNull()
    })
})
