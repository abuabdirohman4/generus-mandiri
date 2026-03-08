# Apply 3-Layer Pattern to users/siswa - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor users/siswa/actions/ from monolithic structure (3,038 lines, mixed layers) to domain-based 3-layer pattern with separated files.

**Architecture:** Split 3 domains (students, classes, management) into queries.ts (Layer 1), logic.ts (Layer 2), actions.ts (Layer 3). Move @/lib/studentPermissions.ts to students/permissions.ts. Maintain 100% backward compatibility via index.ts re-exports.

**Tech Stack:** Next.js 15, TypeScript 5, Supabase, Vitest

**Reference:** sm-d15 (absensi 3-layer refactoring), docs/plans/2026-03-08-siswa-actions-design.md

---

## Task 1: Create folder structure

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/`
- Create: `src/app/(admin)/users/siswa/actions/classes/`
- Create: `src/app/(admin)/users/siswa/actions/management/`
- Create: `src/app/(admin)/users/siswa/actions/students/__tests__/`
- Create: `src/app/(admin)/users/siswa/actions/classes/__tests__/`
- Create: `src/app/(admin)/users/siswa/actions/management/__tests__/`

**Step 1: Create all domain folders**

```bash
mkdir -p src/app/\(admin\)/users/siswa/actions/students
mkdir -p src/app/\(admin\)/users/siswa/actions/classes
mkdir -p src/app/\(admin\)/users/siswa/actions/management
```

**Step 2: Create test folders**

```bash
mkdir -p src/app/\(admin\)/users/siswa/actions/students/__tests__
mkdir -p src/app/\(admin\)/users/siswa/actions/classes/__tests__
mkdir -p src/app/\(admin\)/users/siswa/actions/management/__tests__
```

**Step 3: Verify folder structure**

```bash
tree src/app/\(admin\)/users/siswa/actions/ -d -L 2
```

Expected output:
```
actions/
├── classes
│   └── __tests__
├── management
│   └── __tests__
└── students
    └── __tests__
```

**Step 4: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/
git commit -m "refactor(siswa): create 3-layer folder structure

Create domain folders for students, classes, management.
Prepare for sm-d15 pattern refactoring.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Move studentPermissions.ts to students/permissions.ts

**Files:**
- Move: `src/lib/studentPermissions.ts` → `src/app/(admin)/users/siswa/actions/students/permissions.ts`
- Read: `src/lib/studentPermissions.ts` (to preserve content)

**Step 1: Copy permission file to new location**

```bash
cp src/lib/studentPermissions.ts src/app/\(admin\)/users/siswa/actions/students/permissions.ts
```

**Step 2: Verify file content preserved**

```bash
wc -l src/lib/studentPermissions.ts src/app/\(admin\)/users/siswa/actions/students/permissions.ts
```

Expected: Same line count (~398 lines)

**Step 3: Check imports in permissions.ts**

```bash
grep "from '@/lib" src/app/\(admin\)/users/siswa/actions/students/permissions.ts
```

Expected: Should see `from '@/lib/accessControl'` (keep this - shared utility)

**Step 4: Delete old file (will do later after updating imports)**

NOTE: Do NOT delete `src/lib/studentPermissions.ts` yet. Will delete in Task 12 after updating all component imports.

**Step 5: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/permissions.ts
git commit -m "refactor(siswa): move permissions to students domain

Copy studentPermissions.ts to students/permissions.ts.
Old file will be deleted after updating component imports.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create students/queries.ts (Layer 1)

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/queries.ts`
- Read: `src/app/(admin)/users/siswa/actions.ts:70-467,713-755,887-965,1069-1118,1409-1629`

**Step 1: Create queries.ts with header**

Create `src/app/(admin)/users/siswa/actions/students/queries.ts`:

```typescript
/**
 * Student Queries (Layer 1)
 *
 * Database queries for student operations.
 * NO 'use server' directive - pure query builders.
 * All functions accept supabase client as parameter for testability.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

```

**Step 2: Extract fetchAllStudents from actions.ts:70-467**

Read `actions.ts` lines 70-467 (getAllStudents function body).

Add to `queries.ts`:

```typescript
export async function fetchAllStudents(
  supabase: SupabaseClient,
  classId?: string
) {
  let query = supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      class_id,
      kelompok_id,
      desa_id,
      daerah_id,
      status,
      created_at,
      updated_at,
      student_classes(
        classes:class_id(id, name)
      ),
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name)
    `)
    .is('deleted_at', null)
    .order('name')

  // Filter by class if classId provided
  if (classId) {
    const classIds = classId.split(',')
    const { data: studentClassData } = await supabase
      .from('student_classes')
      .select('student_id')
      .in('class_id', classIds)

    if (studentClassData && studentClassData.length > 0) {
      const studentIds = studentClassData.map(sc => sc.student_id)
      query = query.in('id', studentIds)
    } else {
      // No students in these classes
      return { data: [], error: null }
    }
  }

  return await query
}
```

**Step 3: Extract insertStudent from actions.ts:713-730**

Add to `queries.ts`:

```typescript
export async function insertStudent(
  supabase: SupabaseClient,
  data: {
    name: string
    gender: string
    class_id: string
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
  }
) {
  return await supabase
    .from('students')
    .insert(data)
    .select()
    .single()
}
```

**Step 4: Extract insertStudentClass from actions.ts:733-755**

Add to `queries.ts`:

```typescript
export async function insertStudentClass(
  supabase: SupabaseClient,
  studentId: string,
  classId: string
) {
  return await supabase
    .from('student_classes')
    .insert({
      student_id: studentId,
      class_id: classId
    })
    .select()
}
```

**Step 5: Extract updateStudentRecord from actions.ts:887-913**

Add to `queries.ts`:

```typescript
export async function updateStudentRecord(
  supabase: SupabaseClient,
  studentId: string,
  data: {
    name: string
    gender: string
    class_id: string
    kelompok_id?: string | null
    desa_id?: string | null
    daerah_id?: string | null
    updated_at: string
  }
) {
  return await supabase
    .from('students')
    .update(data)
    .eq('id', studentId)
    .select(`
      id,
      name,
      gender,
      class_id,
      created_at,
      updated_at
    `)
    .single()
}
```

**Step 6: Extract syncStudentClasses operations from actions.ts:919-965**

Add to `queries.ts`:

```typescript
export async function deleteStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
) {
  return await supabase
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
    .in('class_id', classIds)
}

export async function insertStudentClasses(
  supabase: SupabaseClient,
  studentId: string,
  classIds: string[]
) {
  const assignments = classIds.map(classId => ({
    student_id: studentId,
    class_id: classId
  }))

  return await supabase
    .from('student_classes')
    .insert(assignments)
}

export async function fetchCurrentStudentClasses(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('student_classes')
    .select('class_id')
    .eq('student_id', studentId)
}
```

**Step 7: Extract delete operations from actions.ts:1069-1118**

Add to `queries.ts`:

```typescript
export async function softDeleteStudent(
  supabase: SupabaseClient,
  studentId: string,
  userId: string
) {
  return await supabase
    .from('students')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId
    })
    .eq('id', studentId)
}

export async function hardDeleteStudent(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .delete()
    .eq('id', studentId)
}

export async function deleteStudentClassesByStudentId(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('student_classes')
    .delete()
    .eq('student_id', studentId)
}
```

**Step 8: Extract fetch operations from actions.ts:1409-1629**

Add to `queries.ts`:

```typescript
export async function fetchStudentById(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select(`
      id,
      name,
      gender,
      class_id,
      student_classes(
        classes:class_id(id, name)
      )
    `)
    .is('deleted_at', null)
    .eq('id', studentId)
    .single()
}

export async function fetchStudentBiodata(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select(`
      id,
      name,
      nomor_induk,
      gender,
      tempat_lahir,
      tanggal_lahir,
      anak_ke,
      alamat,
      nomor_telepon,
      nama_ayah,
      nama_ibu,
      alamat_orangtua,
      telepon_orangtua,
      pekerjaan_ayah,
      pekerjaan_ibu,
      nama_wali,
      alamat_wali,
      pekerjaan_wali,
      kelompok_id,
      kelompok:kelompok_id(id, name),
      desa_id,
      desa:desa_id(id, name),
      daerah_id,
      daerah:daerah_id(id, name),
      created_at,
      updated_at
    `)
    .eq('id', studentId)
    .is('deleted_at', null)
    .single()
}

export async function updateStudentBiodata(
  supabase: SupabaseClient,
  studentId: string,
  biodata: any
) {
  return await supabase
    .from('students')
    .update(biodata)
    .eq('id', studentId)
}

export async function fetchStudentAttendanceHistory(
  supabase: SupabaseClient,
  studentId: string,
  startDate: string,
  endDate: string
) {
  return await supabase
    .from('attendance_logs')
    .select(`
      id,
      date,
      status,
      reason,
      meeting_id,
      meetings!inner(
        id,
        title,
        topic,
        description,
        meeting_type_code,
        classes (
          id,
          name,
          class_master_mappings (
            class_master:class_master_id (
              category:category_id (
                is_sambung_capable
              )
            )
          )
        )
      )
    `)
    .eq('student_id', studentId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })
}

export async function checkStudentHasAttendance(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('attendance_logs')
    .select('id')
    .eq('student_id', studentId)
    .limit(1)
    .maybeSingle()
}
```

**Step 9: Add batch operations**

Add to `queries.ts`:

```typescript
export async function insertStudentsBatch(
  supabase: SupabaseClient,
  students: Array<{
    name: string
    gender: string
    class_id: string
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
  }>
) {
  return await supabase
    .from('students')
    .insert(students)
    .select()
}

export async function insertStudentClassesBatch(
  supabase: SupabaseClient,
  assignments: Array<{
    student_id: string
    class_id: string
  }>
) {
  return await supabase
    .from('student_classes')
    .insert(assignments)
}
```

**Step 10: Type-check**

```bash
npm run type-check
```

Expected: No errors in queries.ts

**Step 11: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/queries.ts
git commit -m "refactor(siswa): create students/queries.ts Layer 1

Extract all database queries from actions.ts.
All functions accept supabase client for testability.
NO 'use server' directive.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Create students/logic.ts (Layer 2)

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/logic.ts`
- Read: `src/app/(admin)/users/siswa/actions.ts:470-613,631-633,656-698`

**Step 1: Create logic.ts with header**

Create `src/app/(admin)/users/siswa/actions/students/logic.ts`:

```typescript
/**
 * Student Logic (Layer 2)
 *
 * Pure business logic for student operations.
 * NO 'use server' directive - testable without mocking.
 * 100% pure functions (no side effects, no DB calls).
 */

import type { StudentWithClasses } from '@/types/student'

```

**Step 2: Extract transformStudentsData from actions.ts:470-613**

Read actions.ts transformStudentsData helper function.

Add to `logic.ts`:

```typescript
export function transformStudentsData(students: any[]): StudentWithClasses[] {
  if (!Array.isArray(students)) {
    return []
  }

  return students
    .filter(student => student && typeof student === 'object')
    .map(student => {
      try {
        // Extract classes from junction table
        const studentClasses = Array.isArray(student.student_classes) ? student.student_classes : []
        const classesArray = studentClasses
          .filter((sc: any) => sc && sc.classes && typeof sc.classes === 'object')
          .map((sc: any) => sc.classes)
          .filter((cls: any) => cls && (cls.id || cls.name))
          .map((cls: any) => ({
            id: String(cls.id || ''),
            name: String(cls.name || '')
          }))

        // Get primary class (first class) for backward compatibility
        const primaryClass = classesArray[0] || null

        // Safely extract daerah, desa, kelompok names
        const getDaerahName = () => {
          if (!student.daerah) return ''
          if (Array.isArray(student.daerah)) {
            if (student.daerah.length > 0 && student.daerah[0] && typeof student.daerah[0] === 'object' && 'name' in student.daerah[0]) {
              return String((student.daerah[0] as any).name || '')
            }
            return ''
          }
          if (typeof student.daerah === 'object' && student.daerah !== null && 'name' in student.daerah) {
            return String((student.daerah as any).name || '')
          }
          return ''
        }

        const getDesaName = () => {
          if (!student.desa) return ''
          if (Array.isArray(student.desa)) {
            if (student.desa.length > 0 && student.desa[0] && typeof student.desa[0] === 'object' && 'name' in student.desa[0]) {
              return String((student.desa[0] as any).name || '')
            }
            return ''
          }
          if (typeof student.desa === 'object' && student.desa !== null && 'name' in student.desa) {
            return String((student.desa as any).name || '')
          }
          return ''
        }

        const getKelompokName = () => {
          if (!student.kelompok) return ''
          if (Array.isArray(student.kelompok)) {
            if (student.kelompok.length > 0 && student.kelompok[0] && typeof student.kelompok[0] === 'object' && 'name' in student.kelompok[0]) {
              return String((student.kelompok[0] as any).name || '')
            }
            return ''
          }
          if (typeof student.kelompok === 'object' && student.kelompok !== null && 'name' in student.kelompok) {
            return String((student.kelompok as any).name || '')
          }
          return ''
        }

        return {
          ...student,
          classes: Array.isArray(classesArray) ? classesArray : [],
          class_id: primaryClass?.id || student.class_id || null,
          class_name: primaryClass?.name || '',
          daerah_name: getDaerahName(),
          desa_name: getDesaName(),
          kelompok_name: getKelompokName(),
          status: student.status || 'active'
        }
      } catch (error) {
        console.error('Error transforming student data:', error, student)
        // Return minimal valid student object
        return {
          id: String(student.id || ''),
          name: String(student.name || ''),
          gender: student.gender || null,
          class_id: student.class_id || null,
          kelompok_id: student.kelompok_id || null,
          desa_id: student.desa_id || null,
          daerah_id: student.daerah_id || null,
          created_at: String(student.created_at || ''),
          updated_at: String(student.updated_at || ''),
          classes: [],
          class_name: '',
          daerah_name: '',
          desa_name: '',
          kelompok_name: '',
          status: student.status || 'active'
        }
      }
    })
}
```

**Step 3: Extract validation logic from actions.ts:631-633**

Add to `logic.ts`:

```typescript
export function validateStudentData(data: {
  name?: string
  gender?: string
  classId?: string
}): { ok: boolean; error?: string } {
  if (!data.name || !data.gender || !data.classId) {
    return { ok: false, error: 'Semua field harus diisi' }
  }

  if (!['Laki-laki', 'Perempuan'].includes(data.gender)) {
    return { ok: false, error: 'Jenis kelamin tidak valid' }
  }

  return { ok: true }
}
```

**Step 4: Extract hierarchy logic from actions.ts:656-698**

Add to `logic.ts`:

```typescript
export function buildStudentHierarchy(
  userProfile: {
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
    role: string
  },
  kelompokId?: string,
  kelompokData?: {
    id: string
    desa_id: string
    desa?: {
      id: string
      daerah_id: string
      daerah?: { id: string }
    }
  }
): {
  kelompok_id: string | null
  desa_id: string | null
  daerah_id: string | null
} {
  if (kelompokId && kelompokData) {
    // Validate that kelompok is in admin's desa (for admin desa)
    if (userProfile.role === 'admin' && userProfile.desa_id && !userProfile.kelompok_id) {
      const kelompokDesa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
      if (kelompokDesa?.id !== userProfile.desa_id) {
        throw new Error('Kelompok tidak berada di desa Anda')
      }
    }

    const desa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
    const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah

    return {
      kelompok_id: kelompokId,
      desa_id: desa?.id || null,
      daerah_id: daerah?.id || null
    }
  }

  // Use userProfile values
  return {
    kelompok_id: userProfile.kelompok_id,
    desa_id: userProfile.desa_id,
    daerah_id: userProfile.daerah_id
  }
}
```

**Step 5: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 6: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/logic.ts
git commit -m "refactor(siswa): create students/logic.ts Layer 2

Extract pure business logic from actions.ts:
- transformStudentsData (handle junction table)
- validateStudentData (form validation)
- buildStudentHierarchy (org structure)

NO 'use server' - testable without mocking.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Create students/__tests__/permissions.test.ts

**Files:**
- Move: `src/lib/__tests__/studentPermissions.test.ts` → `src/app/(admin)/users/siswa/actions/students/__tests__/permissions.test.ts`
- Modify: Update imports in test file

**Step 1: Copy test file**

```bash
cp src/lib/__tests__/studentPermissions.test.ts \
   src/app/\(admin\)/users/siswa/actions/students/__tests__/permissions.test.ts
```

**Step 2: Update imports in permissions.test.ts**

Edit `permissions.test.ts`, replace:

```typescript
// OLD
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent
} from '@/lib/studentPermissions'

// NEW
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent
} from '../permissions'
```

**Step 3: Run tests**

```bash
npm run test students/__tests__/permissions.test.ts
```

Expected: All existing permission tests pass

**Step 4: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/__tests__/permissions.test.ts
git commit -m "test(siswa): migrate permissions tests to students domain

Move from @/lib/__tests__/ to students/__tests__/.
Update imports to use relative path.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Create students/__tests__/logic.test.ts

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/__tests__/logic.test.ts`

**Step 1: Create test file with describe blocks**

Create `students/__tests__/logic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  validateStudentData,
  transformStudentsData,
  buildStudentHierarchy
} from '../logic'

describe('Student Logic', () => {
  describe('validateStudentData', () => {
    it('should reject missing name', () => {
      const result = validateStudentData({
        gender: 'Laki-laki',
        classId: '123'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('field harus diisi')
    })

    it('should reject missing gender', () => {
      const result = validateStudentData({
        name: 'Test Student',
        classId: '123'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('field harus diisi')
    })

    it('should reject missing classId', () => {
      const result = validateStudentData({
        name: 'Test Student',
        gender: 'Laki-laki'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('field harus diisi')
    })

    it('should reject invalid gender', () => {
      const result = validateStudentData({
        name: 'Test Student',
        gender: 'Invalid',
        classId: '123'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Jenis kelamin tidak valid')
    })

    it('should accept valid data', () => {
      const result = validateStudentData({
        name: 'Test Student',
        gender: 'Laki-laki',
        classId: '123'
      })
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })
  })

  describe('transformStudentsData', () => {
    it('should transform student with multiple classes', () => {
      const input = [{
        id: '1',
        name: 'Student A',
        gender: 'Laki-laki',
        student_classes: [
          { classes: { id: 'c1', name: 'Kelas 1' } },
          { classes: { id: 'c2', name: 'Kelas 2' } }
        ],
        daerah: { name: 'Daerah 1' },
        desa: { name: 'Desa 1' },
        kelompok: { name: 'Kelompok 1' },
        status: null
      }]

      const result = transformStudentsData(input)

      expect(result).toHaveLength(1)
      expect(result[0].classes).toHaveLength(2)
      expect(result[0].class_name).toBe('Kelas 1') // First class
      expect(result[0].status).toBe('active') // Default
      expect(result[0].daerah_name).toBe('Daerah 1')
      expect(result[0].desa_name).toBe('Desa 1')
      expect(result[0].kelompok_name).toBe('Kelompok 1')
    })

    it('should handle students with no classes', () => {
      const input = [{
        id: '2',
        name: 'Student B',
        gender: 'Perempuan',
        student_classes: [],
        daerah: null,
        desa: null,
        kelompok: null
      }]

      const result = transformStudentsData(input)

      expect(result[0].classes).toEqual([])
      expect(result[0].class_name).toBe('')
      expect(result[0].daerah_name).toBe('')
      expect(result[0].desa_name).toBe('')
      expect(result[0].kelompok_name).toBe('')
    })

    it('should handle invalid input gracefully', () => {
      const result = transformStudentsData(null as any)
      expect(result).toEqual([])
    })

    it('should filter out invalid student objects', () => {
      const input = [
        { id: '1', name: 'Valid Student', student_classes: [] },
        null,
        undefined,
        'invalid',
        { id: '2', name: 'Another Valid', student_classes: [] }
      ]

      const result = transformStudentsData(input as any)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[1].id).toBe('2')
    })
  })

  describe('buildStudentHierarchy', () => {
    it('should use kelompok data when provided', () => {
      const userProfile = {
        kelompok_id: null,
        desa_id: null,
        daerah_id: null,
        role: 'admin'
      }

      const kelompokData = {
        id: 'k1',
        desa_id: 'd1',
        desa: {
          id: 'd1',
          daerah_id: 'da1',
          daerah: { id: 'da1' }
        }
      }

      const result = buildStudentHierarchy(userProfile, 'k1', kelompokData)

      expect(result.kelompok_id).toBe('k1')
      expect(result.desa_id).toBe('d1')
      expect(result.daerah_id).toBe('da1')
    })

    it('should use user profile when no kelompok provided', () => {
      const userProfile = {
        kelompok_id: 'k2',
        desa_id: 'd2',
        daerah_id: 'da2',
        role: 'admin'
      }

      const result = buildStudentHierarchy(userProfile)

      expect(result.kelompok_id).toBe('k2')
      expect(result.desa_id).toBe('d2')
      expect(result.daerah_id).toBe('da2')
    })

    it('should throw error when kelompok not in admin desa', () => {
      const userProfile = {
        kelompok_id: null,
        desa_id: 'd1',
        daerah_id: 'da1',
        role: 'admin'
      }

      const kelompokData = {
        id: 'k1',
        desa_id: 'd2', // Different desa
        desa: {
          id: 'd2',
          daerah_id: 'da1',
          daerah: { id: 'da1' }
        }
      }

      expect(() => {
        buildStudentHierarchy(userProfile, 'k1', kelompokData)
      }).toThrow('Kelompok tidak berada di desa Anda')
    })
  })
})
```

**Step 2: Run tests**

```bash
npm run test students/__tests__/logic.test.ts
```

Expected: All 13 tests pass

**Step 3: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/__tests__/logic.test.ts
git commit -m "test(siswa): add comprehensive logic tests

Test validation, transformation, hierarchy logic.
100% coverage for pure functions.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Create students/__tests__/queries.test.ts

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/__tests__/queries.test.ts`

**Step 1: Create query structure tests**

Create `students/__tests__/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  fetchAllStudents,
  insertStudent,
  updateStudentRecord,
  softDeleteStudent
} from '../queries'

describe('Student Queries', () => {
  describe('fetchAllStudents', () => {
    it('should query students table with correct select', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect })
      } as any

      await fetchAllStudents(mockSupabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockSelect).toHaveBeenCalled()
    })

    it('should filter by classId when provided', async () => {
      const mockSupabase = {
        from: vi.fn()
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ student_id: 's1' }],
                error: null
              })
            })
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  in: vi.fn().mockResolvedValue({ data: [], error: null })
                })
              })
            })
          })
      } as any

      await fetchAllStudents(mockSupabase, 'class-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('student_classes')
    })
  })

  describe('insertStudent', () => {
    it('should insert to students table and return single record', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '123', name: 'Test' },
            error: null
          })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any

      const data = {
        name: 'Test',
        gender: 'Laki-laki',
        class_id: 'c1',
        kelompok_id: 'k1',
        desa_id: 'd1',
        daerah_id: 'da1'
      }

      const result = await insertStudent(mockSupabase, data)

      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockInsert).toHaveBeenCalledWith(data)
      expect(result.data).toEqual({ id: '123', name: 'Test' })
    })
  })

  describe('updateStudentRecord', () => {
    it('should update students table with correct data', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: '123' },
              error: null
            })
          })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate })
      } as any

      const data = {
        name: 'Updated',
        gender: 'Laki-laki',
        class_id: 'c1',
        updated_at: new Date().toISOString()
      }

      await updateStudentRecord(mockSupabase, '123', data)

      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockUpdate).toHaveBeenCalledWith(data)
    })
  })

  describe('softDeleteStudent', () => {
    it('should mark student as deleted with deleted_at', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate })
      } as any

      await softDeleteStudent(mockSupabase, '123', 'user-id')

      expect(mockSupabase.from).toHaveBeenCalledWith('students')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: 'user-id'
        })
      )
    })
  })
})
```

**Step 2: Run tests**

```bash
npm run test students/__tests__/queries.test.ts
```

Expected: All 4 tests pass

**Step 3: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/__tests__/queries.test.ts
git commit -m "test(siswa): add query structure tests

Basic validation of query builders with mocked Supabase.
Tests table names, method calls, parameter passing.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create students/actions.ts (Layer 3) - PART 1

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/students/actions.ts`
- Read: `src/app/(admin)/users/siswa/actions.ts:21-1683`

**NOTE:** This task is LARGE (900 lines). Split into 2 parts for manageability.

**Step 1: Create actions.ts header and imports**

Create `src/app/(admin)/users/siswa/actions/students/actions.ts`:

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import { canAccessFeature } from '@/lib/accessControlServer'
import {
  canSoftDeleteStudent,
  canHardDeleteStudent,
  type UserProfile,
  type Student as StudentPermission,
} from './permissions'
import type { StudentWithClasses } from '@/types/student'
import {
  fetchAllStudents,
  fetchStudentById,
  fetchStudentBiodata,
  fetchStudentAttendanceHistory,
  insertStudent,
  insertStudentClass,
  updateStudentRecord,
  fetchCurrentStudentClasses,
  deleteStudentClasses,
  insertStudentClasses,
  softDeleteStudent as softDeleteStudentQuery,
  hardDeleteStudent as hardDeleteStudentQuery,
  deleteStudentClassesByStudentId,
  checkStudentHasAttendance as checkStudentHasAttendanceQuery,
  updateStudentBiodata as updateStudentBiodataQuery,
  insertStudentsBatch,
  insertStudentClassesBatch
} from './queries'
import {
  transformStudentsData,
  validateStudentData,
  buildStudentHierarchy
} from './logic'

// Re-export centralized type for consistency
export type Student = StudentWithClasses

```

**Step 2: Extract getUserProfile from actions.ts:21-65**

Add to `actions.ts`:

```typescript
/**
 * Mendapatkan profile user saat ini
 */
export async function getUserProfile() {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        role,
        kelompok_id,
        desa_id,
        daerah_id,
        teacher_classes!teacher_classes_teacher_id_fkey(
          class_id,
          classes:class_id(id, name)
        )
      `)
      .eq('id', user.id)
      .single()

    // Transform teacher_classes to classes array
    const classesData = profile?.teacher_classes?.map((tc: any) => tc.classes).filter(Boolean) || []

    if (!profile) {
      throw new Error('User profile not found')
    }

    return {
      role: profile.role,
      kelompok_id: profile.kelompok_id,
      desa_id: profile.desa_id,
      daerah_id: profile.daerah_id,
      class_id: classesData[0]?.id || null,
      class_name: classesData[0]?.name || null,
      classes: classesData
    }
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat profile user')
    throw error
  }
}
```

**Step 3: Extract getAllStudents from actions.ts:70-467**

Add to `actions.ts`:

```typescript
/**
 * Mendapatkan daftar siswa dengan informasi kelas (mendukung multiple classes via junction table)
 */
export async function getAllStudents(classId?: string): Promise<Student[]> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile to check role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select(`
        role,
        kelompok_id,
        desa_id,
        daerah_id,
        teacher_classes(class_id)
      `)
      .eq('id', user.id)
      .single()

    // For teacher, use admin client to bypass RLS and filter by teacher's classes OR hierarchy
    if (profile?.role === 'teacher' && profile.teacher_classes && profile.teacher_classes.length > 0) {
      const teacherClassIds = profile.teacher_classes.map((tc: any) => tc.class_id)

      // Get student IDs from both sources:
      // 1. student_classes junction table (for students with multiple classes)
      // 2. students.class_id directly (for students with single class - backward compatibility)
      const studentIdsFromJunction = new Set<string>()
      const studentIdsFromClassId = new Set<string>()

      // Query from junction table
      const { data: studentClassData } = await adminClient
        .from('student_classes')
        .select('student_id')
        .in('class_id', teacherClassIds)

      if (studentClassData && studentClassData.length > 0) {
        studentClassData.forEach((sc: any) => {
          studentIdsFromJunction.add(sc.student_id)
        })
      }

      // Query from students.class_id directly (backward compatibility)
      const { data: studentsFromClassId } = await adminClient
        .from('students')
        .select('id')
        .is('deleted_at', null)
        .in('class_id', teacherClassIds)

      if (studentsFromClassId && studentsFromClassId.length > 0) {
        studentsFromClassId.forEach((s: any) => {
          studentIdsFromClassId.add(s.id)
        })
      }

      // Combine both sources
      const studentIds = [...new Set([...studentIdsFromJunction, ...studentIdsFromClassId])]

      if (studentIds.length === 0) {
        return []
      }

      // Apply additional classId filter if provided
      if (classId) {
        const classIds = classId.split(',')
        const filteredClassIds = classIds.filter(id => teacherClassIds.includes(id))
        if (filteredClassIds.length === 0) {
          return []
        }

        // Get students for specific classes
        const filteredStudentIdsFromJunction = new Set<string>()
        const filteredStudentIdsFromClassId = new Set<string>()

        const { data: filteredStudentClassData } = await adminClient
          .from('student_classes')
          .select('student_id')
          .in('class_id', filteredClassIds)

        if (filteredStudentClassData && filteredStudentClassData.length > 0) {
          filteredStudentClassData.forEach((sc: any) => {
            filteredStudentIdsFromJunction.add(sc.student_id)
          })
        }

        const { data: filteredStudentsFromClassId } = await adminClient
          .from('students')
          .select('id')
          .is('deleted_at', null)
          .in('class_id', filteredClassIds)

        if (filteredStudentsFromClassId && filteredStudentsFromClassId.length > 0) {
          filteredStudentsFromClassId.forEach((s: any) => {
            filteredStudentIdsFromClassId.add(s.id)
          })
        }

        const filteredStudentIds = [...new Set([...filteredStudentIdsFromJunction, ...filteredStudentIdsFromClassId])]
        // Intersect with teacher's students
        const finalStudentIds = studentIds.filter(id => filteredStudentIds.includes(id))

        if (finalStudentIds.length === 0) {
          return []
        }

        // Query students with final filtered IDs using admin client
        const { data: students, error } = await fetchAllStudents(adminClient, undefined)

        if (error) throw error

        // Filter in memory
        const filtered = (students || []).filter((s: any) => finalStudentIds.includes(s.id))
        return transformStudentsData(filtered)
      }

      // Query students for all teacher's classes using admin client
      const { data: students, error: studentsError } = await fetchAllStudents(adminClient, undefined)

      if (studentsError) throw studentsError

      // Filter in memory
      const filtered = (students || []).filter((s: any) => studentIds.includes(s.id))
      return transformStudentsData(filtered)
    } else if (profile?.role === 'teacher' && (profile.kelompok_id || profile.desa_id || profile.daerah_id)) {
      // Teacher with hierarchical access (Guru Desa/Daerah)
      // Use admin client to bypass RLS
      let studentsQuery = adminClient
        .from('students')
        .select(`
          id,
          name,
          gender,
          class_id,
          kelompok_id,
          desa_id,
          daerah_id,
          status,
          created_at,
          updated_at,
          student_classes(
            classes:class_id(id, name)
          ),
          daerah:daerah_id(name),
          desa:desa_id(name),
          kelompok:kelompok_id(name)
        `)
        .is('deleted_at', null)
        .order('name')

      // Apply hierarchical filter
      if (profile.kelompok_id) {
        studentsQuery = studentsQuery.eq('kelompok_id', profile.kelompok_id)
      } else if (profile.desa_id) {
        studentsQuery = studentsQuery.eq('desa_id', profile.desa_id)
      } else if (profile.daerah_id) {
        studentsQuery = studentsQuery.eq('daerah_id', profile.daerah_id)
      }

      // Apply class filter if provided
      if (classId) {
        const classIds = classId.split(',')

        const { data: studentClassData } = await adminClient
          .from('student_classes')
          .select('student_id')
          .in('class_id', classIds)

        if (studentClassData && studentClassData.length > 0) {
          const studentIds = studentClassData.map(sc => sc.student_id)
          studentsQuery = studentsQuery.in('id', studentIds)
        } else {
          return []
        }
      }

      const { data: students, error } = await studentsQuery

      if (error) throw error

      return transformStudentsData(students || [])
    }

    // For non-teacher roles, use existing logic with junction table
    const { data: students, error } = await fetchAllStudents(supabase, classId)

    if (error) throw error

    return transformStudentsData(students || [])
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar siswa')
    throw error
  }
}
```

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: No errors in actions.ts so far

**Step 5: Commit PART 1**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/actions.ts
git commit -m "refactor(siswa): create students/actions.ts Layer 3 (Part 1/2)

Add 'use server' directive and imports.
Extract getUserProfile, getAllStudents server actions.
Use queries and logic layers.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create students/actions.ts (Layer 3) - PART 2

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions/students/actions.ts`
- Read: `src/app/(admin)/users/siswa/actions.ts:619-1683`

**Step 1: Extract createStudent from actions.ts:619-764**

Add to `actions.ts`:

```typescript
/**
 * Membuat siswa baru
 */
export async function createStudent(formData: FormData) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Extract form data
    const name = formData.get('name')?.toString()
    const gender = formData.get('gender')?.toString()
    const classId = formData.get('classId')?.toString()
    const kelompokId = formData.get('kelompok_id')?.toString()

    // Validation (Layer 2)
    const validation = validateStudentData({ name, gender, classId })
    if (!validation.ok) {
      throw new Error(validation.error)
    }

    // Get user profile to inherit hierarchy
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('kelompok_id, desa_id, daerah_id, role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      throw new Error('User profile not found')
    }

    // Get kelompok data if kelompok_id provided
    let kelompokData
    if (kelompokId) {
      const { data, error: kelompokError } = await supabase
        .from('kelompok')
        .select(`
          id,
          desa_id,
          desa:desa_id(
            id,
            daerah_id,
            daerah:daerah_id(id)
          )
        `)
        .eq('id', kelompokId)
        .single()

      if (kelompokError || !data) {
        throw new Error('Kelompok tidak ditemukan')
      }

      kelompokData = data
    }

    // Build hierarchy (Layer 2)
    const hierarchy = buildStudentHierarchy(userProfile, kelompokId, kelompokData)

    // Create student (Layer 1)
    const { data: newStudent, error } = await insertStudent(adminClient, {
      name: name!,
      gender: gender!,
      class_id: classId!,
      kelompok_id: hierarchy.kelompok_id,
      desa_id: hierarchy.desa_id,
      daerah_id: hierarchy.daerah_id
    })

    if (error) {
      console.error('Create student error:', error)
      throw error
    }

    // Insert to junction table (Layer 1)
    if (newStudent?.id) {
      const { error: junctionError } = await insertStudentClass(adminClient, newStudent.id, classId!)

      if (junctionError) {
        if (junctionError.code === '23505') {
          console.log('Student already assigned to this class')
        } else {
          console.error('Junction table insert failed:', junctionError)
          // Rollback by deleting the student
          await adminClient.from('students').delete().eq('id', newStudent.id)
          throw new Error(`Failed to assign student to class: ${junctionError.message}`)
        }
      }
    }

    revalidatePath('/users/siswa')
    revalidatePath('/absensi')
    return { success: true, student: newStudent }
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal membuat siswa')
    throw error
  }
}
```

**Step 2: Extract updateStudent from actions.ts:769-973**

Add to `actions.ts`:

```typescript
/**
 * Mengupdate data siswa
 */
export async function updateStudent(studentId: string, formData: FormData) {
  try {
    const supabase = await createClient()

    // Get current user profile to check role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, teacher_classes(class_id), desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Extract form data
    const name = formData.get('name')?.toString()
    const gender = formData.get('gender')?.toString()
    const kelompokId = formData.get('kelompok_id')?.toString()

    // Support both classIds (multiple) and classId (single) for backward compatibility
    const classIdsStr = formData.get('classIds')?.toString() || formData.get('classId')?.toString()
    const classIds = classIdsStr ? classIdsStr.split(',').filter(Boolean) : []

    // Validation
    if (!name || !gender) {
      throw new Error('Nama dan jenis kelamin harus diisi')
    }

    if (classIds.length === 0) {
      throw new Error('Pilih minimal satu kelas')
    }

    if (!['Laki-laki', 'Perempuan'].includes(gender)) {
      throw new Error('Jenis kelamin tidak valid')
    }

    // Set primary class_id = first class in the array
    const primaryClassId = classIds[0]

    // Determine kelompok_id, desa_id, and daerah_id if kelompok_id is provided
    let finalKelompokId: string | null | undefined = undefined
    let finalDesaId: string | null | undefined = undefined
    let finalDaerahId: string | null | undefined = undefined

    if (kelompokId) {
      const { data: kelompokData, error: kelompokError } = await supabase
        .from('kelompok')
        .select(`
          id,
          desa_id,
          desa:desa_id(
            id,
            daerah_id,
            daerah:daerah_id(id)
          )
        `)
        .eq('id', kelompokId)
        .single()

      if (kelompokError || !kelompokData) {
        throw new Error('Kelompok tidak ditemukan')
      }

      // Validate that kelompok is in admin's desa (for admin desa)
      if (profile.role === 'admin' && profile.desa_id && !profile.kelompok_id) {
        const kelompokDesa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
        if (kelompokDesa?.id !== profile.desa_id) {
          throw new Error('Kelompok tidak berada di desa Anda')
        }
      }

      finalKelompokId = kelompokId
      const desa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
      finalDesaId = desa?.id || null
      const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah
      finalDaerahId = daerah?.id || null
    }

    // For teacher, validate that selected classes are their assigned classes
    if (profile.role === 'teacher') {
      const teacherClassIds = profile.teacher_classes?.map((tc: any) => tc.class_id) || []
      const invalidClasses = classIds.filter(id => !teacherClassIds.includes(id))
      if (invalidClasses.length > 0) {
        throw new Error('Anda hanya dapat mengupdate siswa ke kelas yang Anda ajarkan')
      }
    }

    // Use admin client for teacher and admin to bypass RLS issues
    const client = (profile.role === 'teacher' || profile.role === 'admin' || profile.role === 'superadmin')
      ? await createAdminClient()
      : supabase

    // Prepare update data
    const updateData: any = {
      name,
      gender,
      class_id: primaryClassId,
      updated_at: new Date().toISOString()
    }

    if (finalKelompokId !== undefined) {
      updateData.kelompok_id = finalKelompokId
      updateData.desa_id = finalDesaId
      updateData.daerah_id = finalDaerahId
    }

    // Update student (Layer 1)
    const { data: updatedStudent, error } = await updateStudentRecord(client, studentId, updateData)

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk mengupdate siswa ini')
      }
      if (error.code === '23503') {
        throw new Error('Kelas tidak ditemukan')
      }
      if (error.code === 'PGRST116') {
        throw new Error('Siswa tidak ditemukan')
      }
      throw error
    }

    // Sync dengan junction table (Layer 1)
    if (updatedStudent?.id) {
      const { data: currentClasses, error: currentClassesError } = await fetchCurrentStudentClasses(client, studentId)

      if (currentClassesError) {
        console.error('Error fetching current classes:', currentClassesError)
      }

      const currentClassIds = new Set(currentClasses?.map(c => c.class_id) || [])
      const newClassIds = new Set(classIds)

      // Delete removed classes
      const toDelete = Array.from(currentClassIds).filter(id => !newClassIds.has(id))
      if (toDelete.length > 0) {
        const { error: deleteError } = await deleteStudentClasses(client, studentId, toDelete)

        if (deleteError && deleteError.code !== 'PGRST301') {
          console.error('Error deleting classes from junction table:', deleteError)
        }
      }

      // Insert new classes
      const toInsert = Array.from(newClassIds).filter(id => !currentClassIds.has(id))
      if (toInsert.length > 0) {
        const { error: insertError } = await insertStudentClasses(client, studentId, toInsert)

        if (insertError && insertError.code !== '23505' && insertError.code !== 'PGRST301') {
          console.error('Error inserting to junction table:', insertError)
        }
      }
    }

    revalidatePath('/users/siswa')
    return { success: true, student: updatedStudent }
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa')
    throw error
  }
}
```

**Step 3: Extract deleteStudent from actions.ts:1001-1141**

Add to `actions.ts`:

```typescript
/**
 * Menghapus siswa dengan permission check
 */
export async function deleteStudent(
  studentId: string,
  permanent: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get student data (including soft deleted for hard delete scenario)
    const { data: student, error: studentError } = await adminClient
      .from('students')
      .select('id, name, gender, daerah_id, desa_id, kelompok_id, status, deleted_at')
      .eq('id', studentId)
      .single()

    if (studentError) {
      if (studentError.code === 'PGRST116') {
        return { success: false, error: 'Siswa tidak ditemukan' }
      }
      handleApiError(studentError, 'menghapus data', 'Gagal menghapus siswa')
      return { success: false, error: 'Gagal menghapus siswa' }
    }

    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission (Layer 2 - permissions)
    if (permanent) {
      if (!canHardDeleteStudent(profile as UserProfile, student as StudentPermission)) {
        if (profile.role !== 'superadmin') {
          return {
            success: false,
            error: 'Hanya superadmin yang dapat menghapus siswa secara permanen',
          }
        }
        if (!student.deleted_at) {
          return {
            success: false,
            error: 'Siswa harus di-soft delete terlebih dahulu sebelum hard delete',
          }
        }
        return {
          success: false,
          error: 'Tidak memiliki izin untuk menghapus siswa ini',
        }
      }

      // Delete student from junction table first (Layer 1)
      const { error: junctionDeleteError } = await deleteStudentClassesByStudentId(adminClient, studentId)

      if (junctionDeleteError && junctionDeleteError.code !== 'PGRST301') {
        console.error('Error deleting from junction table:', junctionDeleteError)
      }

      // Delete student permanently (Layer 1)
      const { error: deleteError } = await hardDeleteStudent(adminClient, studentId)

      if (deleteError) {
        if (deleteError.code === 'PGRST301' || deleteError.message.includes('permission denied')) {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
        }
        if (deleteError.code === '23503') {
          return {
            success: false,
            error: 'Tidak dapat menghapus siswa: terdapat data terkait yang masih digunakan',
          }
        }
        handleApiError(deleteError, 'menghapus data', 'Gagal menghapus siswa')
        return { success: false, error: 'Gagal menghapus siswa' }
      }
    } else {
      if (!canSoftDeleteStudent(profile as UserProfile, student as StudentPermission)) {
        return {
          success: false,
          error: 'Tidak memiliki izin untuk menghapus siswa ini',
        }
      }

      // Mark as deleted (Layer 1)
      const { error: updateError } = await softDeleteStudentQuery(adminClient, studentId, user.id)

      if (updateError) {
        if (updateError.code === 'PGRST301' || updateError.message.includes('permission denied')) {
          return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
        }
        handleApiError(updateError, 'menghapus data', 'Gagal menghapus siswa')
        return { success: false, error: 'Gagal menghapus siswa' }
      }
    }

    revalidatePath('/users/siswa')
    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus siswa'
    handleApiError(error, 'menghapus data', errorMessage)
    return { success: false, error: errorMessage }
  }
}
```

**Step 4: Add remaining server actions (helpers)**

Add to `actions.ts`:

```typescript
/**
 * Check if student has attendance records
 */
export async function checkStudentHasAttendance(studentId: string): Promise<boolean> {
  try {
    const adminClient = await createAdminClient()
    const { data } = await checkStudentHasAttendanceQuery(adminClient, studentId)
    return !!data
  } catch (error) {
    console.error('Error checking student attendance:', error)
    return false
  }
}

/**
 * Helper: Mendapatkan semua kelas siswa berdasarkan studentId
 */
export async function getStudentClasses(studentId: string): Promise<Array<{ id: string; name: string }>> {
  try {
    const supabase = await createClient()

    const { data: studentClasses, error } = await supabase
      .from('student_classes')
      .select(`
        classes:class_id(id, name)
      `)
      .eq('student_id', studentId)

    if (error) {
      throw error
    }

    return (studentClasses || [])
      .map((sc: any) => sc.classes)
      .filter(Boolean)
      .map((cls: any) => ({
        id: String(cls.id || ''),
        name: String(cls.name || '')
      }))
  } catch (error) {
    console.error('Error getting student classes:', error)
    return []
  }
}

/**
 * Assign siswa yang sudah ada ke kelas tertentu (batch)
 */
export async function assignStudentsToClass(
  studentIds: string[],
  classId: string
): Promise<{ success: boolean; assigned: number; skipped: string[] }> {
  try {
    const supabase = await createClient()

    // Get user profile untuk validasi
    const profile = await getUserProfile()

    // Validasi kelas tujuan exists
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      throw new Error('Kelas tidak ditemukan')
    }

    if (!studentIds || studentIds.length === 0) {
      throw new Error('Pilih minimal satu siswa')
    }

    // Check siswa yang sudah ada di kelas tersebut
    const { data: existingAssignments } = await supabase
      .from('student_classes')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', studentIds)

    const existingStudentIds = new Set(existingAssignments?.map(a => a.student_id) || [])
    const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id))

    // Batch insert ke junction table untuk siswa yang belum ada (Layer 1)
    if (newStudentIds.length > 0) {
      const assignments = newStudentIds.map(studentId => ({
        student_id: studentId,
        class_id: classId
      }))

      const { error } = await insertStudentClassesBatch(supabase, assignments)

      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
          throw new Error('Tidak memiliki izin untuk mengassign siswa ke kelas ini')
        }
        throw error
      }
    }

    revalidatePath('/users/siswa')
    return {
      success: true,
      assigned: newStudentIds.length,
      skipped: Array.from(existingStudentIds)
    }
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa ke kelas')
    throw error
  }
}

/**
 * Membuat siswa dalam batch
 */
export async function createStudentsBatch(
  students: Array<{ name: string; gender: string }>,
  classId: string
) {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get user profile for hierarchy fields
    const profile = await getUserProfile()

    // Get class info
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('id, name')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      throw new Error('Kelas tidak ditemukan')
    }

    // Filter out empty students
    const validStudents = students.filter(s => s.name.trim() !== '')

    if (validStudents.length === 0) {
      throw new Error('Tidak ada siswa yang valid untuk ditambah')
    }

    // Prepare students with hierarchy fields
    const studentsToInsert = validStudents.map(s => ({
      name: s.name.trim(),
      gender: s.gender,
      class_id: classId,
      kelompok_id: profile.kelompok_id,
      desa_id: profile.desa_id,
      daerah_id: profile.daerah_id
    }))

    // Insert students in batch (Layer 1)
    const { data: insertedStudents, error: insertError } = await insertStudentsBatch(adminClient, studentsToInsert)

    if (insertError) {
      console.error('Batch insert error:', insertError)
      throw insertError
    }

    // Insert to junction table (Layer 1)
    if (insertedStudents && insertedStudents.length > 0) {
      const junctionInserts = insertedStudents.map(student => ({
        student_id: student.id,
        class_id: classId
      }))

      const { error: junctionError } = await insertStudentClassesBatch(adminClient, junctionInserts)

      if (junctionError && junctionError.code !== '23505') {
        console.error('Error inserting to junction table:', junctionError)
      }
    }

    revalidatePath('/users/siswa')

    return {
      success: true,
      imported: insertedStudents?.length || 0,
      total: validStudents.length,
      errors: []
    }
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal mengimport siswa')
    throw error
  }
}

/**
 * Mendapatkan role user saat ini
 */
export async function getCurrentUserRole(): Promise<string | null> {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return null
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    return profile?.role || null
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}
```

**Step 5: Add student info and biodata actions**

Add to `actions.ts`:

```typescript
export interface StudentInfo {
  id: string
  name: string
  gender: string | null
  class_id?: string | null
  classes: Array<{
    id: string
    name: string
  }>
}

export interface AttendanceLog {
  id: string
  date: string
  status: string
  reason: string | null
  meeting_id: string
  meetings: {
    id: string
    title: string
    topic: string | null
    description: string | null
    meeting_type_code?: string | null
    classes?: {
      id: string
      name: string
      class_master_mappings?: Array<{
        class_master?: {
          category?: {
            is_sambung_capable: boolean
          }
        }
      }>
    } | null
  }
}

export interface MonthlyStats {
  total: number
  hadir: number
  izin: number
  sakit: number
  absen: number
}

export interface AttendanceHistoryResponse {
  attendanceLogs: AttendanceLog[]
  stats: MonthlyStats
}

/**
 * Mendapatkan informasi siswa berdasarkan ID
 */
export async function getStudentInfo(studentId: string): Promise<StudentInfo> {
  try {
    const supabase = await createClient()

    // Get current user profile for access control
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, daerah_id, desa_id, kelompok_id, teacher_classes(class_id)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Query student (Layer 1)
    const { data: student, error } = await fetchStudentById(supabase, studentId)

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Siswa tidak ditemukan')
      }
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk melihat siswa ini')
      }
      throw error
    }

    // Extract classes (Layer 2)
    const transformed = transformStudentsData([student])
    const transformedStudent = transformed[0]

    return {
      id: transformedStudent.id,
      name: transformedStudent.name,
      gender: transformedStudent.gender,
      class_id: transformedStudent.class_id,
      classes: transformedStudent.classes
    } as StudentInfo
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat informasi siswa')
    throw new Error(errorInfo.message)
  }
}

/**
 * Mendapatkan riwayat kehadiran siswa untuk bulan tertentu
 */
export async function getStudentAttendanceHistory(
  studentId: string,
  year: number,
  month: number
): Promise<AttendanceHistoryResponse> {
  try {
    const supabase = await createClient()

    // Get current user profile for access control
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, daerah_id, desa_id, kelompok_id, teacher_classes(class_id)')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Format date range
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

    // Query attendance logs (Layer 1)
    const { data: attendanceLogs, error } = await fetchStudentAttendanceHistory(
      supabase,
      studentId,
      startDate,
      endDate
    )

    if (error) {
      if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
        throw new Error('Tidak memiliki izin untuk melihat riwayat kehadiran siswa ini')
      }
      throw error
    }

    // Calculate stats
    const stats = {
      total: attendanceLogs?.length || 0,
      hadir: attendanceLogs?.filter(log => log.status === 'H').length || 0,
      izin: attendanceLogs?.filter(log => log.status === 'I').length || 0,
      sakit: attendanceLogs?.filter(log => log.status === 'S').length || 0,
      absen: attendanceLogs?.filter(log => log.status === 'A').length || 0
    }

    return {
      attendanceLogs: (attendanceLogs || []) as unknown as AttendanceLog[],
      stats: stats as MonthlyStats
    }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')
    throw new Error(errorInfo.message)
  }
}

/**
 * Get student with complete biodata
 */
export async function getStudentBiodata(
  studentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await fetchStudentBiodata(supabase, studentId)

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching student biodata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch student biodata',
    }
  }
}

/**
 * Update student biodata
 */
export async function updateStudentBiodata(
  studentId: string,
  biodata: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Extract only the fields that exist in the database
    const updateData: any = {}

    if (biodata.name !== undefined) updateData.name = biodata.name
    if (biodata.nomor_induk !== undefined) updateData.nomor_induk = biodata.nomor_induk
    if (biodata.gender !== undefined) updateData.gender = biodata.gender
    if (biodata.tempat_lahir !== undefined) updateData.tempat_lahir = biodata.tempat_lahir
    if (biodata.tanggal_lahir !== undefined) updateData.tanggal_lahir = biodata.tanggal_lahir
    if (biodata.anak_ke !== undefined) updateData.anak_ke = biodata.anak_ke
    if (biodata.alamat !== undefined) updateData.alamat = biodata.alamat
    if (biodata.nomor_telepon !== undefined) updateData.nomor_telepon = biodata.nomor_telepon
    if (biodata.nama_ayah !== undefined) updateData.nama_ayah = biodata.nama_ayah
    if (biodata.nama_ibu !== undefined) updateData.nama_ibu = biodata.nama_ibu
    if (biodata.alamat_orangtua !== undefined) updateData.alamat_orangtua = biodata.alamat_orangtua
    if (biodata.telepon_orangtua !== undefined) updateData.telepon_orangtua = biodata.telepon_orangtua
    if (biodata.pekerjaan_ayah !== undefined) updateData.pekerjaan_ayah = biodata.pekerjaan_ayah
    if (biodata.pekerjaan_ibu !== undefined) updateData.pekerjaan_ibu = biodata.pekerjaan_ibu
    if (biodata.nama_wali !== undefined) updateData.nama_wali = biodata.nama_wali
    if (biodata.alamat_wali !== undefined) updateData.alamat_wali = biodata.alamat_wali
    if (biodata.pekerjaan_wali !== undefined) updateData.pekerjaan_wali = biodata.pekerjaan_wali

    updateData.updated_at = new Date().toISOString()

    const { error } = await updateStudentBiodataQuery(supabase, studentId, updateData)

    if (error) throw error

    revalidatePath('/users/siswa')
    revalidatePath(`/users/siswa/${studentId}`)
    revalidatePath('/rapot')

    return { success: true }
  } catch (error) {
    console.error('Error updating student biodata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update student biodata',
    }
  }
}
```

**Step 6: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 7: Commit PART 2**

```bash
git add src/app/\(admin\)/users/siswa/actions/students/actions.ts
git commit -m "refactor(siswa): complete students/actions.ts Layer 3 (Part 2/2)

Add all remaining server actions:
- createStudent, updateStudent, deleteStudent
- Batch operations, student info, biodata
- All use queries + logic + permissions layers

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

**CONTINUE TO NEXT MESSAGE FOR REMAINING TASKS (classes and management domains)**

## Task 10: Create classes domain (queries + logic + actions)

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/classes/queries.ts`
- Create: `src/app/(admin)/users/siswa/actions/classes/logic.ts`
- Create: `src/app/(admin)/users/siswa/actions/classes/actions.ts`
- Read: `src/app/(admin)/users/siswa/actions/classes.ts:1-245`

**Step 1: Create classes/queries.ts**

Create `src/app/(admin)/users/siswa/actions/classes/queries.ts`:

```typescript
/**
 * Class Queries (Layer 1)
 *
 * Database queries for class operations.
 * NO 'use server' directive - pure query builders.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchAllClasses(supabase: SupabaseClient) {
  return await supabase
    .from('classes')
    .select(`
      id,
      name,
      kelompok_id,
      kelompok:kelompok_id(id, name)
    `)
    .order('name')
}

export async function fetchClassesByKelompok(
  supabase: SupabaseClient,
  kelompokId: string
) {
  return await supabase
    .from('classes')
    .select(`
      id,
      name,
      kelompok_id,
      kelompok:kelompok_id(id, name)
    `)
    .eq('kelompok_id', kelompokId)
    .order('name')
}

export async function fetchClassMasterMappings(
  supabase: SupabaseClient,
  classIds: string[]
) {
  if (classIds.length === 0) {
    return { data: new Map(), error: null }
  }

  // Step 1: get mappings
  const { data: mappings, error: mappingsError } = await supabase
    .from('class_master_mappings')
    .select('class_id, class_master_id')
    .in('class_id', classIds)

  if (mappingsError) {
    return { data: null, error: mappingsError }
  }

  if (!mappings || mappings.length === 0) {
    return { data: new Map(), error: null }
  }

  // Step 2: get class masters with sort_order
  const masterIds = mappings.map((m: any) => m.class_master_id)
  const { data: masters, error: mastersError } = await supabase
    .from('class_masters')
    .select('id, sort_order')
    .in('id', masterIds)

  if (mastersError) {
    return { data: null, error: mastersError }
  }

  if (!masters) {
    return { data: new Map(), error: null }
  }

  // Step 3: group by class_id
  const classMappings = new Map<string, any[]>()
  mappings.forEach((mapping: any) => {
    const master = masters.find((m: any) => m.id === mapping.class_master_id)
    if (!master) return
    if (!classMappings.has(mapping.class_id)) {
      classMappings.set(mapping.class_id, [])
    }
    classMappings.get(mapping.class_id)?.push({ class_master: master })
  })

  return { data: classMappings, error: null }
}
```

**Step 2: Create classes/logic.ts**

Create `src/app/(admin)/users/siswa/actions/classes/logic.ts`:

```typescript
/**
 * Class Logic (Layer 2)
 *
 * Pure business logic for class operations.
 * NO 'use server' directive - testable without mocking.
 */

export function sortClassesByMasterOrder(classes: any[]): any[] {
  return classes.sort((a, b) => {
    // Get minimum sort_order from mappings
    const getSortOrder = (cls: any): number => {
      if (!cls.class_master_mappings || cls.class_master_mappings.length === 0) {
        return 9999 // Classes without mappings go to end
      }

      const sortOrders = cls.class_master_mappings
        .map((mapping: any) => mapping.class_master?.sort_order)
        .filter((order: any) => typeof order === 'number')

      if (sortOrders.length === 0) return 9999
      return Math.min(...sortOrders)
    }

    const orderA = getSortOrder(a)
    const orderB = getSortOrder(b)

    // Primary sort: by sort_order
    if (orderA !== orderB) {
      return orderA - orderB
    }

    // Secondary sort: by name (fallback for same sort_order)
    return a.name.localeCompare(b.name)
  })
}
```

**Step 3: Create classes/actions.ts**

Create `src/app/(admin)/users/siswa/actions/classes/actions.ts`:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { handleApiError } from '@/lib/errorUtils'
import {
  fetchAllClasses,
  fetchClassesByKelompok,
  fetchClassMasterMappings
} from './queries'
import { sortClassesByMasterOrder } from './logic'

export interface Class {
  id: string
  name: string
  kelompok_id?: string | null
  kelompok?: {
    id: string
    name: string
  } | null
  class_master_mappings?: Array<{
    class_master: {
      id: string
      sort_order: number
    }
  }>
}

/**
 * Mendapatkan daftar kelas berdasarkan role user
 */
export async function getAllClasses(): Promise<Class[]> {
  try {
    const supabase = await createClient()

    // Get user profile to determine role
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, kelompok_id, desa_id, daerah_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Query classes (Layer 1)
    const { data: classes, error } = await fetchAllClasses(supabase)

    if (error) throw error

    if (!classes || classes.length === 0) {
      return []
    }

    // Fetch class master mappings for sorting (Layer 1)
    const classIds = classes.map(c => c.id)
    const { data: mappingsMap, error: mappingsError } = await fetchClassMasterMappings(supabase, classIds)

    if (mappingsError) {
      console.error('Error fetching class master mappings:', mappingsError)
      // Return unsorted if mapping fails
      return classes
    }

    // Attach mappings to classes
    const classesWithMappings = classes.map(cls => ({
      ...cls,
      class_master_mappings: mappingsMap?.get(cls.id) || []
    }))

    // Sort classes by class_master.sort_order (Layer 2)
    return sortClassesByMasterOrder(classesWithMappings)
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}

/**
 * Mendapatkan daftar kelas berdasarkan kelompok
 */
export async function getAllClassesByKelompok(kelompokId: string): Promise<Class[]> {
  try {
    const supabase = await createClient()

    // Query classes by kelompok (Layer 1)
    const { data: classes, error } = await fetchClassesByKelompok(supabase, kelompokId)

    if (error) throw error

    if (!classes || classes.length === 0) {
      return []
    }

    // Fetch class master mappings for sorting (Layer 1)
    const classIds = classes.map(c => c.id)
    const { data: mappingsMap, error: mappingsError } = await fetchClassMasterMappings(supabase, classIds)

    if (mappingsError) {
      console.error('Error fetching class master mappings:', mappingsError)
      return classes
    }

    // Attach mappings to classes
    const classesWithMappings = classes.map(cls => ({
      ...cls,
      class_master_mappings: mappingsMap?.get(cls.id) || []
    }))

    // Sort (Layer 2)
    return sortClassesByMasterOrder(classesWithMappings)
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas')
    throw error
  }
}
```

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 5: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/classes/
git commit -m "refactor(siswa): create classes domain with 3-layer pattern

Extract from actions/classes.ts:
- queries.ts: fetchAllClasses, fetchClassesByKelompok, fetchClassMasterMappings
- logic.ts: sortClassesByMasterOrder
- actions.ts: getAllClasses, getAllClassesByKelompok

Use two-query pattern for class_master.sort_order.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Create classes/__tests__/

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/classes/__tests__/queries.test.ts`
- Create: `src/app/(admin)/users/siswa/actions/classes/__tests__/logic.test.ts`

**Step 1: Create queries.test.ts**

Create `classes/__tests__/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { fetchAllClasses, fetchClassMasterMappings } from '../queries'

describe('Class Queries', () => {
  describe('fetchAllClasses', () => {
    it('should query classes table with correct select', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect })
      } as any

      await fetchAllClasses(mockSupabase)

      expect(mockSupabase.from).toHaveBeenCalledWith('classes')
      expect(mockSelect).toHaveBeenCalled()
    })
  })

  describe('fetchClassMasterMappings', () => {
    it('should return empty map for empty classIds', async () => {
      const mockSupabase = {} as any

      const result = await fetchClassMasterMappings(mockSupabase, [])

      expect(result.data).toBeInstanceOf(Map)
      expect(result.data?.size).toBe(0)
      expect(result.error).toBeNull()
    })

    it('should use two-query pattern for mappings', async () => {
      const mockSupabase = {
        from: vi.fn()
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ class_id: 'c1', class_master_id: 'm1' }],
                error: null
              })
            })
          })
          .mockReturnValueOnce({
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'm1', sort_order: 1 }],
                error: null
              })
            })
          })
      } as any

      const result = await fetchClassMasterMappings(mockSupabase, ['c1'])

      expect(mockSupabase.from).toHaveBeenCalledWith('class_master_mappings')
      expect(mockSupabase.from).toHaveBeenCalledWith('class_masters')
      expect(result.data?.get('c1')).toBeDefined()
    })
  })
})
```

**Step 2: Create logic.test.ts**

Create `classes/__tests__/logic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { sortClassesByMasterOrder } from '../logic'

describe('Class Logic', () => {
  describe('sortClassesByMasterOrder', () => {
    it('should sort classes by minimum sort_order', () => {
      const classes = [
        {
          id: 'c1',
          name: 'Kelas A',
          class_master_mappings: [
            { class_master: { sort_order: 3 } }
          ]
        },
        {
          id: 'c2',
          name: 'Kelas B',
          class_master_mappings: [
            { class_master: { sort_order: 1 } }
          ]
        },
        {
          id: 'c3',
          name: 'Kelas C',
          class_master_mappings: [
            { class_master: { sort_order: 2 } }
          ]
        }
      ]

      const result = sortClassesByMasterOrder(classes)

      expect(result[0].id).toBe('c2') // sort_order 1
      expect(result[1].id).toBe('c3') // sort_order 2
      expect(result[2].id).toBe('c1') // sort_order 3
    })

    it('should place classes without mappings at end', () => {
      const classes = [
        {
          id: 'c1',
          name: 'Kelas A',
          class_master_mappings: []
        },
        {
          id: 'c2',
          name: 'Kelas B',
          class_master_mappings: [
            { class_master: { sort_order: 1 } }
          ]
        }
      ]

      const result = sortClassesByMasterOrder(classes)

      expect(result[0].id).toBe('c2') // Has mapping
      expect(result[1].id).toBe('c1') // No mapping (9999)
    })

    it('should use name as secondary sort', () => {
      const classes = [
        {
          id: 'c1',
          name: 'Zebra',
          class_master_mappings: [
            { class_master: { sort_order: 1 } }
          ]
        },
        {
          id: 'c2',
          name: 'Apple',
          class_master_mappings: [
            { class_master: { sort_order: 1 } }
          ]
        }
      ]

      const result = sortClassesByMasterOrder(classes)

      expect(result[0].name).toBe('Apple') // Alphabetically first
      expect(result[1].name).toBe('Zebra')
    })
  })
})
```

**Step 3: Run tests**

```bash
npm run test classes/__tests__/
```

Expected: All 5 tests pass

**Step 4: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/classes/__tests__/
git commit -m "test(siswa): add classes domain tests

Test two-query pattern and sort algorithm.
Verify sorting by sort_order with name fallback.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create management domain (queries + logic + actions) - LARGE

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/management/queries.ts`
- Create: `src/app/(admin)/users/siswa/actions/management/logic.ts`
- Create: `src/app/(admin)/users/siswa/actions/management/actions.ts`
- Read: `src/app/(admin)/users/siswa/actions/management.ts:1-1111`

**NOTE:** This is a LARGE task (~1,000 lines). Take your time.

**Step 1: Create management/queries.ts**

Create `src/app/(admin)/users/siswa/actions/management/queries.ts`:

```typescript
/**
 * Student Management Queries (Layer 1)
 *
 * Database queries for archive and transfer operations.
 * NO 'use server' directive - pure query builders.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

// Archive queries
export async function fetchStudentForArchive(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .select('id, name, daerah_id, desa_id, kelompok_id, status, deleted_at')
    .eq('id', studentId)
    .single()
}

export async function updateStudentArchive(
  supabase: SupabaseClient,
  studentId: string,
  data: {
    status: 'graduated' | 'inactive'
    archived_at: string
    archived_by: string
    archive_notes?: string | null
    updated_at: string
  }
) {
  return await supabase
    .from('students')
    .update(data)
    .eq('id', studentId)
}

export async function updateStudentUnarchive(
  supabase: SupabaseClient,
  studentId: string
) {
  return await supabase
    .from('students')
    .update({
      status: 'active',
      archived_at: null,
      archived_by: null,
      archive_notes: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId)
}

// Transfer queries
export async function insertTransferRequest(
  supabase: SupabaseClient,
  data: any
) {
  return await supabase
    .from('transfer_requests')
    .insert(data)
    .select()
    .single()
}

export async function fetchTransferRequestById(
  supabase: SupabaseClient,
  requestId: string
) {
  return await supabase
    .from('transfer_requests')
    .select('*')
    .eq('id', requestId)
    .single()
}

export async function updateTransferRequestStatus(
  supabase: SupabaseClient,
  requestId: string,
  data: {
    status: 'approved' | 'rejected' | 'cancelled'
    reviewed_by?: string
    reviewed_at?: string
    review_notes?: string
    executed_at?: string
    executed_by?: string
  }
) {
  return await supabase
    .from('transfer_requests')
    .update(data)
    .eq('id', requestId)
}

export async function fetchTransferRequests(
  supabase: SupabaseClient,
  filters?: {
    status?: string
    userId?: string
    daerahId?: string
    desaId?: string
    kelompokId?: string
  }
) {
  let query = supabase
    .from('transfer_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.userId) {
    query = query.eq('requested_by', filters.userId)
  }

  if (filters?.daerahId) {
    query = query.eq('to_daerah_id', filters.daerahId)
  }

  if (filters?.desaId) {
    query = query.eq('to_desa_id', filters.desaId)
  }

  if (filters?.kelompokId) {
    query = query.eq('to_kelompok_id', filters.kelompokId)
  }

  return await query
}

export async function executeTransferUpdate(
  supabase: SupabaseClient,
  studentIds: string[],
  orgData: {
    daerah_id: string
    desa_id: string
    kelompok_id: string
  },
  classIds?: string[]
) {
  const updateData: any = {
    daerah_id: orgData.daerah_id,
    desa_id: orgData.desa_id,
    kelompok_id: orgData.kelompok_id,
    updated_at: new Date().toISOString()
  }

  if (classIds && classIds.length > 0) {
    updateData.class_id = classIds[0] // Primary class
  }

  return await supabase
    .from('students')
    .update(updateData)
    .in('id', studentIds)
}
```

**Step 2: Create management/logic.ts**

Create `src/app/(admin)/users/siswa/actions/management/logic.ts`:

```typescript
/**
 * Student Management Logic (Layer 2)
 *
 * Pure business logic for archive and transfer operations.
 * NO 'use server' directive - testable without mocking.
 */

export function validateArchiveData(data: {
  studentId?: string
  status?: string
  notes?: string
}): { ok: boolean; error?: string } {
  if (!data.studentId) {
    return { ok: false, error: 'Student ID required' }
  }

  if (!data.status || !['graduated', 'inactive'].includes(data.status)) {
    return { ok: false, error: 'Status tidak valid. Pilih graduated atau inactive.' }
  }

  return { ok: true }
}

export function validateTransferRequest(data: {
  studentIds?: string[]
  toKelompokId?: string
}): { ok: boolean; error?: string } {
  if (!data.studentIds || data.studentIds.length === 0) {
    return { ok: false, error: 'Pilih minimal satu siswa' }
  }

  if (!data.toKelompokId) {
    return { ok: false, error: 'Kelompok tujuan harus dipilih' }
  }

  return { ok: true }
}
```

**Step 3: Create management/actions.ts (LARGE FILE)**

Create `src/app/(admin)/users/siswa/actions/management/actions.ts`:

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import {
  canArchiveStudent,
  canRequestTransfer,
  canReviewTransferRequest,
  needsApproval,
  type UserProfile,
  type Student,
  type TransferRequest,
} from '../students/permissions'
import {
  fetchStudentForArchive,
  updateStudentArchive,
  updateStudentUnarchive,
  insertTransferRequest,
  fetchTransferRequestById,
  updateTransferRequestStatus,
  fetchTransferRequests,
  executeTransferUpdate
} from './queries'
import {
  validateArchiveData,
  validateTransferRequest
} from './logic'

// Re-export types
export type { Student, TransferRequest }

export interface ArchiveStudentInput {
  studentId: string
  status: 'graduated' | 'inactive'
  notes?: string
}

export interface ArchiveStudentResponse {
  success: boolean
  error?: string
}

/**
 * Archive student (mark as graduated or inactive)
 */
export async function archiveStudent(
  input: ArchiveStudentInput
): Promise<ArchiveStudentResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Validate input (Layer 2)
    const validation = validateArchiveData(input)
    if (!validation.ok) {
      return { success: false, error: validation.error }
    }

    // Get current user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get student data (Layer 1)
    const { data: student } = await fetchStudentForArchive(adminClient, input.studentId)

    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission (Layer 2 - permissions)
    if (!canArchiveStudent(profile as UserProfile, student as Student)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk mengarsipkan siswa ini',
      }
    }

    // Update student status (Layer 1)
    const { error: updateError } = await updateStudentArchive(adminClient, input.studentId, {
      status: input.status,
      archived_at: new Date().toISOString(),
      archived_by: user.id,
      archive_notes: input.notes || null,
      updated_at: new Date().toISOString(),
    })

    if (updateError) {
      handleApiError(updateError, 'mengarsipkan data', 'Gagal mengarsipkan siswa')
      return { success: false, error: 'Gagal mengarsipkan siswa' }
    }

    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengarsipkan siswa'
    handleApiError(error, 'mengarsipkan data', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Unarchive student (restore to active)
 */
export async function unarchiveStudent(studentId: string): Promise<ArchiveStudentResponse> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get student data
    const { data: student } = await fetchStudentForArchive(adminClient, studentId)

    if (!student) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission (same as archive)
    if (!canArchiveStudent(profile as UserProfile, student as Student)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk mengembalikan siswa ini',
      }
    }

    // Update student status (Layer 1)
    const { error: updateError } = await updateStudentUnarchive(adminClient, studentId)

    if (updateError) {
      handleApiError(updateError, 'mengembalikan data', 'Gagal mengembalikan siswa')
      return { success: false, error: 'Gagal mengembalikan siswa' }
    }

    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengembalikan siswa'
    handleApiError(error, 'mengembalikan data', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Request student transfer
 */
export async function requestTransfer(input: {
  studentIds: string[]
  toKelompokId: string
  toClassIds?: string[]
  reason?: string
  notes?: string
}): Promise<{ success: boolean; error?: string; requestId?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Validate input (Layer 2)
    const validation = validateTransferRequest(input)
    if (!validation.ok) {
      return { success: false, error: validation.error }
    }

    // Get current user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get students data
    const { data: students } = await adminClient
      .from('students')
      .select('id, name, daerah_id, desa_id, kelompok_id')
      .in('id', input.studentIds)

    if (!students || students.length === 0) {
      return { success: false, error: 'Siswa tidak ditemukan' }
    }

    // Check permission for each student
    for (const student of students) {
      if (!canRequestTransfer(profile as UserProfile, student as Student)) {
        return {
          success: false,
          error: `Tidak memiliki izin untuk transfer siswa ${student.name}`,
        }
      }
    }

    // Get target kelompok data
    const { data: targetKelompok } = await supabase
      .from('kelompok')
      .select(`
        id,
        name,
        desa_id,
        desa:desa_id(
          id,
          name,
          daerah_id,
          daerah:daerah_id(id, name)
        )
      `)
      .eq('id', input.toKelompokId)
      .single()

    if (!targetKelompok) {
      return { success: false, error: 'Kelompok tujuan tidak ditemukan' }
    }

    // Use first student as reference for "from" org
    const fromStudent = students[0]
    const desa = Array.isArray(targetKelompok.desa) ? targetKelompok.desa[0] : targetKelompok.desa
    const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah

    // Create transfer request (Layer 1)
    const requestData = {
      student_ids: input.studentIds,
      from_daerah_id: fromStudent.daerah_id,
      from_desa_id: fromStudent.desa_id,
      from_kelompok_id: fromStudent.kelompok_id,
      to_daerah_id: daerah?.id || '',
      to_desa_id: desa?.id || '',
      to_kelompok_id: input.toKelompokId,
      to_class_ids: input.toClassIds || null,
      status: 'pending' as const,
      requested_by: user.id,
      requested_at: new Date().toISOString(),
      reason: input.reason || null,
      notes: input.notes || null
    }

    // Check if needs approval (Layer 2 - permissions)
    const needsReview = needsApproval(profile as UserProfile, requestData as any)

    if (!needsReview) {
      // Auto-approve (same org, superadmin)
      requestData.status = 'approved'
      const { data: request, error: insertError } = await insertTransferRequest(adminClient, requestData)

      if (insertError) {
        handleApiError(insertError, 'membuat request', 'Gagal membuat transfer request')
        return { success: false, error: 'Gagal membuat transfer request' }
      }

      // Execute transfer immediately (Layer 1)
      const { error: executeError } = await executeTransferUpdate(
        adminClient,
        input.studentIds,
        {
          daerah_id: daerah?.id || '',
          desa_id: desa?.id || '',
          kelompok_id: input.toKelompokId
        },
        input.toClassIds
      )

      if (executeError) {
        handleApiError(executeError, 'eksekusi transfer', 'Gagal eksekusi transfer')
        return { success: false, error: 'Gagal eksekusi transfer' }
      }

      // Update request as executed
      await updateTransferRequestStatus(adminClient, request!.id, {
        status: 'approved',
        executed_at: new Date().toISOString(),
        executed_by: user.id
      })

      revalidatePath('/users/siswa')
      return { success: true, requestId: request!.id }
    }

    // Create pending request
    const { data: request, error: insertError } = await insertTransferRequest(adminClient, requestData)

    if (insertError) {
      handleApiError(insertError, 'membuat request', 'Gagal membuat transfer request')
      return { success: false, error: 'Gagal membuat transfer request' }
    }

    revalidatePath('/users/siswa')
    return { success: true, requestId: request!.id }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal membuat transfer request'
    handleApiError(error, 'membuat request', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Approve transfer request
 */
export async function approveTransfer(
  requestId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get transfer request (Layer 1)
    const { data: request } = await fetchTransferRequestById(adminClient, requestId)

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    // Check permission (Layer 2 - permissions)
    if (!canReviewTransferRequest(profile as UserProfile, request as TransferRequest)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk approve transfer request ini',
      }
    }

    // Execute transfer (Layer 1)
    const { error: executeError } = await executeTransferUpdate(
      adminClient,
      request.student_ids,
      {
        daerah_id: request.to_daerah_id,
        desa_id: request.to_desa_id,
        kelompok_id: request.to_kelompok_id
      },
      request.to_class_ids
    )

    if (executeError) {
      handleApiError(executeError, 'eksekusi transfer', 'Gagal eksekusi transfer')
      return { success: false, error: 'Gagal eksekusi transfer' }
    }

    // Update request status (Layer 1)
    const { error: updateError } = await updateTransferRequestStatus(adminClient, requestId, {
      status: 'approved',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes,
      executed_at: new Date().toISOString(),
      executed_by: user.id
    })

    if (updateError) {
      handleApiError(updateError, 'update request', 'Gagal update transfer request')
      return { success: false, error: 'Gagal update transfer request' }
    }

    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal approve transfer'
    handleApiError(error, 'approve transfer', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Reject transfer request
 */
export async function rejectTransfer(
  requestId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return { success: false, error: 'User profile not found' }
    }

    // Get transfer request
    const { data: request } = await fetchTransferRequestById(adminClient, requestId)

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    // Check permission
    if (!canReviewTransferRequest(profile as UserProfile, request as TransferRequest)) {
      return {
        success: false,
        error: 'Tidak memiliki izin untuk reject transfer request ini',
      }
    }

    // Update request status (Layer 1)
    const { error: updateError } = await updateTransferRequestStatus(adminClient, requestId, {
      status: 'rejected',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_notes: notes
    })

    if (updateError) {
      handleApiError(updateError, 'reject request', 'Gagal reject transfer request')
      return { success: false, error: 'Gagal reject transfer request' }
    }

    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal reject transfer'
    handleApiError(error, 'reject transfer', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Cancel transfer request (by requester)
 */
export async function cancelTransferRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Get transfer request
    const { data: request } = await fetchTransferRequestById(adminClient, requestId)

    if (!request) {
      return { success: false, error: 'Transfer request tidak ditemukan' }
    }

    // Verify requester
    if (request.requested_by !== user.id) {
      return {
        success: false,
        error: 'Hanya pembuat request yang dapat membatalkan',
      }
    }

    // Update status (Layer 1)
    const { error: updateError } = await updateTransferRequestStatus(adminClient, requestId, {
      status: 'cancelled'
    })

    if (updateError) {
      handleApiError(updateError, 'cancel request', 'Gagal cancel transfer request')
      return { success: false, error: 'Gagal cancel transfer request' }
    }

    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Gagal cancel transfer'
    handleApiError(error, 'cancel transfer', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Get transfer requests
 */
export async function getTransferRequests(filters?: {
  status?: string
}): Promise<TransferRequest[]> {
  try {
    const supabase = await createClient()
    const adminClient = await createAdminClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, daerah_id, desa_id, kelompok_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      throw new Error('User profile not found')
    }

    // Build query filters
    const queryFilters: any = { ...filters }

    // Apply scope based on role
    if (profile.role === 'admin') {
      if (profile.kelompok_id) {
        queryFilters.kelompokId = profile.kelompok_id
      } else if (profile.desa_id) {
        queryFilters.desaId = profile.desa_id
      } else if (profile.daerah_id) {
        queryFilters.daerahId = profile.daerah_id
      }
    }

    // Query requests (Layer 1)
    const { data: requests, error } = await fetchTransferRequests(adminClient, queryFilters)

    if (error) throw error

    return (requests || []) as TransferRequest[]
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat transfer requests')
    throw error
  }
}

/**
 * Get single transfer request by ID
 */
export async function getTransferRequestById(requestId: string): Promise<TransferRequest | null> {
  try {
    const adminClient = await createAdminClient()

    const { data: request, error } = await fetchTransferRequestById(adminClient, requestId)

    if (error) throw error

    return request as TransferRequest | null
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat transfer request')
    throw error
  }
}
```

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 5: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/management/
git commit -m "refactor(siswa): create management domain with 3-layer pattern

Extract from actions/management.ts:
- queries.ts: Archive/transfer DB operations
- logic.ts: Validation helpers
- actions.ts: Archive, transfer server actions

Use permissions from students/permissions.ts.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Create management/__tests__/

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/management/__tests__/queries.test.ts`
- Create: `src/app/(admin)/users/siswa/actions/management/__tests__/logic.test.ts`

**Step 1: Create queries.test.ts**

Create `management/__tests__/queries.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import {
  fetchStudentForArchive,
  updateStudentArchive,
  insertTransferRequest
} from '../queries'

describe('Management Queries', () => {
  describe('fetchStudentForArchive', () => {
    it('should query students table for archive', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: '123', status: 'active' },
            error: null
          })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect })
      } as any

      await fetchStudentForArchive(mockSupabase, '123')

      expect(mockSupabase.from).toHaveBeenCalledWith('students')
    })
  })

  describe('insertTransferRequest', () => {
    it('should insert transfer request', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'req-1' },
            error: null
          })
        })
      })

      const mockSupabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any

      await insertTransferRequest(mockSupabase, { status: 'pending' })

      expect(mockSupabase.from).toHaveBeenCalledWith('transfer_requests')
      expect(mockInsert).toHaveBeenCalledWith({ status: 'pending' })
    })
  })
})
```

**Step 2: Create logic.test.ts**

Create `management/__tests__/logic.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  validateArchiveData,
  validateTransferRequest
} from '../logic'

describe('Management Logic', () => {
  describe('validateArchiveData', () => {
    it('should reject missing studentId', () => {
      const result = validateArchiveData({ status: 'graduated' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Student ID')
    })

    it('should reject invalid status', () => {
      const result = validateArchiveData({
        studentId: '123',
        status: 'invalid'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Status tidak valid')
    })

    it('should accept valid archive data', () => {
      const result = validateArchiveData({
        studentId: '123',
        status: 'graduated',
        notes: 'Lulus 2026'
      })
      expect(result.ok).toBe(true)
    })
  })

  describe('validateTransferRequest', () => {
    it('should reject empty studentIds', () => {
      const result = validateTransferRequest({
        studentIds: [],
        toKelompokId: 'k1'
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Pilih minimal satu siswa')
    })

    it('should reject missing toKelompokId', () => {
      const result = validateTransferRequest({
        studentIds: ['s1']
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Kelompok tujuan')
    })

    it('should accept valid transfer request', () => {
      const result = validateTransferRequest({
        studentIds: ['s1', 's2'],
        toKelompokId: 'k1'
      })
      expect(result.ok).toBe(true)
    })
  })
})
```

**Step 3: Run tests**

```bash
npm run test management/__tests__/
```

Expected: All 6 tests pass

**Step 4: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/management/__tests__/
git commit -m "test(siswa): add management domain tests

Test archive and transfer validation logic.
Test query structure for archive/transfer operations.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Create index.ts (Re-exports for backward compatibility)

**Files:**
- Create: `src/app/(admin)/users/siswa/actions/index.ts`

**Step 1: Create index.ts with all re-exports**

Create `src/app/(admin)/users/siswa/actions/index.ts`:

```typescript
/**
 * Siswa Actions Index
 *
 * Re-export all server actions for backward compatibility.
 * Components continue to import from '@/app/(admin)/users/siswa/actions'
 */

// ============================================
// STUDENTS DOMAIN
// ============================================
export {
  getUserProfile,
  getAllStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  checkStudentHasAttendance,
  getStudentClasses,
  assignStudentsToClass,
  createStudentsBatch,
  getCurrentUserRole,
  getStudentInfo,
  getStudentAttendanceHistory,
  getStudentBiodata,
  updateStudentBiodata,
  type Student
} from './students/actions'

// ============================================
// CLASSES DOMAIN
// ============================================
export {
  getAllClasses,
  getAllClassesByKelompok,
  type Class
} from './classes/actions'

// ============================================
// MANAGEMENT DOMAIN
// ============================================
export {
  archiveStudent,
  unarchiveStudent,
  requestTransfer,
  approveTransfer,
  rejectTransfer,
  cancelTransferRequest,
  getTransferRequests,
  getTransferRequestById,
  type TransferRequest,
  type ArchiveStudentInput,
  type ArchiveStudentResponse
} from './management/actions'
```

**Step 2: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 3: Commit**

```bash
git add src/app/\(admin\)/users/siswa/actions/index.ts
git commit -m "refactor(siswa): create index.ts re-exports

Export all server actions from 3 domains.
Maintains 100% backward compatibility.
Components continue using same import paths.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Update component imports (permissions)

**Files:**
- Modify: `src/app/(admin)/users/siswa/components/StudentsTable.tsx`
- Read: Check all files importing `@/lib/studentPermissions`

**Step 1: Find all files importing studentPermissions**

```bash
grep -r "from '@/lib/studentPermissions'" src/app/\(admin\)/users/siswa/
```

Expected: Should find `components/StudentsTable.tsx`

**Step 2: Update StudentsTable.tsx imports**

Edit `src/app/(admin)/users/siswa/components/StudentsTable.tsx`:

Find:
```typescript
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent
} from '@/lib/studentPermissions'
```

Replace with:
```typescript
import {
  canArchiveStudent,
  canTransferStudent,
  canSoftDeleteStudent,
  canHardDeleteStudent
} from '../actions/students/permissions'
```

**Step 3: Type-check**

```bash
npm run type-check
```

Expected: No errors

**Step 4: Commit**

```bash
git add src/app/\(admin\)/users/siswa/components/StudentsTable.tsx
git commit -m "refactor(siswa): update StudentsTable permissions import

Change from @/lib/studentPermissions to relative path.
Permissions now co-located with students domain.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 16: Delete old files

**Files:**
- Delete: `src/app/(admin)/users/siswa/actions.ts`
- Delete: `src/app/(admin)/users/siswa/actions/classes.ts`
- Delete: `src/app/(admin)/users/siswa/actions/management.ts`
- Delete: `src/lib/studentPermissions.ts`
- Delete: `src/lib/__tests__/studentPermissions.test.ts`

**Step 1: Verify index.ts exports all needed actions**

```bash
grep -r "from '@/app/(admin)/users/siswa/actions'" src/
```

Expected: All imports should work via index.ts

**Step 2: Delete old action files**

```bash
git rm src/app/\(admin\)/users/siswa/actions.ts
git rm src/app/\(admin\)/users/siswa/actions/classes.ts
git rm src/app/\(admin\)/users/siswa/actions/management.ts
```

**Step 3: Delete old permission files**

```bash
git rm src/lib/studentPermissions.ts
git rm src/lib/__tests__/studentPermissions.test.ts
```

**Step 4: Type-check**

```bash
npm run type-check
```

Expected: No errors (all imports resolved via new structure)

**Step 5: Commit**

```bash
git commit -m "refactor(siswa): delete old monolithic files

Remove:
- actions.ts (1,682 lines) → students/
- actions/classes.ts (245 lines) → classes/
- actions/management.ts (1,111 lines) → management/
- @/lib/studentPermissions.ts → students/permissions.ts

All functionality preserved in 3-layer domain structure.

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 17: Run full test suite

**Files:**
- Verify: All tests pass

**Step 1: Run all tests**

```bash
npm run test
```

Expected: All tests pass (~45 new tests + existing tests)

**Step 2: Check test coverage**

```bash
npm run test:coverage -- users/siswa
```

Expected coverage:
- queries.ts: 60-70%
- logic.ts: 95-100%
- permissions.ts: existing coverage maintained

**Step 3: If failures, debug**

If any tests fail:
1. Read error message
2. Check import paths (relative vs absolute)
3. Verify mock structure matches query functions
4. Fix and re-run

**Step 4: Document results**

Note: All XX tests passing (update plan with actual count)

---

## Task 18: Production build verification

**Files:**
- Verify: Production build succeeds

**Step 1: Run production build**

```bash
npm run build
```

Expected: Build completes successfully (all routes compile)

**Step 2: Type-check**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 3: Check for warnings**

Review build output for:
- ✅ No 'use server' misplacement warnings
- ✅ No circular dependency warnings
- ✅ No missing export warnings

**Step 4: Document build success**

Note: Build completed in XX seconds, XX routes compiled

---

## Task 19: Manual smoke test

**Files:**
- Test: CRUD, archive, transfer operations

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Navigate to /users/siswa**

Open: http://localhost:3000/users/siswa

**Step 3: Test student CRUD**

- ✅ List students loads
- ✅ Filter by class works
- ✅ Create new student
- ✅ Edit student name/class
- ✅ Delete student (soft)

**Step 4: Test archive**

- ✅ Archive student as "graduated"
- ✅ Verify status changed
- ✅ Unarchive student

**Step 5: Test transfer (if UI available)**

- ✅ Create transfer request
- ✅ Verify request created

**Step 6: Check console for errors**

Expected: No errors in browser console

---

## Task 20: Final verification and cleanup

**Files:**
- Verify: Success criteria met

**Step 1: Verify success criteria**

- [ ] All automated tests pass
- [ ] Type-check passes
- [ ] Production build succeeds
- [ ] Zero breaking changes (components import from `actions/`)
- [ ] Each file <500 lines
- [ ] Layer separation enforced
- [ ] Permissions moved to domain
- [ ] Manual smoke tests pass
- [ ] No console errors

**Step 2: Show final structure**

```bash
tree src/app/\(admin\)/users/siswa/actions/ -I node_modules -L 3
```

Expected:
```
actions/
├── students/
│   ├── queries.ts
│   ├── logic.ts
│   ├── permissions.ts
│   ├── actions.ts
│   └── __tests__/
├── classes/
│   ├── queries.ts
│   ├── logic.ts
│   ├── actions.ts
│   └── __tests__/
├── management/
│   ├── queries.ts
│   ├── logic.ts
│   ├── actions.ts
│   └── __tests__/
└── index.ts
```

**Step 3: Show git status**

```bash
git status
```

Expected: Working tree clean (all changes committed)

**Step 4: Final commit (if any loose ends)**

```bash
git commit -m "refactor(siswa): finalize 3-layer refactoring

Summary:
- Refactored 3,038 lines → 15 modular files
- Students: queries (400L), logic (200L), permissions (400L), actions (900L)
- Classes: queries (150L), logic (100L), actions (50L)
- Management: queries (250L), logic (150L), actions (650L)
- Tests: 45 new tests (queries + logic + permissions)
- 100% backward compatible via index.ts

Reference: sm-d15 gold standard, docs/plans/2026-03-08-siswa-actions-design.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria ✅

**All criteria must pass:**

- ✅ All automated tests pass (`npm run test`)
- ✅ Type-check passes (`npm run type-check`)
- ✅ Production build succeeds (`npm run build`)
- ✅ Zero breaking changes (components still import from `actions/`)
- ✅ Each file <500 lines (down from 1,682)
- ✅ Layer separation enforced (queries/logic/actions distinct)
- ✅ Permissions moved to domain folder (`students/permissions.ts`)
- ✅ Manual smoke tests pass (8 checklist items)
- ✅ No console errors in browser
- ✅ SWR cache invalidation working (`revalidatePath` called)

---

## File Count Summary

| Action | Count |
|--------|-------|
| **Created** | 18 files (3 domains × 4-5 files + 3 test folders + index.ts) |
| **Deleted** | 5 files (actions.ts, classes.ts, management.ts, @/lib/studentPermissions.ts, test file) |
| **Updated** | ~2 files (StudentsTable.tsx imports) |
| **Net** | +13 files |

---

## Timeline Estimate

**Total: ~2.5 hours**

| Task | Duration |
|------|----------|
| 1-2: Setup + permissions | 25 mins |
| 3-9: Students domain | 90 mins |
| 10-11: Classes domain | 30 mins |
| 12-13: Management domain | 50 mins |
| 14-16: Integration + cleanup | 20 mins |
| 17-20: Testing + verification | 25 mins |

---

## Plan Complete! 🎉

Plan saved to: `docs/plans/2026-03-08-siswa-actions.md`

Two execution options:

**1. Subagent-Driven (this session)** - Dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach do you prefer?
