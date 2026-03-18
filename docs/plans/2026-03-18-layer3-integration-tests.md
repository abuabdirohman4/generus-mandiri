# Layer 3 Integration Tests (sm-9hh) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Write integration tests (Layer 3) for all server actions in students/, classes/, and management/ domains using manual Supabase mock chaining (vi.fn) — fokus pada auth checks, permission validation, dan revalidatePath calls.

**Architecture:** Setiap actions.ts mengorkestrasikan auth → profile → Layer 1 queries → Layer 2 logic → revalidatePath. Test Layer 3 men-mock `createClient`, `createAdminClient`, dan `revalidatePath` via `vi.mock`, lalu memverifikasi alur orkestrasi — bukan re-test Layer 1/2 yang sudah 100% covered.

**Tech Stack:** Vitest, vi.mock, manual Supabase mock chaining (konsisten dengan 92 tests yang sudah ada)

---

## Konteks & Referensi

- Layer 1 tests: `students/__tests__/queries.test.ts`, `management/__tests__/queries.test.ts`, `classes/__tests__/queries.test.ts`
- Layer 2 tests: `students/__tests__/logic.test.ts`, `management/__tests__/logic.test.ts`, `classes/__tests__/logic.test.ts`
- Permissions tests: `students/__tests__/permissions.test.ts`
- Mock helpers: `src/test/mocks/supabase.ts`, `src/test/fixtures/students.ts`
- Actions yang di-test:
  - `students/actions.ts`: `getUserProfile`, `getAllStudents`, `createStudent`, `updateStudent`, `deleteStudent`, `checkStudentHasAttendance`, `getStudentClasses`, `assignStudentsToClass`, `createStudentsBatch`, `getCurrentUserRole`, `getStudentInfo`, `getStudentAttendanceHistory`, `getStudentBiodata`, `updateStudentBiodata`
  - `management/actions.ts`: `archiveStudent`, `unarchiveStudent`, `createTransferRequest`, `approveTransferRequest`, `rejectTransferRequest`, `cancelTransferRequest`, `getPendingTransferRequests`
  - `classes/actions.ts`: `getAllClasses`

---

## Pola Mock yang Digunakan

```typescript
// Di awal setiap test file:
vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
    createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
}))

// Di setiap test:
const mockSupabase = makeMockSupabase({ user, profile })
vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)
```

### Helper `makeMockSupabase`:
```typescript
function makeMockSupabase(overrides: { user?: any; profile?: any; fromData?: Record<string, any> } = {}) {
    const user = overrides.user ?? { id: 'user-1' }
    const profile = overrides.profile ?? { role: 'superadmin', kelompok_id: null, desa_id: null, daerah_id: null, teacher_classes: [] }

    // Track call order for sequential from() mocks
    let fromCallIndex = 0
    const fromResponses: Record<string, any> = overrides.fromData ?? {}

    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        },
        from: vi.fn((table: string) => makeQueryBuilder(fromResponses[table] ?? { data: null, error: null })),
    }
}

function makeQueryBuilder(resolvedValue: any) {
    const b: any = {}
    b.select = vi.fn().mockReturnValue(b)
    b.insert = vi.fn().mockReturnValue(b)
    b.update = vi.fn().mockReturnValue(b)
    b.delete = vi.fn().mockReturnValue(b)
    b.eq = vi.fn().mockReturnValue(b)
    b.in = vi.fn().mockReturnValue(b)
    b.is = vi.fn().mockReturnValue(b)
    b.order = vi.fn().mockReturnValue(b)
    b.limit = vi.fn().mockReturnValue(b)
    b.single = vi.fn().mockResolvedValue(resolvedValue)
    b.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)
    // terminal: awaiting builder itself resolves (for .insert().select() chains)
    b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
    return b
}
```

---

## Task 1: Setup helper di test file management/actions

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/management/__tests__/actions.test.ts`

### Step 1: Tulis kerangka file dengan vi.mock dan helper

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
    archiveStudent,
    unarchiveStudent,
    createTransferRequest,
    approveTransferRequest,
    rejectTransferRequest,
    cancelTransferRequest,
    getPendingTransferRequests,
} from '../actions'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
    createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

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

function makeSupabase(options: {
    userId?: string
    profile?: object
    extraFromResponses?: Record<string, any>
} = {}) {
    const userId = options.userId ?? 'user-1'
    const profile = options.profile ?? {
        id: userId,
        full_name: 'Superadmin',
        role: 'superadmin',
        daerah_id: 'da1',
        desa_id: 'd1',
        kelompok_id: 'k1',
        permissions: {
            can_archive_students: true,
            can_transfer_students: true,
        },
    }

    const fromMap: Record<string, any> = {
        profiles: { data: profile, error: null },
        ...options.extraFromResponses,
    }

    return {
        auth: {
            getUser: vi.fn().mockResolvedValue({ data: { user: { id: userId } }, error: null }),
        },
        from: vi.fn((table: string) => makeQueryBuilder(fromMap[table] ?? { data: null, error: null })),
    }
}

beforeEach(() => {
    vi.clearAllMocks()
})
```

### Step 2: Jalankan file kosong untuk memastikan tidak error

```bash
cd /Users/abuabdirohman/Documents/Programs/OpenSource/school-management
npx vitest run src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts 2>&1 | tail -20
```

Expected: 0 tests, no errors (file can be imported)

---

## Task 2: Tests untuk `archiveStudent` dan `unarchiveStudent`

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions/management/__tests__/actions.test.ts`

### Step 1: Tulis tests `archiveStudent`

Tambahkan setelah helper block:

```typescript
// ─── archiveStudent ───────────────────────────────────────────────────────────

describe('archiveStudent', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 's1', status: 'graduated' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when profile not found', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 's1', status: 'graduated' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('profile not found')
    })

    it('returns validation error for invalid status', async () => {
        const mockSupabase = makeSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 's1', status: 'deleted' as any })

        expect(result.success).toBe(false)
        expect(result.error).toBeTruthy()
    })

    it('returns error when student not found', async () => {
        const mockSupabase = makeSupabase({
            extraFromResponses: { students: { data: null, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await archiveStudent({ studentId: 'nonexistent', status: 'graduated' })

        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('archives student successfully and calls revalidatePath', async () => {
        const student = {
            id: 's1',
            name: 'Budi',
            daerah_id: 'da1',
            desa_id: 'd1',
            kelompok_id: 'k1',
            status: 'active',
        }
        const mockSupabase = makeSupabase({
            extraFromResponses: { students: { data: student, error: null } },
        })
        // admin client returns student for fetchStudentForManagement
        const mockAdminClient = makeSupabase({
            extraFromResponses: { students: { data: student, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await archiveStudent({ studentId: 's1', status: 'graduated', notes: 'Lulus' })

        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
        expect(revalidatePath).toHaveBeenCalledWith('/absensi')
    })
})

// ─── unarchiveStudent ─────────────────────────────────────────────────────────

describe('unarchiveStudent', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await unarchiveStudent('s1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when student already active', async () => {
        const student = { id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1', status: 'active' }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({ extraFromResponses: { students: { data: student, error: null } } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await unarchiveStudent('s1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('sudah dalam status aktif')
    })

    it('unarchives graduated student successfully', async () => {
        const student = { id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1', status: 'graduated' }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({ extraFromResponses: { students: { data: student, error: null } } })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await unarchiveStudent('s1')
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})
```

### Step 2: Jalankan dan verifikasi

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts 2>&1 | tail -30
```

Expected: semua tests PASS

### Step 3: Commit

```bash
git add src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts
git commit -m "test(sm-9hh): add Layer 3 tests for archiveStudent & unarchiveStudent"
```

---

## Task 3: Tests untuk `createTransferRequest`

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions/management/__tests__/actions.test.ts`

### Step 1: Tulis tests

```typescript
// ─── createTransferRequest ────────────────────────────────────────────────────

const validTransferInput = {
    studentIds: ['s1'],
    toDaerahId: 'da2',
    toDesaId: 'd2',
    toKelompokId: 'k2',
}

describe('createTransferRequest', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns validation error for empty studentIds', async () => {
        const mockSupabase = makeSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await createTransferRequest({ ...validTransferInput, studentIds: [] })
        expect(result.success).toBe(false)
        expect(result.error).toContain('minimal satu siswa')
    })

    it('returns error when students not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { students: { data: [], error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('creates pending transfer request for cross-org transfer (non-superadmin)', async () => {
        const studentData = [{ id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }]
        const adminProfile = {
            id: 'u1', full_name: 'Admin', role: 'admin',
            daerah_id: 'da1', desa_id: 'd1', kelompok_id: null,
            permissions: { can_transfer_students: true },
        }
        const mockSupabase = makeSupabase({ profile: adminProfile })

        // Admin client: returns students + empty pending requests + insert returns request
        let adminFromCallCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'students') {
                    // first call: fetchStudentsForTransfer
                    return makeQueryBuilder({ data: studentData, error: null })
                }
                if (table === 'transfer_requests') {
                    adminFromCallCount++
                    if (adminFromCallCount === 1) return makeQueryBuilder({ data: [], error: null }) // pending check
                    return makeQueryBuilder({ data: { id: 'req-1', status: 'pending' }, error: null }) // insert
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest({ ...validTransferInput, toDaerahId: 'da2' })
        expect(result.success).toBe(true)
        expect(result.autoApproved).toBe(false)
        expect(result.requestId).toBe('req-1')
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })

    it('auto-approves transfer for superadmin (same-org)', async () => {
        const studentData = [{ id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }]
        const mockSupabase = makeSupabase() // superadmin by default

        let adminFromCalls: string[] = []
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                adminFromCalls.push(table)
                if (table === 'students') return makeQueryBuilder({ data: studentData, error: null })
                if (table === 'transfer_requests') return makeQueryBuilder({ data: { id: 'req-auto', status: 'approved' }, error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(true)
        expect(result.autoApproved).toBe(true)
    })

    it('returns error when student has pending transfer', async () => {
        const studentData = [{ id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1' }]
        const pendingRequests = [{ student_ids: ['s1'], status: 'pending' }]
        const mockSupabase = makeSupabase()

        let adminTransferCallCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'students') return makeQueryBuilder({ data: studentData, error: null })
                if (table === 'transfer_requests') {
                    adminTransferCallCount++
                    if (adminTransferCallCount === 1) return makeQueryBuilder({ data: pendingRequests, error: null })
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await createTransferRequest(validTransferInput)
        expect(result.success).toBe(false)
        expect(result.error).toContain('Budi')
    })
})
```

### Step 2: Jalankan dan verifikasi

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts 2>&1 | tail -30
```

Expected: semua tests PASS

### Step 3: Commit

```bash
git add src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts
git commit -m "test(sm-9hh): add Layer 3 tests for createTransferRequest"
```

---

## Task 4: Tests untuk `approveTransferRequest`, `rejectTransferRequest`, `cancelTransferRequest`

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions/management/__tests__/actions.test.ts`

### Step 1: Tulis tests

```typescript
// ─── approveTransferRequest ───────────────────────────────────────────────────

describe('approveTransferRequest', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await approveTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('not authenticated')
    })

    it('returns error when request not found', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: null, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await approveTransferRequest('nonexistent')
        expect(result.success).toBe(false)
        expect(result.error).toContain('tidak ditemukan')
    })

    it('returns error when request already approved', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: {
                transfer_requests: {
                    data: { id: 'req-1', status: 'approved', student_ids: ['s1'], to_daerah_id: 'da2', to_desa_id: 'd2', to_kelompok_id: 'k2' },
                    error: null,
                },
            },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await approveTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('disetujui')
    })

    it('approves pending request and calls revalidatePath', async () => {
        const pendingRequest = {
            id: 'req-1',
            status: 'pending',
            student_ids: ['s1'],
            from_daerah_id: 'da1', from_desa_id: 'd1', from_kelompok_id: 'k1',
            to_daerah_id: 'da2', to_desa_id: 'd2', to_kelompok_id: 'k2',
            to_class_ids: [],
            requested_by: 'other-user',
        }
        const approvedRequest = { ...pendingRequest, status: 'approved', reviewed_by: 'user-1' }
        const mockSupabase = makeSupabase()

        let transferCallCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'transfer_requests') {
                    transferCallCount++
                    if (transferCallCount === 1) return makeQueryBuilder({ data: pendingRequest, error: null })
                    if (transferCallCount === 2) return makeQueryBuilder({ data: null, error: null }) // update status
                    return makeQueryBuilder({ data: approvedRequest, error: null }) // executeTransfer fetch
                }
                if (table === 'students') return makeQueryBuilder({ data: null, error: null }) // update org
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await approveTransferRequest('req-1', 'Disetujui')
        expect(result.success).toBe(true)
        expect(result.requestId).toBe('req-1')
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})

// ─── rejectTransferRequest ────────────────────────────────────────────────────

describe('rejectTransferRequest', () => {
    it('returns error when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const result = await rejectTransferRequest('req-1')
        expect(result.success).toBe(false)
    })

    it('returns error when request already rejected', async () => {
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: {
                transfer_requests: {
                    data: { id: 'req-1', status: 'rejected' },
                    error: null,
                },
            },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await rejectTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('ditolak')
    })

    it('rejects pending request and calls revalidatePath', async () => {
        const pendingRequest = {
            id: 'req-1', status: 'pending', student_ids: ['s1'],
            from_daerah_id: 'da1', from_desa_id: 'd1', from_kelompok_id: 'k1',
            to_daerah_id: 'da2', to_desa_id: 'd2', to_kelompok_id: 'k2',
        }
        const mockSupabase = makeSupabase()

        let callCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'transfer_requests') {
                    callCount++
                    if (callCount === 1) return makeQueryBuilder({ data: pendingRequest, error: null })
                    return makeQueryBuilder({ data: null, error: null })
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await rejectTransferRequest('req-1', 'Tidak valid')
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})

// ─── cancelTransferRequest ────────────────────────────────────────────────────

describe('cancelTransferRequest', () => {
    it('returns error when not the requester', async () => {
        const request = { id: 'req-1', status: 'pending', requested_by: 'other-user' }
        const mockSupabase = makeSupabase() // user-id is 'user-1'
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: request, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('pembuat request')
    })

    it('returns error when request is not pending', async () => {
        const request = { id: 'req-1', status: 'approved', requested_by: 'user-1' }
        const mockSupabase = makeSupabase()
        const mockAdminClient = makeSupabase({
            extraFromResponses: { transfer_requests: { data: request, error: null } },
        })
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('req-1')
        expect(result.success).toBe(false)
        expect(result.error).toContain('pending')
    })

    it('cancels request when requester cancels', async () => {
        const request = { id: 'req-1', status: 'pending', requested_by: 'user-1' }
        const mockSupabase = makeSupabase()

        let callCount = 0
        const mockAdminClient = {
            auth: { getUser: vi.fn() },
            from: vi.fn((table: string) => {
                if (table === 'transfer_requests') {
                    callCount++
                    if (callCount === 1) return makeQueryBuilder({ data: request, error: null })
                    return makeQueryBuilder({ data: null, error: null }) // update
                }
                return makeQueryBuilder({ data: null, error: null })
            }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)

        const result = await cancelTransferRequest('req-1')
        expect(result.success).toBe(true)
        expect(revalidatePath).toHaveBeenCalledWith('/users/siswa')
    })
})
```

### Step 2: Jalankan dan verifikasi

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts 2>&1 | tail -40
```

Expected: semua tests PASS

### Step 3: Commit

```bash
git add src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts
git commit -m "test(sm-9hh): add Layer 3 tests for approve/reject/cancel transfer"
```

---

## Task 5: Tests untuk `students/actions.ts` — bagian auth & sederhana

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/__tests__/actions.test.ts`

### Step 1: Tulis kerangka + tests untuk `getUserProfile`, `getCurrentUserRole`, `checkStudentHasAttendance`

```typescript
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
} from '../actions'

vi.mock('@/lib/supabase/server', () => ({
    createClient: vi.fn(),
    createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

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
            if (table === 'student_classes') return makeQueryBuilder({ data: [], error: null })
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

    it('returns profile with classes array', async () => {
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
```

### Step 2: Jalankan dan verifikasi

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/students/__tests__/actions.test.ts 2>&1 | tail -30
```

Expected: semua tests PASS

### Step 3: Commit

```bash
git add src/app/\(admin\)/users/siswa/actions/students/__tests__/actions.test.ts
git commit -m "test(sm-9hh): add Layer 3 tests for student helper actions"
```

---

## Task 6: Tests untuk `createStudent`, `deleteStudent`

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions/students/__tests__/actions.test.ts`

### Step 1: Tulis tests `createStudent`

```typescript
// ─── createStudent ────────────────────────────────────────────────────────────

describe('createStudent', () => {
    it('throws validation error when name missing', async () => {
        const mockSupabase = makeSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
        vi.mocked(createAdminClient).mockResolvedValue(mockSupabase as any)

        const formData = new FormData()
        formData.append('gender', 'Laki-laki')
        formData.append('classId', 'c1')

        await expect(createStudent(formData)).rejects.toThrow()
    })

    it('throws when unauthenticated', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }) },
            from: vi.fn(),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const formData = new FormData()
        formData.append('name', 'Budi')
        formData.append('gender', 'Laki-laki')
        formData.append('classId', 'c1')

        await expect(createStudent(formData)).rejects.toThrow('not authenticated')
    })

    it('creates student and calls revalidatePath', async () => {
        const newStudent = { id: 'new-s1', name: 'Budi', gender: 'Laki-laki', class_id: 'c1' }
        const userProfile = { kelompok_id: 'k1', desa_id: 'd1', daerah_id: 'da1', role: 'superadmin' }
        const classData = { name: 'Kelas A' }

        let fromCallCount = 0
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
        expect(revalidatePath).toHaveBeenCalledWith('/absensi')
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

    it('soft deletes student and calls revalidatePath', async () => {
        const student = { id: 's1', name: 'Budi', daerah_id: 'da1', desa_id: 'd1', kelompok_id: 'k1', status: 'active', deleted_at: null }
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
    })

    it('returns error when student not found', async () => {
        const userProfile = { id: 'user-1', full_name: 'Super', role: 'superadmin', permissions: {} }
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
})
```

### Step 2: Jalankan dan verifikasi

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/students/__tests__/actions.test.ts 2>&1 | tail -40
```

Expected: semua tests PASS

### Step 3: Commit

```bash
git add src/app/\(admin\)/users/siswa/actions/students/__tests__/actions.test.ts
git commit -m "test(sm-9hh): add Layer 3 tests for createStudent & deleteStudent"
```

---

## Task 7: Tests untuk `classes/actions.ts`

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/classes/__tests__/actions.test.ts`

### Step 1: Tulis tests

```typescript
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
    b.eq = vi.fn().mockReturnValue(b)
    b.in = vi.fn().mockReturnValue(b)
    b.is = vi.fn().mockReturnValue(b)
    b.order = vi.fn().mockReturnValue(b)
    b.limit = vi.fn().mockReturnValue(b)
    b.single = terminalMock
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

        await expect(getAllClasses()).rejects.toThrow('not authenticated')
    })

    it('throws when profile not found', async () => {
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: null, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        await expect(getAllClasses()).rejects.toThrow('profile not found')
    })

    it('returns classes sorted for admin role', async () => {
        const classData = [
            { id: 'c1', name: 'Kelas Caberawit', class_master_mappings: [] },
            { id: 'c2', name: 'Kelas Remaja', class_master_mappings: [] },
        ]
        const profile = { role: 'admin', kelompok_id: null, desa_id: null, daerah_id: 'da1', teacher_classes: [] }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: profile, error: null })
                if (table === 'classes') return makeQueryBuilder({ data: classData, error: null })
                if (table === 'class_master_mappings') return makeQueryBuilder({ data: [], error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getAllClasses()
        expect(Array.isArray(result)).toBe(true)
    })

    it('returns empty array for teacher with no classes and no hierarchy', async () => {
        const profile = { role: 'teacher', kelompok_id: null, desa_id: null, daerah_id: null, teacher_classes: [] }

        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn(() => makeQueryBuilder({ data: profile, error: null })),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getAllClasses()
        expect(result).toEqual([])
    })

    it('returns assigned classes for teacher with class assignments', async () => {
        const classData = [{ id: 'c1', name: 'Kelas A', class_master_mappings: [] }]
        const profile = {
            role: 'teacher',
            kelompok_id: null,
            desa_id: null,
            daerah_id: null,
            teacher_classes: [{ classes: { id: 'c1', name: 'Kelas A' }, class_id: 'c1' }],
        }

        let fromCallCount = 0
        const mockSupabase = {
            auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
            from: vi.fn((table: string) => {
                if (table === 'profiles') return makeQueryBuilder({ data: profile, error: null })
                if (table === 'classes') return makeQueryBuilder({ data: classData, error: null })
                if (table === 'class_master_mappings') return makeQueryBuilder({ data: [], error: null })
                return makeQueryBuilder({ data: null, error: null })
            }),
        }
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const result = await getAllClasses()
        expect(Array.isArray(result)).toBe(true)
    })
})
```

### Step 2: Jalankan dan verifikasi

```bash
npx vitest run src/app/\(admin\)/users/siswa/actions/classes/__tests__/actions.test.ts 2>&1 | tail -20
```

Expected: semua tests PASS

### Step 3: Commit

```bash
git add src/app/\(admin\)/users/siswa/actions/classes/__tests__/actions.test.ts
git commit -m "test(sm-9hh): add Layer 3 tests for getAllClasses"
```

---

## Task 8: Verifikasi final semua tests dan tutup issue

### Step 1: Jalankan semua tests baru sekaligus

```bash
npx vitest run \
  src/app/\(admin\)/users/siswa/actions/management/__tests__/actions.test.ts \
  src/app/\(admin\)/users/siswa/actions/students/__tests__/actions.test.ts \
  src/app/\(admin\)/users/siswa/actions/classes/__tests__/actions.test.ts \
  2>&1 | tail -40
```

Expected: semua tests PASS, total ~35+ tests

### Step 2: Jalankan semua tests siswa untuk memastikan tidak ada regresi

```bash
npx vitest run src/app/\(admin\)/users/siswa/ 2>&1 | tail -20
```

Expected: semua PASS (Layer 1 + 2 + 3 tests)

### Step 3: Tutup issue sm-9hh

```bash
bd --no-daemon close sm-9hh --reason="Layer 3 integration tests written for management/actions.ts (archiveStudent, unarchiveStudent, createTransferRequest, approveTransferRequest, rejectTransferRequest, cancelTransferRequest), students/actions.ts (getUserProfile, getCurrentUserRole, checkStudentHasAttendance, getStudentClasses, getStudentBiodata, updateStudentBiodata, createStudent, deleteStudent), dan classes/actions.ts (getAllClasses). ~35 tests total menggunakan vi.mock pattern yang konsisten dengan 92 tests Layer 1 & 2 yang sudah ada."
```
