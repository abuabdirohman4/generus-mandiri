CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-nke7-grafik-per-desa-kelompok.md

ISSUE: sm-nke7 / GH-#116
BRANCH: feat/sm-nke7-grafik-per-desa-kelompok

REQUIREMENTS:
1. Ikuti plan Task 1 → Task 4
2. TDD untuk deteksi + agregasi logic (shouldShowBreakdown, aggregateMeetingByOrg); skip UI
3. Reuse ComparisonChart + aggregateMonitoringData (dashboard). JANGAN bikin chart baru.
4. Dedup meeting count (lihat architecture-patterns §Meeting Count Deduplication) — jangan double-count multi-class.
5. Tampil HANYA untuk meeting multi-desa/kelompok; single-class sembunyikan.
6. Kalau perlu extend query bawa kelompok_id/desa_id: hati-hati nested PostgREST + .in() overflow (memory postgrest-in-url-overflow), pakai batch/two-query bila perlu.
7. npm run test:run PASS; npm run type-check 0.
8. Output per task: "✅ Task N complete: [ringkasan]"
9. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-nke7-grafik-per-desa-kelompok.md
- Rules: @CLAUDE.md
- Chart: @src/app/(admin)/dashboard/components/ComparisonChart.tsx
- Aggregation: @src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts
- Meeting dedup: @docs/claude/architecture-patterns.md (§Meeting Count Deduplication)
- Meeting detail page: @src/app/(admin)/presensi/[meetingId]/page.tsx

Mulai dari Task 1.
