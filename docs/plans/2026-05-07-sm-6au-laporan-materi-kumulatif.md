# Plan: Laporan Materi — Kumulatif + Grafik Trend + Auto Semester

**Issue:** sm-6au
**Date:** 2026-05-07
**Branch:** `feat/sm-6au-laporan-materi-kumulatif`

---

## Context

Laporan Materi saat ini hanya menampilkan snapshot per bulan: "dari 7 materi bulan ini, siswa tuntas berapa?" Angka ini naik-turun setiap bulan karena tiap bulan ada target berbeda — tidak mencerminkan progress nyata sepanjang semester.

Yang dibutuhkan: laporan **kumulatif** (akumulasi dari awal semester s.d. bulan yang dipilih) + toggle "Bulan Ini" saja. Dilengkapi grafik trend seperti Tab Presensi. Filter bulan tetap sync via `sharedMonth`/`sharedYear`.

Selain itu: halaman Materi dan Monitoring saat ini hardcode semester (null atau 1) — perlu otomatis ke semester+bulan sekarang.

---

## Keputusan Desain

| Topik | Keputusan |
|-------|-----------|
| Mode laporan | **Kumulatif + Bulan Ini** (toggle, seperti Presensi punya toggle Umum/Detail) |
| Scope filter | **Per kelas** (tetap seperti sekarang) — multi-kelas sudah ada di Tab Semua |
| Grafik | **Line + Bar** — reuse `TrendChart` yang sudah ada via wrapper `MateriTrendChart` |
| Tab Semua (kolom materi) | **Kumulatif s.d. bulan yang dipilih** — bukan snapshot bulan ini |
| Filter bulan | **Tetap sync** via `sharedMonth`/`sharedYear` di semua tab |
| Semester | Diturunkan otomatis: bulan ≥ 7 → Sem 1, bulan < 7 → Sem 2 |

---

## File yang Diubah

### Task 0 — Git commit message untuk perubahan yang sudah ada

Perubahan staged saat ini (10 files — sm-0ew):
```
feat: standarisasi filter waktu Laporan dengan LaporanTimeFilter

- Tambah sharedMonth/sharedYear/setSharedTime ke laporan/stores/laporanStore.ts
- Buat LaporanTimeFilter (headless React.Fragment, 2 InputFilter: Bulan+Tahun)
- Pasang LaporanTimeFilter di FilterSection dan MateriFilterSection dalam grid
- Update OverviewTab: hide PeriodTabs, baca sharedMonth/sharedYear dari laporanStore
- Sync materiFilters.month/semester/academicYearId dari sharedMonth di laporan/page.tsx
- Update useLaporanPage untuk expose sharedMonth/sharedYear/setSharedTime

fixes #62

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

### Task 1 — Auto semester+bulan di halaman Materi

**File:** `src/app/(admin)/materi/stores/materiStore.ts`

**Masalah:** `selectedSemester: null`, `selectedMonth: null` — tidak ada default.

**Fix:** Ganti default dengan fungsi dinamis (sama persis dengan pola di `laporan/stores/laporanStore.ts`):

```typescript
const getCurrentMonth = () => new Date().getMonth() + 1  // 1-12
const getCurrentSemester = (): 1 | 2 => getCurrentMonth() >= 7 ? 1 : 2

const defaultFilters: MateriFilters = {
  selectedSemester: getCurrentSemester(),
  selectedMonth: getCurrentMonth(),
  // ... rest unchanged
}
```

**PENTING:** Di `partialize` (persist middleware), jangan reset ke `null` lagi — biarkan semester/month ikut di-persist:
```typescript
// Hapus baris ini dari partialize:
// selectedSemester: null,
// selectedMonth: null,
```

**Verify:** Buka halaman Materi → semester dan bulan sudah terisi sesuai tanggal sekarang.

---

### Task 2 — Auto semester+bulan di halaman Monitoring

**File:** `src/app/(admin)/monitoring/page.tsx`

**Masalah:** `useState<1 | 2>(1)` hardcode Semester 1. `selectedMonth` mulai `null`.

**Fix:** Ubah inisialisasi state:

```typescript
// Sebelum (baris 74):
const [selectedSemester, setSelectedSemester] = useState<1 | 2>(1)

// Sesudah:
const getCurrentSemester = (): 1 | 2 => new Date().getMonth() + 1 >= 7 ? 1 : 2
const [selectedSemester, setSelectedSemester] = useState<1 | 2>(getCurrentSemester)

// Sebelum (baris 101):
const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

// Sesudah:
const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth() + 1)
```

**Verify:** Buka halaman Monitoring di bulan Mei → Semester 2, Bulan Mei sudah terisi otomatis.

---

### Task 3 — Tambah server action: kumulatif progress per bulan

**File:** `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

Tambah fungsi baru `getMateriCumulativeProgress`:

```typescript
export interface MateriMonthlyPoint {
  month: number          // 1-12
  month_label: string    // "Jul", "Agu", dst
  target_count: number   // jumlah materi yang ditargetkan s.d. bulan ini
  tuntas_count: number   // jumlah siswa×materi yang tuntas s.d. bulan ini
  percentage: number     // tuntas / (total_students × target) * 100
}

export async function getMateriCumulativeProgress(params: {
  classId: string
  academicYearId: string
  semester: 1 | 2
  upToMonth: number      // hitung s.d. bulan ini
}): Promise<MateriMonthlyPoint[]>
```

**Logic:**
1. Ambil semua `material_monthly_targets` untuk class + academic_year + semester
2. Group by bulan → tahu target tiap bulan
3. Ambil semua `student_material_progress` untuk class + academic_year + semester (tanpa filter bulan)
4. Untuk setiap bulan dari awal semester s.d. `upToMonth`:
   - `target_count` = jumlah materi unik yang ditargetkan dari bulan pertama s.d. bulan ini
   - `tuntas_count` = dari target_count tersebut, berapa yang sudah tuntas (nilai ≥ 70 atau hafal = true)
   - `percentage` = tuntas_count / target_count * 100
5. Return array urut per bulan

**Semester month range:**
- Semester 1: bulan 7–12 (Juli–Desember)
- Semester 2: bulan 1–6 (Januari–Juni)

---

### Task 4 — Tambah mode toggle di `useMateriReportData`

**File:** `src/app/(admin)/laporan/hooks/useMateriReportData.ts`

Tambah parameter `reportMode`:

```typescript
interface UseMateriReportDataOptions {
  filters: MateriReportFilters
  enabled?: boolean
  viewMode?: 'per_materi' | 'per_siswa'
  reportMode?: 'monthly' | 'cumulative'  // NEW
}
```

Ketika `reportMode === 'cumulative'`:
- Panggil `getMateriCumulativeProgress` untuk data grafik trend
- Panggil query existing tapi tanpa filter bulan (untuk summary kumulatif s.d. bulan ini)

Ketika `reportMode === 'monthly'` (default, behavior sekarang):
- Behavior tidak berubah — query dengan filter bulan seperti sekarang

Return tambahan:
```typescript
{
  data: MateriReportData,
  trendData: MateriMonthlyPoint[],  // NEW — untuk grafik
  isLoading,
  // ...
}
```

---

### Task 5 — Buat `MateriTrendChart` component

**File:** `src/app/(admin)/laporan/components/MateriTrendChart.tsx` *(baru)*

Wrapper tipis mirip `AttendanceTrendChart.tsx`. Transform `MateriMonthlyPoint[]` ke format `TrendChart`:

```typescript
import TrendChart from '@/components/charts/TrendChart'
import type { MateriMonthlyPoint } from '../actions/reports/materiQueries'

interface MateriTrendChartProps {
  data: MateriMonthlyPoint[]
  isLoading: boolean
  semester: 1 | 2
}

export default function MateriTrendChart({ data, isLoading, semester }: MateriTrendChartProps) {
  const transformedData = data.map(point => ({
    date: String(point.month),
    fullDate: `${getMonthName(point.month)} (${point.tuntas_count}/${point.target_count} materi tuntas)`,
    percentage: point.percentage,
    details: {
      target: point.target_count,
      tuntas: point.tuntas_count,
    }
  }))

  return (
    <TrendChart
      data={transformedData}
      isLoading={isLoading}
      title="Trend Pencapaian Materi"
      emptyMessage="Pilih kelas untuk melihat trend pencapaian"
    />
  )
}
```

---

### Task 6 — Tambah toggle mode + grafik di `laporan/page.tsx` Tab Materi

**File:** `src/app/(admin)/laporan/page.tsx`

Tambah state `materiReportMode`:
```typescript
const [materiReportMode, setMateriReportMode] = useState<'monthly' | 'cumulative'>('cumulative')
```

Di JSX Tab Materi, tambah toggle dan grafik:
```tsx
{/* Toggle mode */}
<div className="flex gap-2 mb-4">
  <button onClick={() => setMateriReportMode('cumulative')} ...>Kumulatif</button>
  <button onClick={() => setMateriReportMode('monthly')} ...>Bulan Ini</button>
</div>

{/* Grafik trend — hanya tampil di mode kumulatif */}
{materiReportMode === 'cumulative' && (
  <MateriTrendChart
    data={trendData}
    isLoading={isLoadingMateri}
    semester={activeSemester}
  />
)}

{/* Stats + Tabel tetap ada di kedua mode */}
<MateriStatsCards data={materiData} isLoading={isLoadingMateri} />
<MateriDataTable ... />
```

---

### Task 7 — Update `useMateriDashboard` di Tab Semua: kumulatif s.d. bulan + card materi

**File:** `src/app/(admin)/dashboard/hooks/useMateriDashboard.ts`

Saat ini fetch materi monitoring tanpa filter bulan (per semester penuh). Update agar menerima `upToMonth` parameter dan meneruskannya ke query, sehingga kolom "Pencapaian Materi" di `ClassMonitoringTable` menampilkan kumulatif s.d. `sharedMonth`.

Di `OverviewTab.tsx`, sudah ada `materiSemester` — tinggal pass `upToMonth={sharedMonth}` ke `useMateriDashboard`.

**Tambah card Pencapaian Materi di Tab Semua:**

Di `OverviewTab.tsx`, tambah card ringkasan materi di sebelah card Kehadiran. Hitung average dari semua kelas yang dikembalikan `useMateriDashboard`:

```typescript
const materiAverage = useMemo(() => {
  if (!materiDashboardData || materiDashboardData.length === 0) return 0
  const total = materiDashboardData.reduce((sum, cls) => sum + (cls.completion_rate ?? 0), 0)
  return Math.round(total / materiDashboardData.length)
}, [materiDashboardData])
```

Render card tambahan (hanya saat `hasMateriAccess && comparisonLevel === 'class'`):
```tsx
<StatCard
  title="Pencapaian Materi"
  value={materiLoading ? <Skeleton /> : `${materiAverage}%`}
  icon="📚"
  color="blue"
  tooltip={`Rata-rata kumulatif pencapaian materi s.d. ${getMonthName(sharedMonth)} dari ${materiDashboardData.length} kelas`}
/>
```

Logika sama persis dengan card Kehadiran — simple average dari semua entitas (kelas).

---

## File yang TIDAK Diubah

| File | Alasan |
|------|--------|
| `TrendChart.tsx` | Sudah ada, cukup dibungkus via wrapper |
| `MateriStatsCards.tsx` | Tidak berubah, data dari hook yang diupdate |
| `MateriDataTable.tsx` | Tidak berubah |
| `ClassMonitoringTable.tsx` | Tidak berubah — data dari useMateriDashboard yang diupdate |
| `DataFilter.tsx` | Tidak diubah |

---

## Urutan Eksekusi

1. Task 0: Commit perubahan sm-0ew yang sudah ada
2. Task 1: Auto semester+bulan di halaman Materi
3. Task 2: Auto semester+bulan di halaman Monitoring
4. Task 3: Server action kumulatif progress
5. Task 4: Update useMateriReportData (tambah reportMode + trendData)
6. Task 5: Buat MateriTrendChart
7. Task 6: Toggle + grafik di laporan/page.tsx
8. Task 7: Update useMateriDashboard untuk kumulatif s.d. bulan
9. `npm run type-check` → 0 error
10. `npm run test:run` → semua pass

---

## Verifikasi

- Halaman Materi: buka → semester dan bulan sudah terisi (bukan kosong)
- Halaman Monitoring: buka → semester sesuai bulan sekarang (bukan hardcode Sem 1)
- Tab Materi Laporan:
  - Default ke mode Kumulatif
  - Grafik trend tampil (line + bar toggle)
  - Toggle ke "Bulan Ini" → grafik hilang, tabel/kartu hanya data bulan itu
  - Ganti bulan di LaporanTimeFilter → semua ikut update
- Tab Semua: kolom Pencapaian Materi berubah saat ganti bulan (kumulatif s.d. bulan)

---

## CLAUDE.md Check
- [ ] Pattern baru: `MateriTrendChart` wrapper — dokumentasikan di `architecture-patterns.md`
- [ ] `reportMode` parameter di `useMateriReportData` — dokumentasikan di architecture-patterns
- [ ] Tabel database baru? → Tidak
- [ ] Route/page baru? → Tidak
- [ ] Update `docs/claude/architecture-patterns.md` setelah implementasi selesai
