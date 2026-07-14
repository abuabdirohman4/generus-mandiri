CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-11-sm-560-laporan-materi-kalkulasi-fix.md

ISSUE: sm-560 / GH-#72
STATUS: Bug fix — 3 bug kalkulasi persentase dan total materi di laporan tab Materi (v2, setelah investigasi mendalam)

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 2 → Task 3)
2. Jalankan test setelah setiap task: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-11-sm-560-laporan-materi-kalkulasi-fix.md
- Rules: @CLAUDE.md
- Fix target 1: @src/app/(admin)/laporan/actions/reports/materiQueries.ts (line 195 — total_materials)
- Fix target 2: @src/app/(admin)/laporan/actions/reports/materiQueries.ts (line 412-424 — getMateriCumulativeProgress per_materi)
- Fix target 3: @src/app/(admin)/dashboard/actions/materiMonitoring.ts (line 94-99 — students.status filter)

Mulai dari Task 1.
