import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
    getUserProfile,
    getCurrentUserRole,
    checkStudentHasAttendance,
    getStudentClasses,
    getStudentBiodata,
    updateStudentBiodata,
    createStudent,
    deleteStudent,
    updateStudent,
    getStudentsPaginated,
} from '../actions'
import * as accessControlServer from '@/lib/accessControlServer'

vi.mock('@/lib/supabase/server', () => {
  const __m: any = {
    createClient: vi.fn(),
    createAdminClient: vi.fn(),
}
  __m.createAuthClient = vi.fn(() => __m.createClient?.())
  __m.createAdminAuthClient = vi.fn(() => __m.createAdminClient?.())
  return __m
})
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/accessControlServer', () => ({
    getTeacherAllowedClassIds: vi.fn(),
    getCurrentUserProfile: vi.fn(),
}))
vi.mock('../queries', async (importOriginal) => {
    const actual = await importOriginal<any>()
    return {
        ...actual,
        fetchStudentsPaginated: vi.fn(),
    }
})

// ─── Mock helpers ─────────────────────────────────────────────────────────────

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

function makeSupabase(options: { userId?: string; profile?: object } = {}) {
    const userId = options.userId ?? 'user-1'
    const profile = options.profile ?? {
        role: 'superadmin',
        kelompok_id: 'k1',
        desa_id: 'd1',
        daerah_id: 'da1',
        teacher_classes: [],
    }
    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
        },
        from: vi.fn((table: string) => {
            if (table === 'profiles') return makeQueryBuilder({ data: profile, error: null })
            return makeQueryBuilder({ data: null, error: null })
        }),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})

// ─── getUserProfile ───────────────────────────────────────────────────────────

describe('getUserProfile', () => {
    it('throws when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        await expect(getUserProfile()).rejects.toThrow('not authenticated')
    })

    it('throws when profile not found', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        await expect(getUserProfile()).rejects.toThrow('profile not found')
    })

    it('returns profile with classes array for teacher', async () => {
        const mockSupabase = makeSupabase({
            profile: {
                role: 'teacher',
                kelompok_id: null,
                desa_id: null,
                daerah_id: 'da1',
                teacher_classes: [{ classes: { id: 'c1', name: 'Kelas A' } }],
            },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getUserProfile()
        expect(result.role).toBe('teacher')
        expect(result.classes).toHaveLength(1)
        expect(result.class_id).toBe('c1')
    })

    it('returns profile with empty classes for admin', async () => {
        const mockSupabase = makeSupabase() // superadmin, teacher_classes: []
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getUserProfile()
        expect(result.role).toBe('superadmin')
        expect(result.classes).toEqual([])
        expect(result.class_id).toBeNull()
    })
})

// ─── getCurrentUserRole ───────────────────────────────────────────────────────

describe('getCurrentUserRole', () => {
    it('returns null when not authenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getCurrentUserRole()
        expect(result).toBeNull()
    })

    it('returns role when authenticated', async () => {
        const mockSupabase = makeSupabase({ profile: { role: 'admin' } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getCurrentUserRole()
        expect(result).toBe('admin')
    })
})

// ─── checkStudentHasAttendance ────────────────────────────────────────────────

describe('checkStudentHasAttendance', () => {
    it('returns false when no attendance records', async () => {
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await checkStudentHasAttendance('s1')
        expect(result).toBe(false)
    })

    it('returns true when attendance records exist', async () => {
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: { id: 'log-1', student_id: 's1' }, error: null })),
        }
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await checkStudentHasAttendance('s1')
        expect(result).toBe(true)
    })
})

// ─── getStudentClasses ────────────────────────────────────────────────────────

describe('getStudentClasses', () => {
    it('returns empty array on error', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: { message: 'error' } })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getStudentClasses('s1')
        expect(result).toEqual([])
    })

    it('returns classes array for student', async () => {
        const studentClassData = [
            { classes: { id: 'c1', name: 'Kelas A' } },
            { classes: { id: 'c2', name: 'Kelas B' } },
        ]
        const mockSupabase = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: studentClassData, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getStudentClasses('s1')
        expect(result).toHaveLength(2)
        expect(result[0].id).toBe('c1')
        expect(result[1].name).toBe('Kelas B')
    })
})

// ─── getStudentBiodata ────────────────────────────────────────────────────────

describe('getStudentBiodata', () => {
    it('returns success with data', async () => {
        const biodata = { id: 's1', name: 'Budi', nomor_induk: '001' }
        const mockSupabase = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: biodata, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getStudentBiodata('s1')
        expect(result.success).toBe(true)
        expect(result.data).toEqual(biodata)
    })

    it('returns error on failure', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: { message: 'DB error' } })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getStudentBiodata('s1')
        expect(result.success).toBe(false)
        expect(result.error).toBeTruthy()
    })
})

// ─── updateStudentBiodata ─────────────────────────────────────────────────────

describe('updateStudentBiodata', () => {
    it('returns success and calls revalidatePath on valid update', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await updateStudentBiodata('s1', { name: 'Budi Updated', gender: 'Laki-laki' })
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa/s1')
        expect(revalidatePath).toHaveBeenCalledWith('/rapot')
    })

    it('returns error on DB failure', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: { message: 'DB write error' } })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await updateStudentBiodata('s1', { name: 'Test' })
        expect(result.success).toBe(false)
        expect(result.error).toBeTruthy()
    })
})

// ─── createStudent ────────────────────────────────────────────────────────────

describe('createStudent', () => {
    it('throws when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const formData = new FormData()
        formData.append('name', 'Budi')
        formData.append('gender', 'Laki-laki')
        formData.append('classId', 'c1')

        const createResult = await createStudent(formData)
        expect(createResult.success).toBe(false)
    })

    it('throws validation error when name missing', async () => {
        const mockSupabase = makeSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const formData = new FormData()
        formData.append('gender', 'Laki-laki')
        formData.append('classId', 'c1')

        const result = await createStudent(formData)
        expect(result.success).toBe(false)
    })

    it('creates student and calls revalidatePath', async () => {
        const newStudent = { id: 'new-s1', name: 'Budi', gender: 'Laki-laki', class_id: 'c1' }
        const userProfile = { kelompok_id: 'k1', desa_id: 'd1', daerah_id: 'da1', role: 'superadmin' }
        const classData = { name: 'Kelas A' }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: userProfile, error: null })
                if (table === 'classes') return makeQueryBuilder({ data: classData, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: newStudent, error: null })
                return makeQueryBuilder({ data: null, error: null }) // student_classes insert
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const formData = new FormData()
        formData.append('name', 'Budi')
        formData.append('gender', 'Laki-laki')
        formData.append('classId', 'c1')

        const result = await createStudent(formData)
        expect(result.success).toBe(true)
        expect(result.student).toEqual(newStudent)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
        expect(revalidatePath).toHaveBeenCalledWith('/presensi')
    })
})

// ─── deleteStudent ────────────────────────────────────────────────────────────

describe('deleteStudent', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await deleteStudent('s1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when student not found', async () => {
        const userProfile = {
            id: 'user-1', full_name: 'Super', role: 'superadmin',
            daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1',
            permissions: { can_soft_delete_students: true },
        }
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: userProfile, error: null })),
        }
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: { code: 'PGRST116', message: 'not found' } })),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await deleteStudent('nonexistent')
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('soft deletes student and calls revalidatePath', async () => {
        const student = {
            id: 's1', name: 'Budi',
            daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1',
            status: 'active', deleted_at: null,
        }
        const userProfile = {
            id: 'user-1', full_name: 'Superadmin', role: 'superadmin',
            daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1',
            permissions: { can_soft_delete_students: true, can_hard_delete_students: true },
        }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: userProfile, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: student, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await deleteStudent('s1', false)
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
        expect(revalidatePath).toHaveBeenCalledWith('/presensi')
    })
})

// ─── updateStudent — hierarchical teacher (guru desa) ────────────────────────

describe('updateStudent — guru desa class permission', () => {
    const getTeacherAllowedClassIds = vi.mocked(accessControlServer.getTeacherAllowedClassIds)

    function makeGuruDesaSupabase() {
        const profile = {
            role: 'teacher',
            teacher_classes: [], // no direct assignments — hierarchical teacher
            desa_id: 'd1',
            kelompok_id: null,
            daerah_id: 'da1',
        }
        return {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'guru-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: profile, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
    }

    function makeFormData(classId: string) {
        const fd = new FormData()
        fd.append('name', 'Budi')
        fd.append('gender', 'Laki-laki')
        fd.append('classId', classId)
        return fd
    }

    it('allows guru desa to update student in a class within their desa scope', async () => {
        vi.mocked(getTeacherAllowedClassIds).mockResolvedValue(new Set(['c1', 'c2']))
        const mockSupabase = makeGuruDesaSupabase()
        const mockAdminClient = {
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: { id: 's1', name: 'Budi', gender: 'Laki-laki', class_id: 'c1' }, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await updateStudent('s1', makeFormData('c1'))
        expect(result.success).toBe(true)
    })

    it('blocks guru desa from updating student to a class outside their desa scope', async () => {
        vi.mocked(getTeacherAllowedClassIds).mockResolvedValue(new Set(['c1', 'c2']))
        const mockSupabase = makeGuruDesaSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await updateStudent('s1', makeFormData('c-other'))
        expect(result.success).toBe(false)
        expect(result.message).toContain('kelas yang Anda ajarkan')
    })

    it('allows guru desa with null allowedClassIds (no class master restrictions) to update any class in scope', async () => {
        vi.mocked(getTeacherAllowedClassIds).mockResolvedValue(null)
        const mockSupabase = makeGuruDesaSupabase()
        const mockAdminClient = {
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: { id: 's1', name: 'Budi', gender: 'Laki-laki', class_id: 'c-any' }, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await updateStudent('s1', makeFormData('c-any'))
        expect(result.success).toBe(true)
    })
})

// ─── getStudentsPaginated ─────────────────────────────────────────────────────

describe('getStudentsPaginated', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getStudentsPaginated({ page: 1, pageSize: 10 })
        expect(result.success).toBe(false)
        expect(result.message).toContain('Gagal memuat daftar siswa')
    })

    it('returns paginated data successfully for admin', async () => {
        const mockSupabase = makeSupabase({ profile: { role: 'superadmin' } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const { fetchStudentsPaginated } = await import('../queries')
        vi.mocked(fetchStudentsPaginated).mockResolvedValue({
            data: [{ 
                id: '1', 
                name: 'Student 1',
                gender: 'Laki-laki',
                class_id: 'c1',
                kelompok_id: 'k1',
                desa_id: 'd1',
                daerah_id: 'da1',
                status: 'active',
                created_at: '2026-07-11',
                updated_at: '2026-07-11',
                deleted_at: null,
                daerah: { name: 'da1_name' },
                desa: { name: 'd1_name' },
                kelompok: { name: 'k1_name' }
            }] as any,
            count: 1,
            error: null
        })

        const result = await getStudentsPaginated({ page: 1, pageSize: 10 })
        
        expect(result.success).toBe(true)
        expect(result.data).toEqual({ 
            rows: [{ 
                id: '1', 
                name: 'Student 1',
                gender: 'Laki-laki',
                class_id: 'c1',
                kelompok_id: 'k1',
                desa_id: 'd1',
                daerah_id: 'da1',
                status: 'active',
                created_at: '2026-07-11',
                updated_at: '2026-07-11',
                deleted_at: null,
                daerah: { name: 'da1_name' },
                desa: { name: 'd1_name' },
                kelompok: { name: 'k1_name' },
                daerah_name: 'da1_name',
                desa_name: 'd1_name',
                kelompok_name: 'k1_name'
            }], 
            totalCount: 1 
        })
        expect(fetchStudentsPaginated).toHaveBeenCalled()
    })

    it('enforces admin scoping via intersection', async () => {
        // Admin desa shouldn't be able to fetch another daerah's students
        const mockSupabase = makeSupabase({ profile: { role: 'admin', desa_id: 'desa_1', daerah_id: 'daerah_1' } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const { fetchStudentsPaginated } = await import('../queries')
        vi.mocked(fetchStudentsPaginated).mockResolvedValue({ data: [], count: 0, error: null })

        await getStudentsPaginated({ 
            page: 1, 
            pageSize: 10,
            filters: { kelompok: ['kelompok_lain'] } 
        })
        
        // Ensure that the query parameters have the admin's hard limits merged
        expect(fetchStudentsPaginated).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                filters: {
                    kelompok: ['kelompok_lain'],
                    desa: ['desa_1'],
                    daerah: ['daerah_1']
                }
            })
        )
    })

    it('enforces teacher class scoping', async () => {
        const mockSupabase = makeSupabase({ profile: { role: 'teacher', desa_id: 'desa_1', daerah_id: 'daerah_1' } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const { getTeacherAllowedClassIds } = await import('@/lib/accessControlServer')
        vi.mocked(getTeacherAllowedClassIds).mockResolvedValue(new Set(['class_1', 'class_2']))

        const { fetchStudentsPaginated } = await import('../queries')
        vi.mocked(fetchStudentsPaginated).mockResolvedValue({ data: [], count: 0, error: null })

        await getStudentsPaginated({ page: 1, pageSize: 10 })
        
        expect(fetchStudentsPaginated).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({
                teacherClassIds: ['class_1', 'class_2']
            })
        )
    })
})

