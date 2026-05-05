CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-34q-laporan-materi-per-siswa-view.md

ISSUE: sm-34q / GH-#54
BRANCH: feat/sm-34q-laporan-materi-per-siswa

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3 → 4 → 5 → 6)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-34q-laporan-materi-per-siswa-view.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Laporan page: @src/app/(admin)/laporan/page.tsx
- MateriFilterSection: @src/app/(admin)/laporan/components/MateriFilterSection.tsx
- materiQueries: @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- MateriDataTable: @src/app/(admin)/laporan/components/MateriDataTable.tsx

Mulai dari Task 1.
