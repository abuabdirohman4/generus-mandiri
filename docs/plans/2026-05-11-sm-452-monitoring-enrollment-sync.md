# Plan: Fix Monitoring — Filter Siswa Inactive + Data Migration Enrollment Stale

## Context

Dua bug ditemukan di halaman monitoring:

1. **B1 — Siswa inactive muncul di monitoring** (10 siswa): `monitoring.ts` hanya filter `enrollment.status = 'active'` tapi tidak filter `students.status = 'active'`. Mahveen (inactive) masih tampil di monitoring.

2. **B2 — 72 siswa stale enrollment** (data lama): `enrollment.class_id` tidak match `students.class_id`. Penyebab: data di-assign/import sebelum `autoEnrollStudent` ditambahkan ke `updateStudent` flow. **Data migration sudah dieksekusi langsung via MCP** — `remaining_stale = 0`. Tidak perlu dikerjakan Antigravity.

---

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/app/(admin)/monitoring/actions/monitoring.ts` | B1: tambah filter `students.status='active'` di 2 fungsi |

---

## TASK 1 — B1: Filter siswa inactive di monitoring.ts

### File: `src/app/(admin)/monitoring/actions/monitoring.ts`

Ada 2 fungsi yang perlu diupdate.

#### Fungsi 1: `getClassProgress` (line 119-127)

**SEBELUM:**
```ts
const { data: enrollments, error: enrollError } = await supabase
    .from('student_enrollments')
    .select(`
      student_id,
      students!inner(id, name)
    `)
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'active');
```

**SESUDAH:**
```ts
const { data: enrollments, error: enrollError } = await supabase
    .from('student_enrollments')
    .select(`
      student_id,
      students!inner(id, name, status)
    `)
    .eq('class_id', classId)
    .eq('academic_year_id', academicYearId)
    .eq('status', 'active')
    .eq('students.status', 'active');
```

#### Fungsi 2: `getMonthlyProgressSummary` (line 476-482)

**SEBELUM:**
```ts
const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, students!inner(id, name)')
    .eq('class_id', params.classId)
    .eq('academic_year_id', params.academicYearId)
    .eq('status', 'active')
```

**SESUDAH:**
```ts
const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, students!inner(id, name, status)')
    .eq('class_id', params.classId)
    .eq('academic_year_id', params.academicYearId)
    .eq('status', 'active')
    .eq('students.status', 'active')
```

### Jalankan test

`npm run test:run` → PASS. `npm run type-check` → bersih.

---

## TASK 2 — B2: Data Migration (SUDAH SELESAI via MCP)

Data migration sudah dieksekusi langsung oleh Claude Code via MCP Supabase. Hasil verifikasi: `remaining_stale = 0`. Tidak ada action di sini.

SQL yang dijalankan:
```sql
UPDATE student_enrollments
SET class_id = s.class_id, updated_at = now()
FROM students s, academic_years ay
WHERE student_enrollments.student_id = s.id
  AND student_enrollments.academic_year_id = ay.id
  AND ay.is_active = true
  AND student_enrollments.status = 'active'
  AND s.deleted_at IS NULL
  AND s.class_id IS NOT NULL
  AND student_enrollments.class_id != s.class_id;
```

---

## Verification

- [ ] Mahveen (inactive) tidak muncul di monitoring
- [ ] Haisha dan siswa lain muncul di kelas yang benar di monitoring
- [ ] `npm run test:run` → pass
- [ ] `npm run type-check` → bersih

---

## Commit Message Template

```
fix(monitoring): filter siswa inactive + data migration enrollment class_id stale

- monitoring.ts: tambah filter students.status='active' di getClassProgress + getMonthlyProgressSummary
- DB: bulk UPDATE 72 enrollment records dengan class_id stale ke class_id terkini (via MCP, selesai)

fixes #70

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Tidak ada pattern/arsitektur baru
- [ ] Tidak ada tabel baru
- [ ] Data migration pattern: UPDATE via MCP execute_sql (one-time data fix, bukan migration file)
