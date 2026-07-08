# sm-drfu: Fix daftar siswa terpotong 1000 row (Supabase default limit)

## Masalah

Halaman `/users/siswa` tidak menampilkan semua siswa untuk org dengan siswa >1000. Contoh: org "Bandung Selatan 2" punya 1774 siswa aktif, tapi UI cuma nampilin 1000 total. Siswa baru (nama "tes 1"/"tes 2") tidak muncul walau data valid di DB (relasi `student_classes`, `student_enrollments` lengkap, RLS lolos).

## Root Cause

`getAllStudents()` di `src/app/(admin)/users/siswa/actions/students/actions.ts` punya 3 branch:

1. **Teacher dengan `teacher_classes`** — pakai `fetchStudentsByIds` (by id list, tidak kena limit karena `.in()` bukan default select).
2. **Teacher hierarchical (Guru Desa/Daerah)** — SUDAH benar, pakai batching `while(hasMore)` + `.range(page*1000, (page+1)*1000-1)` (~line 320-an di `actions.ts`).
3. **Non-teacher (admin/superadmin)** — panggil `fetchAllStudents(supabase, classId)` di `queries.ts`, TIDAK ada batching. Kena Supabase PostgREST default limit 1000 row per query.

Karena admin daerah (`bansel2_admin`) masuk branch 3, dan `.order('name')` alfabetis, siswa yang urutan namanya jatuh di luar 1000 pertama (termasuk "tes 1"/"tes 2") hilang dari hasil fetch — bukan RLS, bukan cache, murni row limit.

## Fix

Terapkan pola batching yang sama (dari branch 2) ke branch 3:

**File: `src/app/(admin)/users/siswa/actions/students/queries.ts`**
- Ubah `fetchAllStudents()` untuk loop `.range()` per 1000 row sampai `hasMore = false`, gabungkan hasilnya, baru return.
- Pertahankan filter `classId` (query by `student_classes` junction) yang sudah ada di awal fungsi.

**File: `src/app/(admin)/users/siswa/actions/students/actions.ts`**
- Non-teacher branch (pemanggil `fetchAllStudents`) tidak perlu berubah kalau batching dipindah ke `queries.ts` — cukup pastikan return value tetap `{ data, error }` shape yang sama.

## Acceptance Criteria

- Org dengan siswa >1000 menampilkan SEMUA siswa di tabel `/users/siswa`, bukan cuma 1000 pertama.
- Total count di `StatsCards` match count aktual DB (`SELECT count(*) FROM students WHERE deleted_at IS NULL AND daerah_id = ...`).
- Filter `classId` (dari `DataFilter` kelas) tetap berfungsi normal setelah batching.
- Tidak regresi di jalur teacher (branch 1 & 2 tidak disentuh).

## Test Plan

- Unit test `queries.ts`: mock Supabase client return >1000 row via multiple `.range()` calls, assert semua row ke-collect.
- Manual/E2E: login sebagai `bansel2_admin`, cek total siswa di `/users/siswa` = 1774 (match DB), cari "tes 1"/"tes 2" via search box → harus muncul.

## Related

- Ditemukan saat cleanup 2 siswa data cacat testing (sudah dihapus dari DB sebelumnya, sesi ini).
- Pola batching referensi: `actions.ts` teacher-hierarchical branch, `PAGE_SIZE = 1000`.
