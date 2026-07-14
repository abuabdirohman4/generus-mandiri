CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-mf8-student-detail-tab-layout.md

ISSUE: sm-mf8 / GH-#58
BRANCH: feat/sm-mf8-student-detail-tab-layout

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3 → 4 → 5 → 6 → 7)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-mf8-student-detail-tab-layout.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Root page (konten pindah ke presensi): @src/app/(admin)/users/siswa/[studentId]/page.tsx
- Layout: @src/app/(admin)/users/siswa/[studentId]/layout.tsx
- Biodata (referensi pattern): @src/app/(admin)/users/siswa/[studentId]/biodata/page.tsx
- useStudentDetail hook: @src/app/(admin)/users/siswa/[studentId]/hooks/useStudentDetail.ts
- StudentsTable (update links): @src/app/(admin)/users/siswa/components/StudentsTable.tsx
- Laporan DataTable (update links): @src/app/(admin)/laporan/components/DataTable.tsx

Mulai dari Task 1.
