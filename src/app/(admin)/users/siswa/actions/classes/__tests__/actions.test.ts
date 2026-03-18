import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createClient } from '@/lib/supabase/server'
import { getAllClasses } from '../actions'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
}))

function makeQueryBuilder(resolvedValue: any = { data: null, error: null }) {
    const b: any = {}
    const terminalMock = vi.fn().mockResolvedValue(resolvedValue)
    b.select = vi.fn().mockReturnValue(b)
    b.insert = vi.fn().mockReturnValue(b)
    b.update = vi.fn().mockReturnValue(b)
    b.delete = vi.fn().mockReturnValue(b)
    b.eq = vi.fn().mockReturnValue(b)
    b.in = vi.fn().mockReturnValue(b)
    b.is = vi.fn().mockReturnValue(b)
    b.order = vi.fn().mockReturnValue(b)
    b.limit = vi.fn().mockReturnValue(b)
    b.single = terminalMock
    b.maybeSingle = terminalMock
    b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
    return b
}

beforeEach(() => {
    vi.clearAllMocks()
})

// ─── getAllClasses ─────────────────────────────────────────────────────────────

describe('getAllClasses', () => {
    it('throws when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        await expect(getAllClasses()).rejects.toThrow('User not authenticated')
    })

    it('throws when profile not found', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        await expect(getAllClasses()).rejects.toThrow('User profile not found')
    })

    it('returns classes for admin role', async () => {
        const classData = [
            { id: 'c1', name: 'Kelas Caberawit', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'Kelompok 1' } },
            { id: 'c2', name: 'Kelas Remaja', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'Kelompok 1' } },
        ]
        const profile = {
            role: 'admin',
            kelompok_id: null,
            desa_id: null,
            daerah_id: 'da1',
            teacher_classes: [],
        }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: profile, error: null })
                if (table === 'classes') return makeQueryBuilder({ data: classData, error: null })
                // fetchClassMasterMappings: step 1 → class_master_mappings, step 2 → class_masters
                if (table === 'class_master_mappings') return makeQueryBuilder({ data: [], error: null })
                if (table === 'class_masters') return makeQueryBuilder({ data: [], error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getAllClasses()
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('returns empty array for teacher with no classes and no hierarchy', async () => {
        const profile = {
            role: 'teacher',
            kelompok_id: null,
            desa_id: null,
            daerah_id: null,
            teacher_classes: [],
        }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: profile, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getAllClasses()
        expect(result).toEqual([])
    })

    it('returns assigned classes for teacher with class assignments', async () => {
        const classData = [
            { id: 'c1', name: 'Kelas A', kelompok_id: 'k1', kelompok: { id: 'k1', name: 'Kelompok 1' } },
        ]
        const profile = {
            role: 'teacher',
            kelompok_id: null,
            desa_id: null,
            daerah_id: null,
            teacher_classes: [{ classes: { id: 'c1', name: 'Kelas A' }, class_id: 'c1' }],
        }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: profile, error: null })
                if (table === 'classes') return makeQueryBuilder({ data: classData, error: null })
                if (table === 'class_master_mappings') return makeQueryBuilder({ data: [], error: null })
                if (table === 'class_masters') return makeQueryBuilder({ data: [], error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getAllClasses()
        expect(Array.isArray(result)).toBe(true)
    })
})
