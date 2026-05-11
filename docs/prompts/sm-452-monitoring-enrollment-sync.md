CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-11-sm-452-monitoring-enrollment-sync.md

ISSUE: sm-452 / GH-#70
STATUS: Bug fix — siswa inactive muncul di monitoring (code fix saja, data migration sudah selesai via MCP)

REQUIREMENTS:
1. Ikuti plan Task 1 saja (Task 2 sudah selesai)
2. Jalankan test setelah task: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-11-sm-452-monitoring-enrollment-sync.md
- Rules: @CLAUDE.md
- Fix target: @src/app/(admin)/monitoring/actions/monitoring.ts (line 119-127 dan 476-482)

Mulai dari Task 1.
