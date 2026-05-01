# Plan: Remove `semester` Column from `student_enrollments`

> ⚠️ **RAPOT-RELATED** — Jangan dikerjakan sebelum desain fitur rapot selesai.
> Issue ini dibuat sebagai catatan keputusan desain, bukan untuk dikerjakan segera.

## Context

Kolom `semester` di `student_enrollments` menambah kompleksitas tanpa manfaat nyata di level enrollment:
- Siswa tidak pindah kelas tiap semester — mereka naik kelas tiap **tahun ajaran**
- Unique constraint saat ini: `(student_id, academic_year_id, semester)` → memungkinkan 2 row per siswa per tahun
- Akibat: `autoEnrollStudent()` deteksi bulan untuk tentukan semester → 5 siswa ter-enroll di semester 2 (Mei 2026) padahal masih semester 1
- Satu-satunya consumer `semester` dari enrollment adalah rapot queries — dan ini bisa dihandle di tabel rapot sendiri

**Goal**: Simplify enrollment → 1 row per siswa per tahun ajaran.
Schema baru: `UNIQUE(student_id, academic_year_id)`

---

## Prerequisites (selesaikan dulu sebelum mulai task ini)

- [ ] Desain fitur rapot sudah final
- [ ] Konfirmasi rapot tidak butuh `semester` dari `student_enrollments`
- [ ] Semua data `semester=2` dibersihkan atau dimigrasikan

---

## Impact Analysis

### Files yang perlu diupdate

| File | Perubahan |
|------|-----------|
| DB migration | DROP COLUMN semester + ubah unique constraint |
| `src/app/(admin)/tahun-ajaran/actions/enrollments.ts` | Hapus `semester` dari `enrollStudent()`, `getClassEnrollments()`, `bulkEnrollStudents()` |
| `src/app/(admin)/users/siswa/actions/students/actions.ts` | Hapus `semester` + `getCurrentSemester()` dari `autoEnrollStudent()` |
| `src/app/(admin)/rapot/actions/queries.ts` | Update `fetchStudentEnrollment()` — hapus filter semester |
| `src/app/(admin)/monitoring/actions/monitoring.ts` | Hapus semester dari log message |

### Tables yang terpengaruh

- `student_enrollments` — hapus kolom `semester`, ubah unique constraint
- Semua kode yang upsert ke tabel ini dengan `onConflict: 'student_id,academic_year_id,semester'`

---

## Task 1 — Data Cleanup (sebelum migration)

```sql
-- Lihat data semester=2 yang ada
SELECT student_id, class_id, semester, enrollment_date
FROM student_enrollments WHERE semester = 2;

-- Hapus duplikat: untuk siswa yang punya semester=1 DAN semester=2,
-- hapus yang semester=2 (keep semester=1 sebagai canonical)
DELETE FROM student_enrollments se
WHERE semester = 2
AND EXISTS (
  SELECT 1 FROM student_enrollments se2
  WHERE se2.student_id = se.student_id
    AND se2.academic_year_id = se.academic_year_id
    AND se2.semester = 1
);

-- Untuk siswa yang hanya punya semester=2 (dibuat di bulan Jan-Jun),
-- update semester ke 1
UPDATE student_enrollments
SET semester = 1
WHERE semester = 2;
```

---

## Task 2 — DB Migration

```sql
-- Drop existing unique constraint
ALTER TABLE student_enrollments
DROP CONSTRAINT IF EXISTS student_enrollments_student_year_semester_key;

-- Drop semester column
ALTER TABLE student_enrollments DROP COLUMN semester;

-- Add new unique constraint (tanpa semester)
ALTER TABLE student_enrollments
ADD CONSTRAINT student_enrollments_student_year_key
UNIQUE (student_id, academic_year_id);
```

---

## Task 3 — Update `enrollments.ts`

**File**: `src/app/(admin)/tahun-ajaran/actions/enrollments.ts`

- `enrollStudent()`: hapus `semester` dari insert data
- `getClassEnrollments()`: hapus `.eq('semester', semester)` filter + hapus param
- `bulkEnrollStudents()`: hapus `semester` dari upsert data + ubah `onConflict`

---

## Task 4 — Update `students/actions.ts`

**File**: `src/app/(admin)/users/siswa/actions/students/actions.ts`

- Hapus fungsi `getCurrentSemester()`
- Update `autoEnrollStudent()`: hapus `semester` dari upsert + ubah `onConflict` ke `'student_id,academic_year_id'`

---

## Task 5 — Update `rapot/actions/queries.ts`

**File**: `src/app/(admin)/rapot/actions/queries.ts`

- `fetchStudentEnrollment()`: hapus `.eq('semester', semester)` filter + update signature

---

## Task 6 — Type-check & Test

```bash
npm run type-check
npm run test:run
```

---

## Verification

```sql
-- Pastikan constraint baru ada
SELECT conname FROM pg_constraint
WHERE conrelid = 'student_enrollments'::regclass;
-- Expected: student_enrollments_student_year_key (tanpa semester)

-- Pastikan 1 row per siswa per tahun
SELECT student_id, academic_year_id, COUNT(*)
FROM student_enrollments
GROUP BY student_id, academic_year_id
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

---

## CLAUDE.md Check
- [ ] Update `docs/claude/business-rules.md` — hapus mention `semester` dari student_enrollments
- [ ] Update `CLAUDE.md` Key Tables — student_enrollments tidak lagi punya semester
- [ ] Update `autoEnrollStudent()` docs

## Commit Message Template
```
refactor(rapot): remove semester column from student_enrollments

- Simplify enrollment to 1 row per student per academic year
- Remove UNIQUE(student_id, academic_year_id, semester) → UNIQUE(student_id, academic_year_id)
- Remove getCurrentSemester() helper (no longer needed)
- Update all queries that previously filtered by semester

Enrollment tracks class assignment per year, not per semester.
Semester tracking belongs in rapot tables, not enrollment.

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
