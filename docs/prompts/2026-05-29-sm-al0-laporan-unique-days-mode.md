CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-29-sm-al0-laporan-unique-days-mode.md

ISSUE: sm-al0 / GH-#77
BRANCH: feat/sm-al0-laporan-unique-days-mode

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-29-sm-al0-laporan-unique-days-mode.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- OverviewTab: @src/app/(admin)/laporan/components/OverviewTab.tsx
- DashboardStore: @src/app/(admin)/dashboard/stores/dashboardStore.ts
- Logic: @src/app/(admin)/dashboard/actions/monitoring/logic.ts
- Monitoring action: @src/app/(admin)/dashboard/actions/monitoring/actions.ts
- Types: @src/types/dashboard.ts
- UserUtils: @src/lib/userUtils.ts
- AccessControl: @src/lib/accessControl.ts

Mulai dari Task 1.
