# Prompt: Fix sm-drfu — siswa terpotong 1000 row

Plan: `docs/plans/2026-07-08-sm-drfu-fix-siswa-1000-row-limit.md`
Issue: sm-drfu / GH #130

## Task

Fix `fetchAllStudents()` di `src/app/(admin)/users/siswa/actions/students/queries.ts` supaya tidak kena Supabase PostgREST default limit 1000 row. Terapkan pola batching yang sudah dipakai di `src/app/(admin)/users/siswa/actions/students/actions.ts` (teacher-hierarchical branch, cari `PAGE_SIZE = 1000` dan `while (hasMore)`), pindahkan/replikasi pola itu ke `fetchAllStudents`.

Constraint:
- Jangan ubah signature `fetchAllStudents(supabase, classId?)` — caller di `actions.ts` (`getAllStudents`, non-teacher branch) tidak boleh berubah.
- Filter `classId` (query `student_classes` junction lalu `.in('id', studentIds)`) yang sudah ada harus tetap jalan SETELAH batching diterapkan pada select utama.
- Tulis unit test TDD: mock Supabase client return >1000 row lewat multiple `.range()` calls, assert semua row ke-collect di hasil akhir.

Ikuti TDD: RED (test gagal dulu) → GREEN → REFACTOR.
