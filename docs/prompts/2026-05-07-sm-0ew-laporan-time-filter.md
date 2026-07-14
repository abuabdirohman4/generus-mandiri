CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-07-sm-0ew-laporan-time-filter.md

ISSUE: sm-0ew / GH-#62
BRANCH: feat/sm-0ew-laporan-time-filter

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Jalankan type-check setelah setiap task: npm run type-check
3. Jangan lanjut jika ada type error
4. Setelah semua task: npm run test:run (harus semua pass)
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

CATATAN PENTING:
- Ada DUA file laporanStore yang BERBEDA — jangan tertukar:
  - `src/app/(admin)/laporan/stores/laporanStore.ts` → untuk Presensi tab (DIUBAH di Task 1)
  - `src/stores/laporanStore.ts` → untuk Materi tab (TIDAK DIUBAH)
- Task 5 (MateriFilterSection) baca dari `src/stores/laporanStore.ts` yang TIDAK berubah
- Semester diturunkan dari bulan: bulan >= 7 → Semester 1, bulan < 7 → Semester 2
- Tahun ajaran diturunkan: bulan >= 7 → start_year = tahun sekarang, bulan < 7 → start_year = tahun - 1

REFERENCE FILES:
- Plan: @docs/plans/2026-05-07-sm-0ew-laporan-time-filter.md
- Rules: @CLAUDE.md
- laporan store (Presensi): @src/app/(admin)/laporan/stores/laporanStore.ts
- laporan store (Materi): @src/stores/laporanStore.ts
- OverviewTab: @src/app/(admin)/laporan/components/OverviewTab.tsx
- MateriFilterSection: @src/app/(admin)/laporan/components/MateriFilterSection.tsx
- laporan/page.tsx: @src/app/(admin)/laporan/page.tsx

Mulai dari Task 1.
