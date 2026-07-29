CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-29-sm-9fnc-usestudents-type.md

ISSUE: sm-9fnc / GH-#160
BRANCH: fix/sm-9fnc-usestudents-type

TUJUAN: `npm run type-check` gagal 13 error implicitly-any. Root cause di 1 file (useStudents useSWR tanpa generic). Fix 1 titik → sembuh 13.

REQUIREMENTS:
1. Ubah HANYA `src/hooks/useStudents.ts`: kasih generic `useSWR<Student[]>(...)`. `Student` sudah di-import di file itu.
2. JANGAN sentuh 3 file konsumer (CreateMeetingModal, AssignStudentsModal, QrCardsTab). Error hilang sendiri setelah type benar. JANGAN annotate `(c: any)` manual — itu tambal, bukan fix.
3. JANGAN ubah baris `(c: any)` yang SUDAH ada di kode existing — biarkan apa adanya.
4. Setelah: `npm run type-check` HARUS 0 error (dari 13 → 0). Ini satu-satunya acceptance.
5. Tidak ada TDD (perubahan type-only, bukan business logic).

REFERENCE FILES:
- Plan: @docs/plans/2026-07-29-sm-9fnc-usestudents-type.md
- File utama: @src/hooks/useStudents.ts
- Type: @src/types/student.ts (StudentWithClasses = Student, punya classes: Array<{id,name}>)
- Rules: @CLAUDE.md

CATATAN: perubahan sangat kecil (1 baris generic). Kalau setelah fix masih ada error implicitly-any tersisa, laporkan — mungkin ada konsumer lain yang tak lewat useStudents.

Mulai.
