# Plan: Filter Kategori Kelas di Laporan OverviewTab

**Date**: 2026-05-29  
**Beads ID**: sm-xm5  
**GH Issue**: #76 — https://github.com/abuabdirohman4/generus-mandiri/issues/76  
**Branch**: `feat/sm-xm5-laporan-filter-kategori`

---

## Context

OverviewTab di `/laporan` menampilkan data kehadiran dan pencapaian materi per kelas/kelompok/desa/daerah. Saat ini tidak ada cara untuk memfilter data berdasarkan "jenis" kelas — misalnya melihat hanya data Caberawit (Kelas Paud–6) atau hanya Muda Mudi (SMP–Pra Nikah).

User ingin filter "Kategori" dengan 3 pilihan:
- **Caberawit** → DB categories: `PAUD`, `CABERAWIT`
- **Muda Mudi** → DB categories: `PRA_REMAJA`, `REMAJA`, `PRA_NIKAH`
- **Orang Tua** → DB categories: `ORANG_TUA`, `LANSIA`

Filter ini berlaku di semua `comparisonLevel` (class, kelompok, desa, daerah). Saat kategori dipilih, data langsung difilter — tidak perlu pilih kelas satu per satu.

---

## Approach

### DB: Tambah kolom `group_name` ke table `categories`

Tidak hapus/ubah data existing (sudah dipakai banyak tempat). Cukup tambah kolom `group_name` nullable untuk mapping ke super-kategori.

```sql
ALTER TABLE categories ADD COLUMN group_name TEXT;
UPDATE categories SET group_name = 'caberawit' WHERE code IN ('PAUD', 'CABERAWIT');
UPDATE categories SET group_name = 'muda_mudi' WHERE code IN ('PRA_REMAJA', 'REMAJA', 'PRA_NIKAH');
UPDATE categories SET group_name = 'orang_tua' WHERE code IN ('ORANG_TUA', 'LANSIA');
```

### Frontend: Filter kategori di OverviewTab (bukan DataFilter)

Filter kategori **tidak** dimasukkan ke `DataFilter` karena hanya relevan di OverviewTab laporan. DataFilter hanya untuk filter yang dipakai 2+ halaman.

Filter ditambahkan langsung di OverviewTab — simple radio/select di bawah LaporanTimeFilter.

### State: `categoryGroup` di `dashboardStore`

Tambah field `categoryGroup?: 'caberawit' | 'muda_mudi' | 'orang_tua'` ke `DashboardFilters`.

### Data flow

1. User pilih kategori → `categoryGroup` di store diupdate
2. `categoryGroup` masuk ke `monitoringCacheKey` dan `monitoringFetcher`
3. Server action `getClassMonitoring` terima param `categoryGroup`
4. Query filter classes berdasarkan `categories.group_name`

---

## Files to Modify

| File | Perubahan |
|------|-----------|
| `src/app/(admin)/dashboard/stores/dashboardStore.ts` | Tambah `categoryGroup` ke `DashboardFilters` dan `defaultFilters` |
| `src/app/(admin)/laporan/components/OverviewTab.tsx` | Tambah UI filter kategori + pass ke fetcher |
| `src/app/(admin)/dashboard/actions/monitoring/actions.ts` | Terima `categoryGroup` di `ClassMonitoringFilters`, filter query |
| `src/types/dashboard.ts` | Update `ClassMonitoringFilters` type |
| DB migration (via MCP) | Tambah `group_name` ke `categories` |

---

## Tasks

### Task 0: DB Migration

Jalankan via Supabase MCP:
```sql
ALTER TABLE categories ADD COLUMN IF NOT EXISTS group_name TEXT;
UPDATE categories SET group_name = 'caberawit' WHERE code IN ('PAUD', 'CABERAWIT');
UPDATE categories SET group_name = 'muda_mudi' WHERE code IN ('PRA_REMAJA', 'REMAJA', 'PRA_NIKAH');
UPDATE categories SET group_name = 'orang_tua' WHERE code IN ('ORANG_TUA', 'LANSIA');
```

Verifikasi:
```sql
SELECT code, name, group_name FROM categories ORDER BY group_name, name;
```

Expected: 7 rows, 5 dengan group_name terisi, 2 null (LANSIA punya group_name='orang_tua').

---

### Task 1: Update Types

**File**: `src/types/dashboard.ts`

Cari `ClassMonitoringFilters` interface, tambah field:
```typescript
categoryGroup?: 'caberawit' | 'muda_mudi' | 'orang_tua'
```

**File**: `src/app/(admin)/dashboard/stores/dashboardStore.ts`

1. Tambah ke `DashboardFilters` interface (setelah `comparisonLevel`):
```typescript
categoryGroup?: 'caberawit' | 'muda_mudi' | 'orang_tua'
```

2. `defaultFilters` — tidak perlu tambah (undefined = semua kategori).

3. `partialize` — tambah `categoryGroup: state.filters.categoryGroup` agar persist.

**TDD**: Tidak wajib untuk type/config changes. Lanjut ke Task 2.

---

### Task 2: Update Server Action

**File**: `src/app/(admin)/dashboard/actions/monitoring/actions.ts`

Cari fungsi `getClassMonitoring`. Di bagian query classes (sebelum fetch meetings), tambah filter `group_name`:

```typescript
// Setelah existing class filters, tambah:
if (filters.categoryGroup) {
  // Join path: classes → class_master_mappings → class_masters → categories
  // Gunakan subquery atau filter via class IDs
  const { data: categoryClasses } = await adminClient
    .from('class_master_mappings')
    .select('class_id, class_masters!inner(category:categories!inner(group_name))')
    .eq('class_masters.category.group_name', filters.categoryGroup)
  
  const categoryClassIds = categoryClasses?.map(c => c.class_id) ?? []
  // Intersect dengan classIds yang sudah ada, atau replace jika belum ada filter kelas
  classIds = classIds.length > 0 
    ? classIds.filter(id => categoryClassIds.includes(id))
    : categoryClassIds
}
```

> **Note**: Cek exact query structure di file — mungkin sudah ada `classIds` variable yang bisa di-intersect. Sesuaikan dengan pattern existing.

**TDD**:
- Test file: `src/app/(admin)/dashboard/actions/monitoring/__tests__/logic.test.ts` (jika ada) atau buat baru
- Test: `categoryGroup='caberawit'` → hanya kelas dengan `group_name='caberawit'` yang masuk
- Test: `categoryGroup=undefined` → semua kelas

---

### Task 3: UI Filter di OverviewTab

**File**: `src/app/(admin)/laporan/components/OverviewTab.tsx`

#### 3a. Baca `categoryGroup` dari store dan tambah handler

```typescript
const categoryGroup = filters.categoryGroup
const handleCategoryGroupChange = (group: 'caberawit' | 'muda_mudi' | 'orang_tua' | undefined) => 
  setFilter('categoryGroup', group)
```

#### 3b. Tambah ke `monitoringCacheKey`

Di `useMemo` untuk `monitoringCacheKey`, tambah:
```typescript
categoryGroup: debouncedFiltersForKey.categoryGroup || '',
```

#### 3c. Tambah ke `monitoringFetcher`

Di call `getClassMonitoring(...)`, tambah:
```typescript
categoryGroup: filters.categoryGroup,
```

#### 3d. Tambah UI

Di bawah `<LaporanTimeFilter .../>` (setelah baris ~293), tambah radio group filter kategori:

```tsx
{/* Filter Kategori */}
<div className="flex flex-wrap gap-2 mt-3">
  {[
    { value: undefined, label: 'Semua' },
    { value: 'caberawit', label: 'Caberawit' },
    { value: 'muda_mudi', label: 'Muda Mudi' },
    { value: 'orang_tua', label: 'Orang Tua' },
  ].map(opt => (
    <button
      key={opt.label}
      onClick={() => handleCategoryGroupChange(opt.value as any)}
      className={cn(
        'px-3 py-1 rounded-full text-sm border transition-colors',
        categoryGroup === opt.value
          ? 'bg-blue-600 text-white border-blue-600'
          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400'
      )}
    >
      {opt.label}
    </button>
  ))}
</div>
```

#### 3e. Update `materiFilters` (jika `comparisonLevel='class'`)

Materi dashboard juga perlu difilter — tambah `categoryGroup` ke `materiFilters` object dan update `useMateriDashboard` hook jika mendukung filter ini. Jika tidak, skip dulu (materi filter bisa di-issue terpisah).

---

### Task 4: Verifikasi Manual

1. Buka `/laporan` → tab Overview
2. Pilih filter org (misal 1 kelompok)
3. Klik "Caberawit" → tabel hanya tampilkan Kelas Paud, Kelas 1–6
4. Klik "Muda Mudi" → tabel hanya tampilkan SMP, SMA, Pra Nikah
5. Klik "Orang Tua" → tabel hanya tampilkan Orang Tua, Lansia
6. Klik "Semua" → semua kelas tampil kembali
7. Ganti `comparisonLevel` ke kelompok/desa/daerah → filter kategori masih berfungsi (agregasi hanya untuk kelas dari kategori itu)
8. Refresh halaman → filter kategori persist (dari localStorage)

---

## Commit Message Template

```
feat(laporan): add category group filter to OverviewTab

- Add group_name column to categories table (caberawit/muda_mudi/orang_tua)
- Add categoryGroup filter to DashboardFilters store
- Filter class monitoring data by category group in server action
- Add pill-style category filter UI to OverviewTab

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
  - Filter yang di-embed langsung di Tab (bukan DataFilter) — tidak perlu dokumen baru, tapi catat jika pola ini dipakai lagi
- [ ] Apakah ada tabel database baru? Tidak — hanya tambah kolom ke `categories`
- [ ] Apakah ada route/page baru? Tidak
- [ ] Apakah ada permission pattern baru? Tidak
- [ ] Update `CLAUDE.md` Key Tables: tambah `categories` ke daftar (saat ini belum ada)
