CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-09-sm-69c-broadcast-notifikasi.md

ISSUE: sm-69c (GH belum ada — gh CLI belum terinstall saat planning)
BRANCH: feat/sm-69c-broadcast-notifikasi
WORKTREE: .worktrees/sm-69c/

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (unit tests)
3. Jalankan test setelah setiap task: npx vitest run src/ (JANGAN npm run test — scan worktree lain)
4. Jangan lanjut jika ada unit test FAIL
5. Setelah semua task: npm run type-check
6. E2E test WAJIB: tests/e2e/notifikasi.spec.ts (happy path multi-role + negatif scope)
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

SEQUENCE:
Task 1: DB Migration (via mcp__generus-mandiri-v2__apply_migration)
Task 2: Types → src/types/notification.ts
Task 3: SWR keys → update src/lib/swr.ts (tambah notificationKeys)
Task 4: logic.ts + unit tests (TDD: RED→GREEN)
Task 5: queries.ts + unit tests (TDD: RED→GREEN)
Task 6: actions.ts + actions/index.ts
Task 7: canSendNotification helper → src/lib/accessControl.ts
Task 8: Hook → src/hooks/useNotifications.ts
Task 9: UI — rewrite NotificationDropdown + enable di AppHeader
Task 10: UI — halaman /notifikasi/page.tsx + komponen KirimBroadcastForm
Task 11: UI — NotificationBanner (dismissable) + render di AdminLayout
Task 12: Navigasi — AppSidebar + QuickActions + getPageTitle
Task 13: E2E → tests/e2e/notifikasi.spec.ts
Task 14: CLAUDE.md check (Key Tables, App Router, architecture-patterns)

REFERENCE FILES:
- Plan: @docs/plans/2026-06-09-sm-69c-broadcast-notifikasi.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Testing (unit + E2E): @docs/claude/testing-guidelines.md
- Existing hook pattern: @src/hooks/usePromotionEnabled.ts
- Existing 3-layer pattern: @src/app/(admin)/naik-kelas/actions/classes/queries.ts
- Existing scope resolve: @src/app/(admin)/naik-kelas/actions/classes/queries.ts (resolveKelompokIdsInScope)
- Existing accessControl: @src/lib/accessControl.ts
- Existing NotificationDropdown (akan di-rewrite): @src/components/layouts/header/NotificationDropdown.tsx
- AppHeader (uncomment NotificationDropdown): @src/components/layouts/AppHeader.tsx
- AdminLayout (render banner): @src/app/(admin)/layout.tsx
- E2E helpers: @tests/e2e/helpers/auth.ts + @tests/MULTI_ROLE_TESTING.md

PENTING — jalankan test unit dengan:
  npx vitest run src/app/(admin)/notifikasi/
(bukan npm run test:run — itu scan semua worktree)

Mulai dari Task 1.
