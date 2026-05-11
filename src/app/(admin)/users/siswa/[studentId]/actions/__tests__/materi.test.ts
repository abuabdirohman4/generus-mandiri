import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createAdminClient } from '@/lib/supabase/server'
import { getStudentMateriProgress } from '../materi'

vi.mock('@/lib/supabase/server', () => ({
    createAdminClient: vi.fn(),
}))

function makeQueryBuilder(resolvedValue: any = { data: null, error: null }) {
    const b: any = {}
    b.select = vi.fn().mockReturnValue(b)
    b.eq = vi.fn().mockReturnValue(b)
    b.in = vi.fn().mockReturnValue(b)
    b.single = vi.fn().mockReturnValue(b)
    b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
    return b
}

describe('getStudentMateriProgress', () => {
    const studentId = 's1'
    const academicYearId = 'y1'
    const semester = 1

    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('returns empty grouped data if no progress records found', async () => {
        const mockSupabase = {
            from: vi.fn().mockReturnValue(makeQueryBuilder({ data: [], error: null }))
        }
        vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

        const result = await getStudentMateriProgress(studentId, academicYearId, semester)
        expect(result.grouped).toEqual({})
        expect(result.totalItems).toBe(0)
    })

    it('groups material progress by category correctly', async () => {
        const mockProgress = [
            { material_item_id: 'i1', nilai: 85 },
            { material_item_id: 'i2', nilai: 65 },
        ]
        const mockItems = [
            {
                id: 'i1',
                name: 'Materi 1',
                material_types: {
                    name: 'Tipe A',
                    material_categories: { name: 'Kategori X' }
                }
            },
            {
                id: 'i2',
                name: 'Materi 2',
                material_types: {
                    name: 'Tipe B',
                    material_categories: { name: 'Kategori Y' }
                }
            }
        ]

        const mockSupabase = {
            from: vi.fn((table) => {
                if (table === 'student_material_progress') return makeQueryBuilder({ data: mockProgress, error: null })
                if (table === 'material_items') return makeQueryBuilder({ data: mockItems, error: null })
                return makeQueryBuilder()
            })
        }
        vi.mocked(createAdminClient).mockReturnValue(mockSupabase as any)

        const result = await getStudentMateriProgress(studentId, academicYearId, semester)
        
        expect(result.totalItems).toBe(2)
        expect(result.totalTuntas).toBe(1) // Only 85 >= 70
        expect(result.grouped['Kategori X']).toHaveLength(1)
        expect(result.grouped['Kategori X'][0].material_name).toBe('Materi 1')
        expect(result.grouped['Kategori X'][0].grade).toBe('B') // 85 is B in getRateGrade
        expect(result.grouped['Kategori Y']).toHaveLength(1)
        expect(result.grouped['Kategori Y'][0].nilai).toBe(65)
    })
})
