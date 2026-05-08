CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-07-sm-6au-laporan-materi-kumulatif.md

ISSUE: sm-6au / GH-#63
BRANCH: feat/sm-6au-laporan-materi-kumulatif

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 7)
2. Terapkan TDD: tulis test untuk Task 3 (server action kumulatif) sebelum implementasi
3. Jalankan type-check setelah setiap task: npm run type-check
4. Setelah semua task: npm run test:run (harus semua pass)
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

CATATAN ARSITEKTUR PENTING:
- Ada DUA laporanStore yang BERBEDA — jangan tertukar:
  - `src/app/(admin)/laporan/stores/laporanStore.ts` → Presensi tab (punya sharedMonth/sharedYear)
  - `src/stores/laporanStore.ts` → Materi tab (punya materiFilters)
- Semester diturunkan otomatis dari bulan: bulan >= 7 → Sem 1, bulan < 7 → Sem 2
- Semester 1 = bulan 7-12 (Juli-Desember), Semester 2 = bulan 1-6 (Januari-Juni)
- TrendChart sudah ada di `src/components/charts/TrendChart.tsx` — JANGAN buat ulang
- Ikuti pola wrapper `AttendanceTrendChart.tsx` untuk buat `MateriTrendChart.tsx`
- `getMonthName` sudah ada di `src/app/(admin)/materi/types.ts`

LOGIC KUMULATIF (Task 3):
- Ambil semua material_monthly_targets untuk class + academic_year + semester
- Ambil semua student_material_progress untuk class + academic_year + semester (TANPA filter bulan)
- Untuk setiap bulan dari awal semester s.d. upToMonth:
  - target_count = materi UNIK yang ditargetkan dari bulan pertama s.d. bulan ini (kumulatif)
  - tuntas_count = dari target_count tersebut, berapa yang sudah tuntas (nilai >= 70 ATAU hafal = true)
  - percentage = tuntas_count / target_count * 100
- Tuntas = nilai >= 70 OR hafal = true (sama dengan logika existing di materiQueries.ts)

REFERENCE FILES:
- Plan: @docs/plans/2026-05-07-sm-6au-laporan-materi-kumulatif.md
- Rules: @CLAUDE.md
- materiQueries (existing): @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- useMateriReportData: @src/app/(admin)/laporan/hooks/useMateriReportData.ts
- TrendChart (reuse): @src/components/charts/TrendChart.tsx
- AttendanceTrendChart (pola wrapper): @src/app/(admin)/laporan/components/AttendanceTrendChart.tsx
- useMateriDashboard: @src/app/(admin)/dashboard/hooks/useMateriDashboard.ts
- OverviewTab: @src/app/(admin)/laporan/components/OverviewTab.tsx
- materiStore: @src/app/(admin)/materi/stores/materiStore.ts
- monitoring/page.tsx: @src/app/(admin)/monitoring/page.tsx
- laporan/page.tsx: @src/app/(admin)/laporan/page.tsx

Mulai dari Task 1.
