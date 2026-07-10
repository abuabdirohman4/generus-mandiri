CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-10-sm-5jzd-laporan-egress-cut.md

ISSUE: sm-5jzd / GH-#134
BRANCH: perf/sm-5jzd-laporan-egress-cut

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 RPC migration → Task 6 tests)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Parity mutlak: report /laporan HARUS render angka/tabel/trend chart identik. Jangan ubah chunk size attendance_logs (3) — itu guard 1000-row truncate.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-10-sm-5jzd-laporan-egress-cut.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Egress rules: @docs/claude/egress-cost-optimization.md
- Target files: src/app/(admin)/laporan/actions/reports/{queries,logic,actions}.ts
- Batch util (JANGAN diubah): src/lib/utils/batchFetching.ts

Mulai dari Task 1.
