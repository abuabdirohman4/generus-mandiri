import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/app/(admin)/tahun-ajaran/actions/academic-years', () => ({
    getAcademicYears: vi.fn(() => Promise.resolve([{ id: 'year-1', name: '2024/2025' }])),
    getActiveAcademicYear: vi.fn(() => Promise.resolve({ id: 'year-1', name: '2024/2025' })),
}))

vi.mock('../../actions/materi', () => ({
    getStudentMateriProgress: vi.fn(),
}))

vi.mock('@/app/(admin)/materi/actions/categories/actions', () => ({
    getMaterialCategories: vi.fn(() => Promise.resolve([
        { id: 'cat-1', name: 'Kategori 1', display_order: 1 },
        { id: 'cat-2', name: 'Kategori 2', display_order: 2 },
    ])),
}))

vi.mock('@/components/form/input/InputFilter', () => ({
    default: ({ label, value }: any) => <div data-testid="input-filter">{label}: {value}</div>
}))

vi.mock('swr', () => ({
    default: vi.fn(),
}))

vi.mock('@/components/table/Table', () => ({
    default: ({ columns, data, renderCell, emptyMessage }: any) => (
        <div data-testid="data-table-container">
            {data.length === 0 && <div>{emptyMessage}</div>}
            <table data-testid="data-table">
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
        </div>
    )
}))

// Now import the component and the mocked functions
import MateriView from '../MateriView'
import useSWR from 'swr'

describe('MateriView', () => {
    const studentId = 'student-123'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('renders filters correctly including Category', async () => {
        vi.mocked(useSWR).mockReturnValue({ data: { grouped: {}, totalTuntas: 0, totalItems: 0 }, isLoading: false, error: null, mutate: vi.fn(), isValidating: false } as any)

        render(<MateriView studentId={studentId} />)

        await waitFor(() => {
            expect(screen.getByText('Tahun Ajaran: year-1')).toBeDefined()
        })
        expect(screen.getByText('Semester: 1')).toBeDefined()
        expect(screen.getByText(/Kategori:/i)).toBeDefined()
    })

    it('shows empty state when no data is returned', async () => {
        vi.mocked(useSWR).mockReturnValue({ data: { grouped: {}, totalTuntas: 0, totalItems: 0 }, isLoading: false, error: null, mutate: vi.fn(), isValidating: false } as any)

        render(<MateriView studentId={studentId} />)

        await waitFor(() => {
            expect(screen.getByText('Belum ada data pencapaian materi')).toBeDefined()
        })
    })

    it('renders progress data in DataTable correctly', async () => {
        const mockResult = {
            grouped: {
                'Kategori 1': [
                    {
                        material_item_id: 'item-1',
                        material_name: 'Materi A',
                        type_name: 'Jenis X',
                        category_name: 'Kategori 1',
                        nilai: 85,
                        grade: 'B',
                        colorClass: 'text-blue-500'
                    }
                ]
            },
            totalTuntas: 1,
            totalItems: 1
        }
        vi.mocked(useSWR).mockReturnValue({ data: mockResult, isLoading: false, error: null, mutate: vi.fn(), isValidating: false } as any)

        render(<MateriView studentId={studentId} />)

        expect(await screen.findByTestId('data-table')).toBeDefined()
        expect(screen.getByText('Materi A')).toBeDefined()
        expect(screen.getAllByText('Kategori 1').length).toBeGreaterThan(0)
        expect(screen.getByText('85')).toBeDefined()
        expect(screen.getByText(/B/i)).toBeDefined()
    })
})
