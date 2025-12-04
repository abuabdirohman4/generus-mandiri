# Implementation Plan: Student Enrollment Management System

## Overview
Implementasi sistem auto-enrollment dan enrollment management untuk memastikan setiap siswa otomatis ter-enroll ke tahun ajaran aktif, serta menyediakan UI untuk manage enrollment history.

**Prerequisites:**
- ✅ Database tables `academic_years` dan `student_enrollments` sudah dibuat
- ✅ Migration existing students ke enrollment sudah dijalankan
- ⏳ Menunggu Phase 1-4 dari Hafalan & Rapot system selesai

---

## Problem Statement

### Current Issues:
1. **No Auto-Enrollment:** Saat create/update siswa, tidak otomatis masuk ke `student_enrollments`
2. **Manual Tracking:** Admin harus manual enroll siswa setiap tahun ajaran baru
3. **No UI:** Belum ada interface untuk manage enrollment history siswa
4. **Data Inconsistency:** `students.class_id` vs `student_enrollments.class_id` bisa tidak sinkron

### Goals:
- ✅ Auto-enroll siswa baru ke tahun ajaran aktif
- ✅ Auto-update enrollment saat siswa pindah kelas
- ✅ UI untuk manage enrollment (naik kelas, pindah kelas, lulus, dropout)
- ✅ Sinkronisasi `students.class_id` dengan enrollment aktif
- ✅ Historical tracking lengkap untuk rapot multi-year

---

## Phase 1: Auto-Enrollment Logic

### 1.1 Update Server Actions

#### [MODIFY] `src/app/(admin)/siswa/actions.ts`

**Add helper function:**
```typescript
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * Get active academic year
 */
async function getActiveAcademicYear() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('is_active', true)
    .single()

  if (error || !data) {
    console.warn('No active academic year found')
    return null
  }

  return data
}

/**
 * Auto-enroll student to active academic year
 */
async function autoEnrollStudent(
  studentId: string,
  classId: string,
  semester: number = 1
): Promise<{ success: boolean; error?: string }> {
  const adminClient = await createAdminClient()

  // Get active academic year
  const activeYear = await getActiveAcademicYear()
  if (!activeYear) {
    return {
      success: false,
      error: 'No active academic year found. Please set an active year first.'
    }
  }

  // Check if enrollment already exists
  const { data: existing } = await adminClient
    .from('student_enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('academic_year_id', activeYear.id)
    .eq('semester', semester)
    .single()

  if (existing) {
    // Update existing enrollment
    const { error } = await adminClient
      .from('student_enrollments')
      .update({
        class_id: classId,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)

    if (error) {
      console.error('Error updating enrollment:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  // Create new enrollment
  const { error } = await adminClient
    .from('student_enrollments')
    .insert({
      student_id: studentId,
      class_id: classId,
      academic_year_id: activeYear.id,
      semester: semester,
      status: 'active',
      enrollment_date: new Date().toISOString()
    })

  if (error) {
    console.error('Error creating enrollment:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}
```

**Modify `createStudent` action:**
```typescript
export async function createStudent(
  data: StudentInput
): Promise<{ success: boolean; data?: Student; error?: string }> {
  'use server'

  const adminClient = await createAdminClient()

  // ... existing validation code ...

  // Insert student
  const { data: newStudent, error: insertError } = await adminClient
    .from('students')
    .insert({
      name: data.name,
      gender: data.gender,
      class_id: data.class_id,
      kelompok_id: data.kelompok_id,
      desa_id: data.desa_id,
      daerah_id: data.daerah_id
    })
    .select()
    .single()

  if (insertError || !newStudent) {
    return { success: false, error: insertError?.message }
  }

  // 🆕 AUTO-ENROLL to active academic year
  if (data.class_id) {
    const enrollResult = await autoEnrollStudent(newStudent.id, data.class_id)
    if (!enrollResult.success) {
      console.warn('Failed to auto-enroll student:', enrollResult.error)
      // Don't fail the whole operation, just log warning
    }
  }

  revalidatePath('/siswa')
  return { success: true, data: newStudent }
}
```

**Modify `updateStudent` action:**
```typescript
export async function updateStudent(
  id: string,
  data: StudentInput
): Promise<{ success: boolean; data?: Student; error?: string }> {
  'use server'

  const adminClient = await createAdminClient()

  // ... existing validation code ...

  // Get old student data
  const { data: oldStudent } = await adminClient
    .from('students')
    .select('class_id')
    .eq('id', id)
    .single()

  // Update student
  const { data: updatedStudent, error: updateError } = await adminClient
    .from('students')
    .update({
      name: data.name,
      gender: data.gender,
      class_id: data.class_id,
      kelompok_id: data.kelompok_id,
      desa_id: data.desa_id,
      daerah_id: data.daerah_id,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single()

  if (updateError || !updatedStudent) {
    return { success: false, error: updateError?.message }
  }

  // 🆕 UPDATE ENROLLMENT if class changed
  if (data.class_id && oldStudent?.class_id !== data.class_id) {
    const enrollResult = await autoEnrollStudent(id, data.class_id)
    if (!enrollResult.success) {
      console.warn('Failed to update enrollment:', enrollResult.error)
    }
  }

  revalidatePath('/siswa')
  revalidatePath(`/siswa/${id}`)
  return { success: true, data: updatedStudent }
}
```

### 1.2 Semester Auto-Detection

**Logic untuk menentukan semester saat auto-enroll:**
```typescript
/**
 * Get current semester based on date
 * Semester 1: July - December
 * Semester 2: January - June
 */
function getCurrentSemester(): 1 | 2 {
  const now = new Date()
  const month = now.getMonth() + 1 // 1-12

  // Semester 1: July (7) - December (12)
  // Semester 2: January (1) - June (6)
  return month >= 7 ? 1 : 2
}

// Usage in autoEnrollStudent:
async function autoEnrollStudent(
  studentId: string,
  classId: string,
  semester?: number // Optional, auto-detect if not provided
) {
  const currentSemester = semester ?? getCurrentSemester()
  // ... rest of logic
}
```

---

## Phase 2: Enrollment Management UI

### 2.1 Student Enrollment History Page

#### [NEW] `src/app/(admin)/siswa/[id]/enrollments/page.tsx`

**Features:**
- View enrollment history siswa (semua tahun ajaran)
- Add new enrollment (untuk naik kelas / enroll tahun baru)
- Update enrollment status (active → graduated/transferred/dropped)
- Edit enrollment (ganti kelas untuk semester tertentu)

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│ 👤 Andi Wijaya - Enrollment History                        │
├─────────────────────────────────────────────────────────────┤
│ [+ Enroll ke Tahun Ajaran Baru]                            │
│                                                              │
│ 📅 2024/2025                                                │
│ ├─ Semester 1: Kelas 1A [Active] ✏️ 🗑️                    │
│ └─ Semester 2: Kelas 1A [Active] ✏️ 🗑️                    │
│                                                              │
│ 📅 2023/2024                                                │
│ ├─ Semester 1: TK B [Graduated] ✏️                         │
│ └─ Semester 2: TK B [Graduated] ✏️                         │
│                                                              │
│ 📅 2022/2023                                                │
│ └─ Semester 1: TK A [Transferred] ✏️                       │
└─────────────────────────────────────────────────────────────┘
```

**Status Badge Colors:**
- `active` → Green
- `graduated` → Blue
- `transferred` → Orange
- `dropped` → Red

### 2.2 Enrollment Modal

#### [NEW] `src/app/(admin)/siswa/components/EnrollmentModal.tsx`

**Fields:**
```typescript
interface EnrollmentFormData {
  student_id: string
  academic_year_id: string
  semester: 1 | 2
  class_id: string
  status: 'active' | 'graduated' | 'transferred' | 'dropped'
  enrollment_date: string
  notes?: string
}
```

**Modal UI:**
```
┌────────────────────────────────────────────┐
│ Enroll Siswa ke Tahun Ajaran               │
├────────────────────────────────────────────┤
│ Siswa: Andi Wijaya                         │
│                                             │
│ Tahun Ajaran: [2024/2025 ▼]               │
│ Semester:     [⚪ Semester 1  ⚪ Semester 2]│
│ Kelas:        [Kelas 2A ▼]                 │
│ Status:       [Active ▼]                   │
│ Tanggal:      [04/12/2024]                 │
│ Catatan:      [____________]               │
│                                             │
│ [Batal] [Simpan]                           │
└────────────────────────────────────────────┘
```

### 2.3 Quick Enroll from Student List

**Add button di halaman siswa utama:**
```typescript
// src/app/(admin)/siswa/page.tsx

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Nama</TableHead>
      <TableHead>Kelas</TableHead>
      <TableHead>Status Enrollment</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {students.map(student => (
      <TableRow key={student.id}>
        <TableCell>{student.name}</TableCell>
        <TableCell>{student.class?.name}</TableCell>
        <TableCell>
          {student.hasActiveEnrollment ? (
            <Badge variant="success">Enrolled</Badge>
          ) : (
            <Badge variant="warning">Not Enrolled</Badge>
          )}
        </TableCell>
        <TableCell>
          <Button onClick={() => openEnrollModal(student)}>
            Enroll
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## Phase 3: Bulk Operations

### 3.1 Bulk Enroll Students

**Use Case:** Naik kelas massal (semua siswa Kelas 1 naik ke Kelas 2)

#### [NEW] Server Action
```typescript
// src/app/(admin)/siswa/actions.ts

export async function bulkEnrollStudents(
  studentIds: string[],
  academicYearId: string,
  semester: number,
  classId: string
): Promise<{ success: boolean; created: number; failed: number }> {
  'use server'

  const adminClient = await createAdminClient()
  let created = 0
  let failed = 0

  for (const studentId of studentIds) {
    const { error } = await adminClient
      .from('student_enrollments')
      .insert({
        student_id: studentId,
        class_id: classId,
        academic_year_id: academicYearId,
        semester: semester,
        status: 'active'
      })

    if (error) {
      failed++
      console.error(`Failed to enroll student ${studentId}:`, error)
    } else {
      created++
    }
  }

  revalidatePath('/siswa')
  return { success: true, created, failed }
}
```

#### [NEW] Bulk Enroll Modal
```
┌──────────────────────────────────────────────┐
│ Bulk Enroll Siswa                            │
├──────────────────────────────────────────────┤
│ 25 siswa terpilih                            │
│                                               │
│ Tahun Ajaran: [2025/2026 ▼]                 │
│ Semester:     [⚪ Semester 1  ⚪ Semester 2]  │
│ Kelas Tujuan: [Kelas 2A ▼]                   │
│                                               │
│ Preview:                                      │
│ ✓ Andi Wijaya (Kelas 1A → Kelas 2A)         │
│ ✓ Budi Santoso (Kelas 1A → Kelas 2A)        │
│ ✓ Citra Dewi (Kelas 1B → Kelas 2A)          │
│ ... (22 more)                                 │
│                                               │
│ [Batal] [Enroll Semua]                       │
└──────────────────────────────────────────────┘
```

### 3.2 Bulk Graduate Students

**Use Case:** Lulus massal (semua siswa Kelas 6 lulus)

```typescript
export async function bulkGraduateStudents(
  studentIds: string[],
  academicYearId: string,
  semester: number
): Promise<{ success: boolean; updated: number }> {
  'use server'

  const adminClient = await createAdminClient()

  const { error, count } = await adminClient
    .from('student_enrollments')
    .update({ status: 'graduated' })
    .in('student_id', studentIds)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)

  if (error) {
    return { success: false, updated: 0 }
  }

  revalidatePath('/siswa')
  return { success: true, updated: count || 0 }
}
```

---

## Phase 4: Data Sync & Consistency

### 4.1 Sync `students.class_id` with Active Enrollment

**Problem:**
- `students.class_id` adalah "current class" untuk backward compatibility
- `student_enrollments.class_id` adalah historical record per tahun/semester
- Perlu sync agar `students.class_id` selalu match dengan enrollment aktif terbaru

**Solution: Database Trigger**

```sql
-- Trigger untuk auto-update students.class_id saat enrollment berubah
CREATE OR REPLACE FUNCTION sync_student_class_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Update students.class_id to match the latest active enrollment
  UPDATE students
  SET class_id = NEW.class_id,
      updated_at = NOW()
  WHERE id = NEW.student_id
    AND NEW.status = 'active';

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_student_class
  AFTER INSERT OR UPDATE OF class_id, status
  ON student_enrollments
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION sync_student_class_id();
```

**Alternative: Server-side Sync**
```typescript
// Jika tidak mau pakai trigger, bisa manual sync di action
async function syncStudentClassId(studentId: string, classId: string) {
  const adminClient = await createAdminClient()

  await adminClient
    .from('students')
    .update({ class_id: classId })
    .eq('id', studentId)
}

// Call setelah update enrollment:
await autoEnrollStudent(studentId, newClassId)
await syncStudentClassId(studentId, newClassId)
```

### 4.2 Enrollment Validation Rules

**Business Rules:**
1. ✅ Siswa hanya boleh punya 1 enrollment ACTIVE per semester
2. ✅ Tidak boleh enroll ke semester yang belum dimulai (validasi date range)
3. ✅ Status 'graduated' tidak bisa diubah kembali ke 'active'
4. ✅ Jika siswa pindah kelas mid-semester, enrollment lama jadi 'transferred'

**Implement di server action:**
```typescript
async function validateEnrollment(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<{ valid: boolean; error?: string }> {
  const adminClient = await createAdminClient()

  // Rule 1: Check existing active enrollment
  const { data: existing } = await adminClient
    .from('student_enrollments')
    .select('*')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
    .eq('status', 'active')
    .single()

  if (existing) {
    return {
      valid: false,
      error: 'Student already has an active enrollment for this semester'
    }
  }

  // Rule 2: Check academic year date range
  const { data: academicYear } = await adminClient
    .from('academic_years')
    .select('start_date, end_date')
    .eq('id', academicYearId)
    .single()

  if (academicYear) {
    const now = new Date()
    const startDate = new Date(academicYear.start_date)

    if (now < startDate) {
      return {
        valid: false,
        error: 'Cannot enroll to a future academic year'
      }
    }
  }

  return { valid: true }
}
```

---

## Phase 5: Admin Dashboard for Enrollment

### 5.1 Enrollment Overview Page

#### [NEW] `src/app/(admin)/settings/enrollments/page.tsx`

**Features:**
- Summary stats per tahun ajaran
- List siswa yang belum enrolled
- Quick actions (enroll all, bulk graduate)

**UI:**
```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Enrollment Overview                                      │
├─────────────────────────────────────────────────────────────┤
│ Tahun Ajaran: [2024/2025 ▼] Semester: [1 ▼]               │
│                                                              │
│ 📈 Statistics                                               │
│ ┌──────────────┬──────────────┬──────────────┐            │
│ │ Total Siswa  │ Enrolled     │ Not Enrolled │            │
│ │ 342          │ 341 (99.7%)  │ 1 (0.3%)     │            │
│ └──────────────┴──────────────┴──────────────┘            │
│                                                              │
│ ⚠️ Siswa Belum Enrolled (1)                                │
│ ┌────────────────────────────────────────────────┐         │
│ │ Nama           │ Kelas  │ Action              │         │
│ ├────────────────────────────────────────────────┤         │
│ │ Deni Kurniawan │ Kelas 3│ [Enroll Now]        │         │
│ └────────────────────────────────────────────────┘         │
│                                                              │
│ 📋 Enrollment by Class                                      │
│ • Kelas 1A: 25/25 students enrolled                        │
│ • Kelas 1B: 24/24 students enrolled                        │
│ • Kelas 2A: 30/30 students enrolled                        │
│ ...                                                          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Year-End Operations

**Workflow untuk akhir tahun ajaran:**

1. **Graduate Semester 2:**
   - Bulk graduate siswa kelas terakhir (Kelas 6)
   - Set status = 'graduated'

2. **Promote to Next Class:**
   - Bulk enroll siswa ke tahun ajaran baru
   - Auto-increment class (Kelas 1 → Kelas 2)

3. **Archive & Start New Year:**
   - Set current year `is_active = false`
   - Create new academic year
   - Set new year `is_active = true`

**Action Flow:**
```typescript
export async function promoteStudentsToNextYear(
  currentAcademicYearId: string,
  newAcademicYearId: string,
  classMapping: Record<string, string> // { 'kelas-1-id': 'kelas-2-id' }
): Promise<{ success: boolean; promoted: number }> {
  'use server'

  const adminClient = await createAdminClient()

  // 1. Get all active enrollments from current year semester 2
  const { data: currentEnrollments } = await adminClient
    .from('student_enrollments')
    .select('student_id, class_id')
    .eq('academic_year_id', currentAcademicYearId)
    .eq('semester', 2)
    .eq('status', 'active')

  if (!currentEnrollments) return { success: false, promoted: 0 }

  // 2. Create enrollments for new year
  const newEnrollments = currentEnrollments.map(enrollment => ({
    student_id: enrollment.student_id,
    class_id: classMapping[enrollment.class_id] || enrollment.class_id, // Map to next class
    academic_year_id: newAcademicYearId,
    semester: 1,
    status: 'active'
  }))

  const { error, data } = await adminClient
    .from('student_enrollments')
    .insert(newEnrollments)
    .select()

  if (error) {
    return { success: false, promoted: 0 }
  }

  revalidatePath('/siswa')
  revalidatePath('/settings/enrollments')
  return { success: true, promoted: data.length }
}
```

---

## Database Migrations

### Migration: Add Trigger for Class Sync

**File:** `supabase/migrations/20241205_add_enrollment_sync_trigger.sql`

```sql
-- Function to sync students.class_id with active enrollment
CREATE OR REPLACE FUNCTION sync_student_class_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only sync if enrollment is active
  IF NEW.status = 'active' THEN
    UPDATE students
    SET
      class_id = NEW.class_id,
      updated_at = NOW()
    WHERE id = NEW.student_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on INSERT or UPDATE
CREATE TRIGGER trigger_sync_student_class_after_insert
  AFTER INSERT ON student_enrollments
  FOR EACH ROW
  EXECUTE FUNCTION sync_student_class_id();

CREATE TRIGGER trigger_sync_student_class_after_update
  AFTER UPDATE OF class_id, status ON student_enrollments
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION sync_student_class_id();

-- RLS Policies for student_enrollments (jika belum ada)
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- Teachers can view enrollments for their classes
CREATE POLICY "Teachers can view their class enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teacher_classes tc
      WHERE tc.teacher_id = auth.uid()
      AND tc.class_id = student_enrollments.class_id
    )
  );

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage enrollments"
  ON student_enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'superadmin')
    )
  );
```

---

## Server Actions Reference

### [NEW] `src/app/(admin)/actions/enrollments.ts`

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface EnrollmentInput {
  student_id: string
  class_id: string
  academic_year_id: string
  semester: 1 | 2
  status?: 'active' | 'graduated' | 'transferred' | 'dropped'
  enrollment_date?: string
  notes?: string
}

export interface Enrollment extends EnrollmentInput {
  id: string
  created_at: string
  updated_at: string
}

// Get student enrollment history
export async function getStudentEnrollments(
  studentId: string
): Promise<Enrollment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_enrollments')
    .select(`
      *,
      academic_year:academic_years(*),
      class:classes(*)
    `)
    .eq('student_id', studentId)
    .order('academic_year_id', { ascending: false })
    .order('semester', { ascending: false })

  if (error) throw error
  return data || []
}

// Get class enrollments for specific year/semester
export async function getClassEnrollments(
  classId: string,
  academicYearId: string,
  semester: number
): Promise<Enrollment[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('student_enrollments')
    .select(`
      *,
      student:students(*)
    `)
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)

  if (error) throw error
  return data || []
}

// Create enrollment
export async function createEnrollment(
  input: EnrollmentInput
): Promise<{ success: boolean; data?: Enrollment; error?: string }> {
  const adminClient = await createAdminClient()

  // Validate
  const validation = await validateEnrollment(
    input.student_id,
    input.academic_year_id,
    input.semester
  )

  if (!validation.valid) {
    return { success: false, error: validation.error }
  }

  const { data, error } = await adminClient
    .from('student_enrollments')
    .insert({
      ...input,
      status: input.status || 'active',
      enrollment_date: input.enrollment_date || new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/siswa')
  revalidatePath(`/siswa/${input.student_id}`)
  return { success: true, data }
}

// Update enrollment status
export async function updateEnrollmentStatus(
  id: string,
  status: 'active' | 'graduated' | 'transferred' | 'dropped'
): Promise<{ success: boolean; error?: string }> {
  const adminClient = await createAdminClient()

  const { error } = await adminClient
    .from('student_enrollments')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/siswa')
  return { success: true }
}

// Bulk enroll
export async function bulkEnrollStudents(
  studentIds: string[],
  academicYearId: string,
  semester: number,
  classId: string
): Promise<{ success: boolean; created: number; failed: number }> {
  const adminClient = await createAdminClient()

  let created = 0
  let failed = 0

  for (const studentId of studentIds) {
    const result = await createEnrollment({
      student_id: studentId,
      class_id: classId,
      academic_year_id: academicYearId,
      semester: semester as 1 | 2
    })

    if (result.success) {
      created++
    } else {
      failed++
    }
  }

  return { success: true, created, failed }
}

// Helper: Validate enrollment
async function validateEnrollment(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<{ valid: boolean; error?: string }> {
  const adminClient = await createAdminClient()

  const { data: existing } = await adminClient
    .from('student_enrollments')
    .select('id')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
    .single()

  if (existing) {
    return {
      valid: false,
      error: 'Student already enrolled for this period'
    }
  }

  return { valid: true }
}
```

---

## Implementation Checklist

### Phase 1: Auto-Enrollment (Week 1)
- [ ] Implement `getActiveAcademicYear()` helper
- [ ] Implement `autoEnrollStudent()` function
- [ ] Implement `getCurrentSemester()` helper
- [ ] Modify `createStudent` action to auto-enroll
- [ ] Modify `updateStudent` action to update enrollment
- [ ] Test auto-enrollment on student create
- [ ] Test enrollment update on class change

### Phase 2: Enrollment UI (Week 2)
- [ ] Create enrollment history page (`/siswa/[id]/enrollments`)
- [ ] Create EnrollmentModal component
- [ ] Add enrollment status badge to student list
- [ ] Add quick enroll button to student list
- [ ] Test UI flow: create, edit, delete enrollment

### Phase 3: Bulk Operations (Week 3)
- [ ] Implement `bulkEnrollStudents` action
- [ ] Implement `bulkGraduateStudents` action
- [ ] Create BulkEnrollModal component
- [ ] Add bulk actions to student list (checkbox selection)
- [ ] Test bulk enroll workflow
- [ ] Test bulk graduate workflow

### Phase 4: Data Sync (Week 3-4)
- [ ] Create migration for sync trigger
- [ ] Apply migration to database
- [ ] Test trigger: enrollment insert → students.class_id updates
- [ ] Test trigger: enrollment status change → students.class_id syncs
- [ ] Implement validation rules in server actions

### Phase 5: Admin Dashboard (Week 4)
- [ ] Create enrollment overview page (`/settings/enrollments`)
- [ ] Display enrollment statistics
- [ ] Show list of unenrolled students
- [ ] Implement year-end promotion workflow
- [ ] Test complete year-end flow (graduate → promote → new year)

---

## Testing Scenarios

### Manual Test Cases

**Test 1: Auto-Enrollment on Create**
1. Create new student dengan class_id
2. ✅ Verify enrollment record created in `student_enrollments`
3. ✅ Verify semester auto-detected correctly
4. ✅ Verify status = 'active'

**Test 2: Auto-Update on Class Change**
1. Update existing student's class
2. ✅ Verify enrollment updated to new class
3. ✅ Verify `students.class_id` synced

**Test 3: Bulk Enroll**
1. Select 10 students from Kelas 1
2. Bulk enroll to Kelas 2 for new year
3. ✅ Verify 10 enrollment records created
4. ✅ Verify no duplicates

**Test 4: Year-End Promotion**
1. Graduate all Kelas 6 students (semester 2)
2. Promote Kelas 1-5 to next class
3. ✅ Verify Kelas 6 status = 'graduated'
4. ✅ Verify Kelas 1-5 enrolled to next year

**Test 5: Historical Data**
1. View student with 3 years of history
2. ✅ Verify all enrollments displayed
3. ✅ Verify sorted by year DESC, semester DESC

---

## Success Metrics

- ✅ **100% auto-enrollment** for new students
- ✅ **<1% unenrolled students** at any time
- ✅ **Data consistency**: `students.class_id` always matches active enrollment
- ✅ **Historical accuracy**: Can generate rapot for any past year/semester
- ✅ **Bulk efficiency**: Promote 100 students in <30 seconds

---

## Dependencies

**Required before starting:**
- ✅ Phase 1 of Hafalan & Rapot plan (Academic Years system)
- ✅ Database migrations for `academic_years` and `student_enrollments`

**Optional enhancements:**
- Notification system (notify admin if students not enrolled)
- Import/export enrollment data (Excel)
- Enrollment audit log (track who enrolled/changed enrollment)

---

## Notes

- Auto-enrollment hanya berlaku untuk tahun ajaran AKTIF
- Jika tidak ada tahun ajaran aktif, auto-enrollment skip (log warning)
- Teacher tidak bisa edit enrollment, hanya Admin
- Semester auto-detection bisa di-override manual jika perlu
- Trigger sync `students.class_id` untuk maintain backward compatibility
