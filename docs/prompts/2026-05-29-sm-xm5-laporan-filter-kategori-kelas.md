CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-29-sm-xm5-laporan-filter-kategori-kelas.md

ISSUE: sm-xm5 / GH-#76
BRANCH: feat/sm-xm5-laporan-filter-kategori

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Task 0 (DB migration) — jalankan via Supabase MCP tool sebelum code changes
3. Terapkan TDD ketat: RED → GREEN → REFACTOR (Task 1-3)
4. Jalankan test setelah setiap task: npm run test:run
5. Jangan lanjut jika ada test FAIL
6. Setelah semua task: npm run type-check
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-29-sm-xm5-laporan-filter-kategori-kelas.md
- Rules: @CLAUDE.md
- OverviewTab: @src/app/(admin)/laporan/components/OverviewTab.tsx
- DashboardStore: @src/app/(admin)/dashboard/stores/dashboardStore.ts
- Monitoring action: @src/app/(admin)/dashboard/actions/monitoring/actions.ts
- Types: @src/types/dashboard.ts
- Architecture: @docs/claude/architecture-patterns.md

Mulai dari Task 0 (DB migration via MCP).
