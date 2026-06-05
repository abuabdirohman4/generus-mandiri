CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-05-sm-dv3-guru-desa-restricted-kelompok.md

ISSUE: sm-dv3 / GH-#82
BRANCH: feat/sm-dv3-guru-desa-restricted-kelompok

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 7)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (terutama Task 3)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

PENTING — Task 1 (DB Migration):
- Gunakan MCP tool mcp__generus-mandiri-v2__apply_migration untuk run SQL migration
- Verify dengan mcp__generus-mandiri-v2__list_tables setelah migration

REFERENCE FILES:
- Plan: @docs/plans/2026-06-05-sm-dv3-guru-desa-restricted-kelompok.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Reference junction pattern: @src/app/(admin)/users/guru/actions/teacher-class-masters/queries.ts
- Reference junction actions: @src/app/(admin)/users/guru/actions/teacher-class-masters/actions.ts
- GuruModal: @src/app/(admin)/users/guru/components/GuruModal.tsx
- Actions index: @src/app/(admin)/users/guru/actions/index.ts
- Laporan queries: @src/app/(admin)/laporan/actions/reports/queries.ts
- Laporan hook: @src/app/(admin)/laporan/hooks/useLaporanPage.ts

Mulai dari Task 1.
