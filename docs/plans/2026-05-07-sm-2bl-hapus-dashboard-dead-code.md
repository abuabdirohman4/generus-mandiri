# Plan: Hapus dashboard/page.tsx dan File Dead Code Terkait

**Issue:** sm-2bl  
**Date:** 2026-05-07  
**Branch:** `task/sm-2bl-hapus-dashboard-dead-code`

---

## Context

Tab "Overview" di `/laporan` sudah sepenuhnya menggantikan `/dashboard`. Route `/dashboard` sudah di-disable dari navigasi (dicomment di `AppSidebar.tsx`, tidak ada di `BottomNavigation.tsx`). File-file berikut hanya dipakai oleh `dashboard/page.tsx` yang sudah tidak aktif — mempertahankan mereka menyebabkan AI salah update file lama saat melakukan perubahan materi/monitoring.

---

## File yang Dihapus

### Task 1 — Hapus `dashboard/page.tsx`

**File:** `src/app/(admin)/dashboard/page.tsx`

Hapus file ini. Semua fungsionalitasnya sudah ada di `OverviewTab` (`src/app/(admin)/laporan/components/OverviewTab.tsx`).

```bash
rm src/app/(admin)/dashboard/page.tsx
```

**Verify:** `npm run type-check` tidak ada error baru.

---

### Task 2 — Hapus `MateriMonitoringCard`

**Files:**
- `src/app/(admin)/dashboard/components/MateriMonitoringCard.tsx`
- `src/app/(admin)/dashboard/components/__tests__/MateriMonitoringCard.test.tsx`

OverviewTab mengintegrasikan data materi langsung ke `ClassMonitoringTable` via prop `materiData` — `MateriMonitoringCard` tidak lagi dipakai di mana pun.

```bash
rm src/app/(admin)/dashboard/components/MateriMonitoringCard.tsx
rm src/app/(admin)/dashboard/components/__tests__/MateriMonitoringCard.test.tsx
```

**Verify:** `grep -r "MateriMonitoringCard" src/` → tidak ada hasil.

---

### Task 3 — Hapus `DashboardSkeleton`

**File:** `src/components/ui/skeleton/DashboardSkeleton.tsx`

Hanya dipakai oleh `dashboard/page.tsx`. OverviewTab tidak menggunakannya.

```bash
rm src/components/ui/skeleton/DashboardSkeleton.tsx
```

**Verify:** `grep -r "DashboardSkeleton" src/` → tidak ada hasil.

---

### Task 4 — Verifikasi Final

```bash
npm run type-check
```
Expected output: no errors.

```bash
npm run test:run
```
Expected: semua test pass (tidak ada import rusak).

---

## File yang TIDAK Diubah

| File | Alasan |
|------|--------|
| `dashboard/stores/dashboardStore.ts` | Dipakai OverviewTab, home, UserDropdown |
| `dashboard/hooks/useMateriDashboard.ts` | Dipakai OverviewTab |
| `dashboard/actions/*` | Dipakai OverviewTab (`getClassMonitoring`, dll) |
| `dashboard/components/StatCard.tsx` | Dipakai OverviewTab |
| `dashboard/components/PeriodTabs.tsx` | Dipakai OverviewTab |
| `dashboard/components/ClassMonitoringTable.tsx` | Dipakai OverviewTab |
| `dashboard/components/ComparisonChart.tsx` | Dipakai ClassMonitoringTable |
| `src/components/shared/AcademicYearSelector.tsx` | Dipakai modul `rapot` |
| `dashboard/hooks/__tests__/useMateriDashboard.test.tsx` | Test untuk hook yang masih dipakai |

---

## Commit Message Template

```
task: hapus dashboard/page.tsx dan file dead code terkait

- Hapus dashboard/page.tsx (digantikan OverviewTab di /laporan)
- Hapus MateriMonitoringCard dan test-nya (diintegrasikan ke ClassMonitoringTable)
- Hapus DashboardSkeleton (hanya dipakai dashboard/page.tsx)

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? → Tidak
- [ ] Apakah ada tabel database baru? → Tidak
- [ ] Apakah ada route/page baru? → Tidak (route dihapus)
- [ ] Update `docs/claude/architecture-patterns.md` → Hapus referensi ke `dashboard/page.tsx` di section "Dashboard Metrics Pattern" dan "Meeting Count Deduplication" (baris 223 dan 246 — ganti dengan referensi ke `OverviewTab`)
