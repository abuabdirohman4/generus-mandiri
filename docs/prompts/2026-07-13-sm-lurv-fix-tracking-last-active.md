CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-13-sm-lurv-fix-tracking-last-active.md

ISSUE: sm-lurv / GH-#139
BRANCH: fix/sm-lurv-tracking-last-active

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Task 1 (migration): jalankan via MCP mcp__generus-mandiri-v2__apply_migration
3. Verifikasi migration via MCP mcp__generus-mandiri-v2__execute_sql sebelum lanjut Task 2
4. Task 2 (actions.ts): edit langsung, tidak perlu TDD (data plumbing, tidak ada logic baru)
5. Setelah selesai: npm run type-check (harus pass)
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-13-sm-lurv-fix-tracking-last-active.md
- Target: @src/app/(admin)/tracking/actions.ts
- Rules: @CLAUDE.md

Mulai dari Task 1.
