# Plan: Fix type `useStudents` → hilangkan 13 error implicitly-any (sm-9fnc)

## Context

`npm run type-check` gagal dengan 13 error `TS7006` (Parameter implicitly has 'any' type) di 3 komponen. Ini **pre-existing** (sudah di master sebelum kerjaan Turbopack), ketahuan saat verifikasi. Memblokir sm-ac3l (verifikasi Turbopack butuh type-check bersih) + bikin `next build` produksi berisiko gagal.

**Root cause (satu titik):** `src/hooks/useStudents.ts` — `useSWR` (line 44) dipanggil **tanpa generic eksplisit**, dan `const students = Array.isArray(data) ? data : []` (line 61) menghasilkan `students: any[]`. Semua konsumer `useStudents()` lalu dapat `students` untyped → `student.classes.map(c => c.id)` bikin `c` implicitly any.

**3 konsumer terdampak** (semua ambil `students` dari `useStudents()`):
- `presensi/components/CreateMeetingModal.tsx` (8 error: baris 172,177,401,404,651,653,677,681)
- `users/siswa/components/AssignStudentsModal.tsx` (4 error: 91,137,144,484)
- `users/siswa/components/QrCardsTab.tsx` (1 error: 107)

**Fix di 1 tempat (`useStudents`) menyembuhkan semua 13** — root-cause fix, bukan tambal per-file.

`Student` = `StudentWithClasses` (dari `@/types/student`), punya `classes: Array<{ id: string; name: string }>`. Setelah `students` bertype `Student[]`, inference `c` benar otomatis, `c.id`/`c.name` valid tanpa annotate manual.

## Perubahan

### `src/hooks/useStudents.ts`

Beri generic eksplisit ke `useSWR` supaya `data` bertype `Student[] | undefined`:

```ts
const { data, error, isLoading, mutate } = useSWR<Student[]>(
  key,
  () => fetcher(classId),
  { ...opsi existing... }
)
```

`const students = Array.isArray(data) ? data : []` (line 61) tetap — dengan `data: Student[] | undefined`, hasilnya `students: Student[]`. Tak ada perubahan lain di file.

`Student` sudah di-import (line 7: `import { getAllStudents, getStudentsPaginated, type Student } from '@/app/(admin)/users/siswa/actions'`). Tak perlu ubah import.

## Yang TIDAK diubah
- 3 file konsumer (CreateMeetingModal, AssignStudentsModal, QrCardsTab) — TIDAK disentuh. Error hilang sendiri begitu `students` bertype benar. Jangan annotate `(c: any)` manual — itu tambal, bukan fix.

> Catatan: kode existing sudah punya sebagian `(c: any)` eksplisit di beberapa baris (mis. CreateMeetingModal:365,688) — biarkan apa adanya, jangan tambah/hapus. Fokus cuma `useStudents`.

## Verifikasi
1. `npm run type-check` → **0 error** (dari 13 → 0). Ini satu-satunya acceptance.
2. Runtime tak berubah (perubahan type-only) — smoke: buka `/presensi` (create meeting modal), `/users/siswa` (assign students, qr cards) tetap jalan normal.
