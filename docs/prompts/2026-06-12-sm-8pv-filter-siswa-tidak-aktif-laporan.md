CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-12-sm-8pv-filter-siswa-tidak-aktif-laporan.md

ISSUE: sm-8pv / GH-#105
BRANCH: fix/sm-8pv-filter-siswa-tidak-aktif-laporan

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-12-sm-8pv-filter-siswa-tidak-aktif-laporan.md
- Rules: @CLAUDE.md
- Queries: @src/app/(admin)/laporan/actions/reports/queries.ts
- Logic: @src/app/(admin)/laporan/actions/reports/logic.ts
- Tests: @src/app/(admin)/laporan/actions/reports/__tests__/logic.test.ts

Mulai dari Task 1.
