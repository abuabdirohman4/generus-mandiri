CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-20-sm-3fdy-handleapierror-swallows-root-cause.md

ISSUE: sm-3fdy / GH-#148
BRANCH: fix/sm-3fdy-preserve-error-cause

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-20-sm-3fdy-handleapierror-swallows-root-cause.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Helper: @src/lib/errorUtils.ts
- Call site: @src/app/(admin)/users/siswa/actions/students/actions.ts
- Sentry issue: https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-1F

Mulai dari Task 1.
