# Plan: 4 Bug Fixes — Afiyatna Issues
Date: 2026-07-16
Issues: sm-22pt · sm-1c80 · sm-29q5 · sm-w7ge

---

## Context

4 bug laporan dari user Afiyatna, semua di area siswa dan laporan.

---

## Issue sm-22pt — Filter siswa tidak aktif di AssignStudentsModal

### Root Cause
`fetchAllStudents()` di `students/queries.ts` sudah filter `.is('deleted_at', null)` tapi **tidak filter by `status`**. Siswa graduated/inactive (status != 'active') tetap muncul di modal assign.

`getAllStudents()` → `fetchAllStudents()` — tidak ada status param.

### Files
- `src/app/(admin)/users/siswa/actions/students/queries.ts` — `fetchAllStudents()`, tambah status filter

### Fix

**`queries.ts` line ~40 di `fetchAllStudents()`:**
```typescript
let query = supabase
  .from('students')
  .select(STUDENT_SELECT)
  .is('deleted_at', null)
  .or('status.eq.active,status.is.null')  // ← TAMBAH INI
  .order('name')
```

### No test needed (egress query change, covered by manual testing)

---

## Issue sm-1c80 — Siswa multi-kelas hanya tampil 1 kelas di tabel siswa

### Root Cause
`fetchStudentsPaginated()` pakai `NARROW_SELECT` yang tidak include `student_classes` join. `StudentsTable.tsx` → `getDisplayClasses()` hanya lookup `student.class_id` (primary class).

### Files
1. `src/app/(admin)/users/siswa/actions/students/queries.ts` — `NARROW_SELECT`, tambah `student_classes`
2. `src/types/student.ts` — `PaginatedStudentRow`, tambah `student_classes` field
3. `src/app/(admin)/users/siswa/components/StudentsTable.tsx` — `getDisplayClasses()`, pakai semua kelas

### Fix

**Step 1: `queries.ts` — Update NARROW_SELECT**
```typescript
const NARROW_SELECT = `
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
  deleted_at,
  student_classes(
    classes:class_id(id, name)
  ),
  daerah:daerah_id(name),
  desa:desa_id(name),
  kelompok:kelompok_id(name)
`
```

**Step 2: `src/types/student.ts` — Update PaginatedStudentRow**
```typescript
export interface PaginatedStudentRow {
  id: string
  name: string
  gender: string | null
  class_id: string | null
  kelompok_id: string | null
  desa_id: string | null
  daerah_id: string | null
  status: string
  created_at: string
  updated_at: string
  deleted_at?: string | null
  daerah_name?: string
  desa_name?: string
  kelompok_name?: string
  // TAMBAH:
  student_classes?: Array<{ classes: { id: string; name: string } | null }>
}
```

**Step 3: `StudentsTable.tsx` — Update getDisplayClasses()**
```typescript
const getDisplayClasses = (student: PaginatedStudentRow): string => {
  try {
    if (!student || typeof student !== 'object') return '-'

    // Multi-class: use student_classes junction if available
    if (student.student_classes && student.student_classes.length > 0) {
      const names = student.student_classes
        .map(sc => sc.classes?.name)
        .filter(Boolean)
      if (names.length > 0) return names.join(', ')
    }

    // Fallback: primary class_id
    if (!student.class_id) return '-'
    const cls = classesData?.find(c => c.id === student.class_id)
    return cls ? cls.name : '-'
  } catch (e) {
    console.error('Error formatting classes for student:', student?.id, e)
    return '-'
  }
}
```

### ⚠️ Egress consideration
`NARROW_SELECT` dipakai di `fetchStudentsPaginated` — paginated (max 50 rows per page). `student_classes` join menambah ~2 relasi per siswa. Volume kecil, aman.

---

## Issue sm-29q5 — Sort kelas per sort_order di laporan OverviewTab

### Root Cause
`OverviewTab.tsx` saat `comparisonLevel === 'class'`:
- Data dari `monitoringData` (ClassMonitoringData) punya `class_name` tapi **tidak ada `sort_order`**
- Chart/tabel render kelas dalam urutan arbitrary (object key insertion order)

### Investigation needed first
Perlu cek: apakah `ClassMonitoringData` sudah punya field `sort_order` atau `class_master_sort_order`?

```bash
grep -r "ClassMonitoringData" src/types/ src/app/\(admin\)/dashboard/
grep -r "sort_order" src/app/\(admin\)/dashboard/actions.ts
```

### Files
1. `src/app/(admin)/dashboard/actions.ts` (or RPC) — tambah `sort_order` ke monitoring data
2. `src/types/dashboard.ts` — `ClassMonitoringData`, tambah `sort_order` field
3. `src/app/(admin)/laporan/components/OverviewTab.tsx` — sort entities by sort_order sebelum render

### Fix (setelah konfirmasi struktur data)

**Pattern umum:**
Di tempat `attendanceMetrics` useMemo aggregate kelas (baris ~220):
```typescript
// Setelah group by class_name, sort result by sort_order
const sortedEntities = Object.entries(grouped).sort(([keyA], [keyB]) => {
  const sortA = classSortOrders.get(keyA) ?? 999
  const sortB = classSortOrders.get(keyB) ?? 999
  return sortA - sortB
})
```

Di `ClassMonitoringTable` atau chart component — pastikan data dikirim dalam urutan sort_order.

### ⚠️ Perlu investigasi dulu
Jalankan grep sebelum implement untuk konfirmasi apakah `sort_order` sudah ada di data atau perlu ditambah ke query dashboard.

---

## Issue sm-w7ge — History pertemuan tidak lengkap di halaman siswa

### Root Cause (perlu konfirmasi)
Di `getStudentAttendanceHistory()`:
```typescript
// Role-based filter
if (profile.role === 'teacher' && profile.teacher_classes && profile.teacher_classes.length > 0) {
  const teacherClassIds = ...
  filteredLogs = filteredLogs.filter(log => {
    const meeting = log.meetings
    if (meeting.class_id && teacherClassIds.includes(meeting.class_id)) return true
    if (meeting.class_ids && ...) return true
    return false
  })
}
```

Kemungkinan:
1. **Teacher filter terlalu ketat** — pertemuan dari kelas siswa yang bukan kelas guru ter-filter out
2. **`meetings!inner` join** — exclude attendance_logs yang meetingnya tidak match criteria
3. **class_ids array** — meeting multi-kelas (SAMBUNG) filter tidak match class_id siswa

### Investigation steps
1. Cek apakah user yang report issue adalah guru atau admin
2. Cek meeting yang missing — apakah pakai class_id atau class_ids?
3. Lihat `fetchStudentAttendanceHistory` query — `meetings!inner` berarti harus ada meeting yang match

### Fix depends on root cause
- Jika teacher filter: relax condition — guru boleh lihat semua meeting dari kelas siswa, bukan hanya kelasnya sendiri (karena ini halaman siswa bukan laporan kelas)
- Jika class_ids array issue: fix filter untuk check `student.class_id` terhadap `meeting.class_ids`

**Kemungkinan fix untuk teacher filter:**
```typescript
// Untuk halaman siswa (bukan laporan): guru boleh lihat semua meeting kelas siswa
// Filter teacher hanya untuk keamanan (guru tidak bisa lihat siswa lain)
// Tapi meeting dari kelas siswa harusnya semua muncul
// → Remove/relax teacher class filter di getStudentAttendanceHistory
```

### ⚠️ Perlu konfirmasi dari user: role apa yang pakai? Pertemuan apa yang hilang?

---

## Execution Order

1. sm-22pt (paling simpel, 1 baris) — **Task 1**
2. sm-1c80 (3 files, tapi mechanical) — **Task 2**  
3. sm-29q5 (butuh investigasi sort_order) — **Task 3**
4. sm-w7ge (butuh investigasi + konfirmasi user) — **Task 4** (deferred)

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
- [ ] Apakah ada tabel database baru yang perlu ditambahkan ke Key Tables?
- [ ] Apakah ada route/page baru yang perlu ditambahkan ke App Router Structure?
- [ ] Apakah ada permission pattern baru yang perlu didokumentasikan?
- [ ] Jika ada yang perlu diupdate → update `CLAUDE.md` atau file di `docs/claude/` setelah implementasi selesai
