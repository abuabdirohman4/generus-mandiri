import { describe, it, expect, vi } from 'vitest'
import { fetchStudentsInClasses } from '../queries'

// student_classes chain: from('student_classes').select().in() → resolves { data, error }
function junctionMock(pairs: { student_id: string; class_id: string }[]) {
    const mockIn = vi.fn().mockResolvedValue({ data: pairs, error: null })
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
    return { select: mockSelect }
}

// students chain: from('students').select().in().eq().is().range() → resolves { data, error }
function studentsMock(students: any[]) {
    const mockRange = vi.fn().mockResolvedValue({ data: students, error: null })
    const mockIs = vi.fn().mockReturnValue({ range: mockRange })
    const mockEq = vi.fn().mockReturnValue({ is: mockIs })
    const mockIn = vi.fn().mockReturnValue({ eq: mockEq })
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
    return { select: mockSelect }
}

function makeSupabase(junctionPairs: { student_id: string; class_id: string }[], students: any[]) {
    const junction = junctionMock(junctionPairs)
    const studentsTable = studentsMock(students)
    const from = vi.fn((table: string) => {
        if (table === 'student_classes') return junction
        if (table === 'students') return studentsTable
        throw new Error(`unexpected table: ${table}`)
    })
    return { from } as any
}

describe('fetchStudentsInClasses', () => {
    it('returns empty immediately when classIds is empty', async () => {
        const supabase = makeSupabase([], [])
        const result = await fetchStudentsInClasses(supabase, [])
        expect(result).toEqual({ data: [], error: null })
        expect(supabase.from).not.toHaveBeenCalled()
    })

    it('matches student via student_classes junction, not students.class_id (regresi dasar)', async () => {
        const supabase = makeSupabase(
            [{ student_id: 's1', class_id: 'kelas-1' }],
            [{ id: 's1', name: 'Budi', gender: 'Laki-laki', kelompok_id: 'k1', status: 'active' }]
        )

        const result = await fetchStudentsInClasses(supabase, ['kelas-1'])

        expect(supabase.from).toHaveBeenCalledWith('student_classes')
        expect(supabase.from).toHaveBeenCalledWith('students')
        expect(result.data).toEqual([
            { id: 's1', name: 'Budi', gender: 'Laki-laki', kelompok_id: 'k1', status: 'active', class_id: 'kelas-1' },
        ])
    })

    it('siswa multi-kelas (stopper + promotable) muncul dengan from_class_id = kelas promotable, bukan primary', async () => {
        // Siswa terdaftar di 2 kelas via junction: "Pengurus" (stopper, tidak diminta) dan "SMA 3" (promotable, diminta).
        // students.class_id (primary, tidak lagi dipakai) seharusnya menunjuk ke "Pengurus" — tapi field itu
        // sudah tidak di-select sama sekali; hasil harus pakai class_id dari junction match ("SMA 3").
        const supabase = makeSupabase(
            [{ student_id: 's1', class_id: 'sma-3' }], // hanya kelas yang diminta (sma-3) yang muncul di junction match
            [{ id: 's1', name: 'Aeesyata', gender: 'Perempuan', kelompok_id: 'k1', status: 'active' }]
        )

        const result = await fetchStudentsInClasses(supabase, ['sma-3'])

        expect(result.data).toHaveLength(1)
        expect(result.data[0].class_id).toBe('sma-3')
        expect(result.data[0].id).toBe('s1')
    })

    it('siswa yang match ke >1 classIds sekaligus menghasilkan 1 baris per pasangan', async () => {
        const supabase = makeSupabase(
            [
                { student_id: 's1', class_id: 'kelas-a' },
                { student_id: 's1', class_id: 'kelas-b' },
            ],
            [{ id: 's1', name: 'Budi', gender: 'Laki-laki', kelompok_id: 'k1', status: 'active' }]
        )

        const result = await fetchStudentsInClasses(supabase, ['kelas-a', 'kelas-b'])

        expect(result.data).toHaveLength(2)
        expect(result.data.map((r: any) => r.class_id).sort()).toEqual(['kelas-a', 'kelas-b'])
    })

    it('returns empty when no junction match found (tidak query students)', async () => {
        const supabase = makeSupabase([], [])
        const result = await fetchStudentsInClasses(supabase, ['kelas-kosong'])
        expect(result).toEqual({ data: [], error: null })
        expect(supabase.from).toHaveBeenCalledWith('student_classes')
        expect(supabase.from).not.toHaveBeenCalledWith('students')
    })

    it('mengabaikan siswa yang tidak aktif/dihapus (tidak muncul di hasil students query)', async () => {
        // junction match ada, tapi query students (filter status=active, deleted_at null) tidak mengembalikannya
        const supabase = makeSupabase([{ student_id: 's1', class_id: 'kelas-1' }], [])
        const result = await fetchStudentsInClasses(supabase, ['kelas-1'])
        expect(result.data).toEqual([])
    })
})
