CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-10-sm-mf8-skeleton-consistency.md

ISSUE: sm-mf8 / GH-#58
STATUS: Plan A — standardisasi skeleton + cache biodata

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3)
2. Jalankan test setelah setiap task: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-10-sm-mf8-skeleton-consistency.md
- Rules: @CLAUDE.md
- Biodata page (ganti ke SWR + fix skeleton): @src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx
- Presensi page (ganti skeleton): @src/app/(admin)/users/siswa/[studentId]/presensi/page.tsx
- IkhtisarView (standardisasi warna skeleton): @src/app/(admin)/users/siswa/[studentId]/components/IkhtisarView.tsx
- StudentDetailSkeleton (referensi — TIDAK dihapus): @src/components/ui/skeleton/StudentDetailSkeleton.tsx
- MateriView (referensi skeleton yang sudah benar): @src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx
- getStudentBiodata action: @src/app/(admin)/users/siswa/actions/students/actions.ts

Mulai dari Task 1.
