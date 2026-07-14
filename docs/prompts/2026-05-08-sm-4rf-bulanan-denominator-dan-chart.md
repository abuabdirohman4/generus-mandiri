CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-08-sm-6au-bulanan-denominator-dan-chart.md

ISSUE: sm-4rf / GH-#65
BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan, branch yang sudah ada)

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3a → 3b → 3c → 3d → 3e)
2. Terapkan TDD: tulis test dulu jika ada logika baru, lalu implement
3. Jalankan npm run test:run setelah setiap task
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check → harus 0 error
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

VERIFIKASI AKHIR:
- Mode Bulanan, bulan Mei, Kelas 1:
  - Card "Total Materi" → 7 (bukan 24)
  - Tabel Per Siswa → X/7 (bukan X/24)
  - Chart bar 6 bulan tampil di atas tabel
- Mode Kumulatif tidak berubah (masih 24)

REFERENCE FILES:
- Plan: @docs/plans/2026-05-08-sm-6au-bulanan-denominator-dan-chart.md
- Rules: @CLAUDE.md
- materiQueries.ts: @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- materiActions.ts: @src/app/(admin)/laporan/actions/reports/materiActions.ts
- useMateriReportData.ts: @src/app/(admin)/laporan/hooks/useMateriReportData.ts
- MateriTrendChart.tsx: @src/app/(admin)/laporan/components/MateriTrendChart.tsx
- page.tsx: @src/app/(admin)/laporan/page.tsx
- TrendChart.tsx: @src/components/charts/TrendChart.tsx

Mulai dari Task 1.
