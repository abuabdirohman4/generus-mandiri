# Plan: LaporanTimeFilter — Standarisasi Filter Waktu di Halaman Laporan

**Issue:** sm-0ew
**Date:** 2026-05-07
**Branch:** `feat/sm-???-laporan-time-filter`

---

## Context

Halaman Laporan punya 3 tab (Presensi, Materi, Semua/Overview) dengan filter waktu yang inkonsisten:
- **Presensi:** Bulan + Tahun (sudah pakai format ini di `laporan/stores/laporanStore.ts`)
- **Materi:** Tahun Ajaran + Semester + Bulan (manual, terpisah)
- **Semua:** PeriodTabs (Bulan Ini / Minggu Ini / Hari Ini) + month picker

Tujuan: semua tab pakai **Bulan + Tahun** yang sama. Semester dan Tahun Ajaran diturunkan otomatis dari Bulan+Tahun. PeriodTabs di-hide di OverviewTab — hanya tampil month picker (sudah ada di PeriodTabs saat mode 'month').

**Scope MINIMAL** — tidak menyentuh dua laporanStore yang berbeda. Store tetap terpisah.

---

## Arsitektur

```
laporan/page.tsx
  ├── LaporanTimeFilter (komponen baru) — Bulan + Tahun, state di laporan/stores/laporanStore.ts
  ├── DataFilter (org filter) — sudah ada
  ├── Tab Presensi → baca month+year dari laporanStore (sudah ada, tidak berubah)
  ├── Tab Materi → baca month+year dari laporanStore, turunkan semester otomatis
  └── Tab Semua (OverviewTab) → baca month+year dari laporanStore, hide PeriodTabs
```

**Cara turunkan semester dari bulan:**
```typescript
function getSemesterFromMonth(month: number): 1 | 2 {
  return month >= 7 ? 1 : 2  // Jul-Des = Sem 1, Jan-Jun = Sem 2
}
```

**Cara turunkan academicYearId dari bulan+tahun:**
- Bulan Jul-Des tahun N → tahun ajaran `N/N+1`
- Bulan Jan-Jun tahun N → tahun ajaran `N-1/N`
- Query `academic_years` dengan `start_year` yang sesuai

---

## File yang Diubah

### Task 1 — Tambah `selectedMonth` + `selectedYear` ke `laporan/stores/laporanStore.ts`

**File:** `src/app/(admin)/laporan/stores/laporanStore.ts`

Store ini sudah punya `month: number` dan `year: number` di `LaporanFilters`. Tambahkan **top-level shared fields** (di luar presensiFilters) agar bisa diakses semua tab:

```typescript
// Tambahkan ke interface LaporanState (atau store root):
sharedMonth: number   // 1-12, default: getCurrentMonth()
sharedYear: number    // e.g. 2026, default: getCurrentYear()
setSharedTime: (month: number, year: number) => void
```

Default: bulan + tahun saat ini.

---

### Task 2 — Buat `LaporanTimeFilter` component

**File:** `src/app/(admin)/laporan/components/LaporanTimeFilter.tsx` *(baru)*

Komponen kecil berisi 2 dropdown: Bulan + Tahun. Tidak ada external deps selain `InputFilter`.

```typescript
'use client'

import InputFilter from '@/components/form/input/InputFilter'

interface LaporanTimeFilterProps {
  month: number        // 1-12
  year: number         // e.g. 2026
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
}

const MONTHS = [
  { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
  { value: '3', label: 'Maret' },   { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },     { value: '6', label: 'Juni' },
  { value: '7', label: 'Juli' },    { value: '8', label: 'Agustus' },
  { value: '9', label: 'September'},{ value: '10', label: 'Oktober' },
  { value: '11', label: 'November'},{ value: '12', label: 'Desember' },
]

// Tahun: N-2 sampai N+1 dari tahun sekarang
function getYearOptions() {
  const current = new Date().getFullYear()
  return [current - 2, current - 1, current, current + 1].map(y => ({
    value: String(y), label: String(y)
  }))
}

export default function LaporanTimeFilter({ month, year, onMonthChange, onYearChange }: LaporanTimeFilterProps) {
  return (
    <div className="flex gap-3">
      <InputFilter
        id="laporanMonthFilter"
        label="Bulan"
        value={String(month)}
        onChange={(v) => onMonthChange(Number(v))}
        options={MONTHS}
        widthClassName="!max-w-full"
        compact
      />
      <InputFilter
        id="laporanYearFilter"
        label="Tahun"
        value={String(year)}
        onChange={(v) => onYearChange(Number(v))}
        options={getYearOptions()}
        widthClassName="!max-w-full"
        compact
      />
    </div>
  )
}
```

---

### Task 3 — Pasang `LaporanTimeFilter` di `laporan/page.tsx`

**File:** `src/app/(admin)/laporan/page.tsx`

Tambahkan `LaporanTimeFilter` di bawah `DataFilter` (sejajar, dalam card yang sama atau card terpisah kecil). Baca `sharedMonth` + `sharedYear` dari store, pass `setSharedTime` sebagai handler.

```tsx
import LaporanTimeFilter from './components/LaporanTimeFilter'

// Di dalam JSX, setelah DataFilter:
<LaporanTimeFilter
  month={sharedMonth}
  year={sharedYear}
  onMonthChange={(m) => setSharedTime(m, sharedYear)}
  onYearChange={(y) => setSharedTime(sharedMonth, y)}
/>
```

---

### Task 4 — Update `OverviewTab` — hide PeriodTabs, baca dari store

**File:** `src/app/(admin)/laporan/components/OverviewTab.tsx`

**Hapus:**
- State lokal `selectedDate`, `selectedWeekOffset` (tidak diperlukan lagi)
- State lokal `selectedMonth` → ganti dengan `sharedMonth` + `sharedYear` dari `useLaporanStore` (`laporan/stores/laporanStore.ts`)
- Render `<PeriodTabs>` → hide seluruhnya
- State `filters.period` tetap di-set ke `'month'` secara hardcode (tidak perlu user pilih)

**Tambah:**
- Import `useLaporanStore` dari `@/app/(admin)/laporan/stores/laporanStore`
- Baca `sharedMonth`, `sharedYear` dari store
- Bentuk `selectedMonth` string (`"YYYY-MM"`) dari keduanya untuk dikirim ke `getClassMonitoring`

**Semester untuk materi:**
```typescript
const materiSemester = useMemo((): 1 | 2 => {
  return sharedMonth >= 7 ? 1 : 2
}, [sharedMonth])
```

---

### Task 5 — Update `MateriFilterSection` — hapus Tahun Ajaran + Semester input, baca dari props

**File:** `src/app/(admin)/laporan/components/MateriFilterSection.tsx`

**Hapus dari UI:**
- Dropdown "Tahun Ajaran" (`academicYearId` input)
- Dropdown "Semester" (`semester` input)

**Tetap ada:**
- Dropdown Bulan → sekarang option-nya tidak bergantung semester lagi, tampilkan semua 12 bulan
- Org filters (Daerah, Desa, Kelompok, Kelas, Kategori) → tidak berubah

**Tambah props:**
```typescript
interface MateriFilterSectionProps {
  // ... existing
  activeAcademicYearId: string   // diturunkan dari parent
  activeSemester: 1 | 2          // diturunkan dari parent
}
```

Di `laporan/page.tsx`, hitung `activeAcademicYearId` dan `activeSemester` dari `sharedMonth` + `sharedYear`:
```typescript
// Di laporan/page.tsx:
const activeSemester: 1 | 2 = sharedMonth >= 7 ? 1 : 2
const activeStartYear = sharedMonth >= 7 ? sharedYear : sharedYear - 1
// Query academic_years where start_year = activeStartYear → dapat ID-nya
```

Untuk mendapat `academicYearId`, gunakan `getActiveAcademicYear()` atau query berdasarkan `start_year`. Simpan di state lokal `page.tsx` (bukan store).

---

## File yang TIDAK Diubah

| File | Alasan |
|------|--------|
| `laporan/stores/laporanStore.ts` (Presensi) | Hanya tambah `sharedMonth`/`sharedYear` di root |
| `stores/laporanStore.ts` (Materi) | Tidak diubah sama sekali |
| `DataFilter.tsx` | Tidak diubah |
| `PeriodTabs.tsx` | Tidak dihapus, hanya tidak dirender di OverviewTab |
| `FilterSection` (Presensi tab) | Tidak diubah |

---

## Urutan Eksekusi

1. Task 1: Tambah `sharedMonth`/`sharedYear` ke `laporan/stores/laporanStore.ts`
2. Task 2: Buat `LaporanTimeFilter.tsx`
3. Task 3: Pasang di `laporan/page.tsx`
4. Task 4: Update `OverviewTab` — hide PeriodTabs, baca dari store
5. Task 5: Update `MateriFilterSection` — hapus Tahun Ajaran + Semester dropdown
6. `npm run type-check` → 0 error
7. `npm run test:run` → semua pass

---

## Verifikasi

- Buka Tab Presensi → LaporanTimeFilter tampil, ganti bulan → data presensi update
- Buka Tab Materi → LaporanTimeFilter tampil (sama), ganti bulan → data materi update, Tahun Ajaran + Semester tidak ada lagi sebagai input
- Buka Tab Semua → LaporanTimeFilter tampil, PeriodTabs tidak ada, ganti bulan → monitoring update
- Ganti bulan di Tab Presensi → pindah ke Tab Materi → bulan sama (shared)

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU? → Ya: `LaporanTimeFilter` component baru di `laporan/components/`
- [ ] Tabel database baru? → Tidak
- [ ] Route/page baru? → Tidak
- [ ] Permission pattern baru? → Tidak
- [ ] Update `docs/claude/architecture-patterns.md` jika perlu setelah implementasi
