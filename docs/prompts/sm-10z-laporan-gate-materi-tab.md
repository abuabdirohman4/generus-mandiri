CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-10z-laporan-gate-materi-tab.md

ISSUE: sm-10z / GH-#53
BRANCH: feat/sm-10z-granular-teacher-permissions

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-10z-laporan-gate-materi-tab.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Types: @src/types/user.ts
- Access control (client): @src/lib/accessControl.ts
- Access control (server): @src/lib/accessControlServer.ts
- SettingsModal: @src/app/(admin)/users/guru/components/SettingsModal.tsx
- Settings actions: @src/app/(admin)/users/guru/actions/settings/actions.ts
- Settings queries: @src/app/(admin)/users/guru/actions/settings/queries.ts
- QuickActions: @src/app/(admin)/home/components/QuickActions.tsx
- AppSidebar: @src/components/layouts/AppSidebar.tsx
- Laporan page: @src/app/(admin)/laporan/page.tsx

Mulai dari Task 1.
