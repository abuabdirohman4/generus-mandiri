CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-20-sm-iywv-sentry-sourcemap-upload.md

ISSUE: sm-iywv / GH-#145
BRANCH: chore/sm-iywv-sentry-sourcemap

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-20-sm-iywv-sentry-sourcemap-upload.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Workflow: @.github/workflows/deploy.yml
- Workflow staging: @.github/workflows/deploy-staging.yml
- Sentry config: @next.config.ts

Mulai dari Task 1.
