CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-20-sm-x0ql-supabase-auth-lock-timeout.md

ISSUE: sm-x0ql / GH-#146
BRANCH: fix/sm-x0ql-auth-lock-timeout

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-20-sm-x0ql-supabase-auth-lock-timeout.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Target file: @src/lib/supabase/client.ts
- Sentry issue: https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-Y

Mulai dari Task 1.
