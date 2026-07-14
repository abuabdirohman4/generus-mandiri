CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-24w-laporan-overview-tab.md

ISSUE: sm-24w / GH-#59
BRANCH: feat/sm-24w-laporan-overview-tab

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 5)
2. Terapkan TDD untuk Task 2 (canAccessOverview): RED → GREEN → REFACTOR
3. Jalankan `npm run test:run` setelah Task 2 untuk verifikasi PASS
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: `npm run type-check` harus PASS
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-24w-laporan-overview-tab.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Store laporan: @src/stores/laporanStore.ts
- Access control: @src/lib/accessControl.ts
- Tab header: @src/app/(admin)/laporan/components/LaporanTabHeader.tsx
- Laporan page: @src/app/(admin)/laporan/page.tsx
- Dashboard page (referensi copy): @src/app/(admin)/dashboard/page.tsx
- Dashboard store (direuse): @src/app/(admin)/dashboard/stores/dashboardStore.ts

PENTING — Komponen Dashboard diimport via absolute path, TIDAK dipindah:
- `@/app/(admin)/dashboard/components/StatCard`
- `@/app/(admin)/dashboard/components/PeriodTabs`
- `@/app/(admin)/dashboard/components/ClassMonitoringTable`
- `@/app/(admin)/dashboard/actions` (getClassMonitoring)
- `@/app/(admin)/dashboard/stores/dashboardStore` (useDashboardStore)

Mulai dari Task 1.
