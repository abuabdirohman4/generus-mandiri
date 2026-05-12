CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-12-sm-3ka-laporan-materi-card-vs-chart-mismatch.md

ISSUE: sm-3ka / GH-#74
BRANCH: fix/sm-3ka-laporan-materi-card-chart-mismatch

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-12-sm-3ka-laporan-materi-card-vs-chart-mismatch.md
- Rules: @CLAUDE.md
- Query file (target): @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- Chart function (reference untuk konsistensi): getMateriCumulativeProgress() dan getMateriMonthlyChart() di file yang sama

BUG SUMMARY:
- Tab Kumulatif: card 35% tapi chart 40% → card pakai progress yang di-fetch dengan filter sempit (materialItemIds.includes()), chart fetch semua semester progress lalu iterate materialItemIds
- Tab Bulanan: card 62% tapi chart 71% → card rata-rata per-materi, chart rata-rata per-siswa

FIX TARGET (satu blok di fetchMateriReport(), line 188–205):
- Cumulative: fetch allProgress tanpa filter material, iterate materialItemIds dari allProgress
- Monthly: ganti avg per-materi ke avg per-siswa (loop per studentId)

Mulai dari Task 1.
