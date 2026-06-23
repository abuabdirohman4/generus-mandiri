# Plan — sm-nke7 — Grafik per-Desa/Kelompok per Pertemuan

**Issue:** sm-nke7 · feat: grafik per-desa/kelompok per pertemuan
**Type:** feature (P3)
**Date:** 2026-06-23

---

## 1. Goal

Pertemuan tingkat desa/daerah (multi-kelompok / multi-desa) butuh **breakdown kehadiran per desa/kelompok** di meeting detail. Tampil HANYA untuk meeting multi-desa/kelompok (bukan single-class). Reuse chart existing.

## 2. Reuse (explored)

| Need | Reuse | File |
|---|---|---|
| Chart komparasi | `ComparisonChart` | `src/app/(admin)/dashboard/components/ComparisonChart.tsx` |
| Agregasi per-org | `aggregateMonitoringData` | `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` |
| Meeting detail page | extend | `src/app/(admin)/presensi/[meetingId]/page.tsx` |

Data absensi sudah bawa `desa_id` / `kelompok_id` per siswa (per issue) → tinggal grup + agregat. **Meeting dedup pattern** (architecture-patterns §Meeting Count Deduplication) relevan kalau hitung antar-kelompok — verify tidak double-count.

## 3. Architecture decisions

- **Deteksi multi-scope**: meeting punya `class_ids` array lintas kelompok/desa → tampilkan breakdown. Single-class → sembunyikan (tidak relevan). Logic pure `shouldShowBreakdown(meeting)` + `isMultiDesa` / `isMultiKelompok`.
- **Agregasi**: dari `attendance_logs` + student org fields → grup per kelompok (dan per desa kalau multi-desa). Reuse/extend `aggregateMonitoringData` kalau shape cocok; kalau tidak, tulis `aggregateMeetingByOrg(logs)` pure baru (testable). Pakai Set untuk dedup meeting (lihat §Meeting Count Dedup).
- **UI**: section/komponen `MeetingOrgBreakdown.tsx` di bawah daftar presensi, render `ComparisonChart` (hadir vs total per kelompok/desa). Toggle desa↔kelompok kalau multi-desa.
- Scope-aware: data turun dari yang user boleh lihat (reuse guard meeting detail + hierarchical teacher pattern).

## 4. Tasks (TDD untuk agregasi/deteksi)

### Task 1 — Deteksi + agregasi logic (TDD)
- `logic.ts`: `shouldShowBreakdown(meeting)`, `aggregateMeetingByOrg(attendanceRows, level: 'kelompok'|'desa')` → `[{ name, present, total, rate }]` dengan dedup meeting.
- RED: test — single-class → false; multi-kelompok → grup benar; rate hitung benar; no double-count.
- GREEN. test:run PASS.

### Task 2 — Data fetch
- Pastikan query meeting detail bawa `kelompok_id`/`desa_id` per attendance row (mungkin sudah; kalau belum, extend select — hati-hati nested PostgREST, pakai batch/two-query bila perlu, lihat [[postgrest-in-url-overflow]]).

### Task 3 — Breakdown UI
- `MeetingOrgBreakdown.tsx`: render `ComparisonChart` dari hasil agregasi. Tampil kondisional `shouldShowBreakdown`. Toggle kelompok/desa untuk multi-desa.
- Integrasi ke `presensi/[meetingId]/page.tsx`.

### Task 4 — Verify
- type-check 0. test:run PASS.
- Manual: buka meeting Sambung Desa (multi-kelompok) → muncul grafik per kelompok dgn rate benar; buka meeting single-class → grafik tak muncul.

## 5. Out of scope
- Export grafik (PDF/gambar) — bisa nyambung ke sm-ix1 nanti.
- Drilldown per siswa dari chart.
- Single-class meeting (sengaja disembunyikan).

## 6. CLAUDE.md Check
- [ ] Reuse Meeting Count Deduplication pattern → konfirmasi konsisten (architecture-patterns.md).
- [ ] Tab/section baru (bukan route) → getPageTitle tak berubah.
- [ ] Kalau `aggregateMeetingByOrg` jadi util reusable → catat lokasi.

## 7. Commit message
```
feat(presensi): per-desa/kelompok attendance breakdown chart in meeting detail (fixes #XX)

Show ComparisonChart breakdown of attendance per kelompok (and per desa for
multi-desa meetings) on meeting detail, only for multi-scope meetings. Reuses
aggregation + chart from dashboard; dedups meeting counts.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
