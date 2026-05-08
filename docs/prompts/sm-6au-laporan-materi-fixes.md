CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Fix 6 issues hasil review sm-6au di halaman Laporan (Tab Materi, Tab Semua) dan halaman Monitoring.

BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan review)

===== ISSUE 1: Tab Materi filter tidak persist setelah refresh =====

ROOT CAUSE:
`src/stores/laporanStore.ts` — store Materi tab TIDAK punya `persist` middleware (plain Zustand create tanpa persist).
Bandingkan dengan `src/app/(admin)/laporan/stores/laporanStore.ts` yang sudah pakai persist.

FIX:
Wrap store di `src/stores/laporanStore.ts` dengan `persist` middleware dari `zustand/middleware`.
Yang perlu di-persist: `materiFilters` (terutama `classId`, `kelompokId`, `desaId`, `kelompokId`, `categoryId`).
Yang TIDAK perlu di-persist: `activeTab`, `materiViewMode` (biarkan reset ke default tiap session).

Storage key: `'laporan-materi-storage'`

VERIFY: Pilih Kelompok + Kelas di Tab Materi → refresh → filter masih terisi.

===== ISSUE 2: Posisi 3 card di Tab Materi harus di atas toggle =====

ROOT CAUSE:
Di `src/app/(admin)/laporan/page.tsx`, urutan render Tab Materi saat ini:
1. MateriTrendChart (grafik)
2. Toggle Kumulatif/Bulan Ini
3. MateriStatsCards (3 card)
4. MateriDataTable

YANG DIINGINKAN:
1. MateriStatsCards (3 card) ← pindah ke atas
2. Toggle Kumulatif/Bulan Ini
3. MateriTrendChart (grafik) ← hanya muncul di mode Kumulatif
4. MateriDataTable

FIX: Pindahkan blok `<MateriStatsCards>` agar render sebelum toggle dan chart.

===== ISSUE 3: Wording card Persentase Pencapaian harus fleksibel =====

ROOT CAUSE:
`src/app/(admin)/laporan/components/MateriStatsCards.tsx` — subtitle hardcode "siswa capai target" tidak mencerminkan mode (kumulatif vs bulan ini).

FIX:
Tambah prop `mode?: 'cumulative' | 'monthly'` ke `MateriStatsCards`:

```tsx
// Subtitle berubah berdasarkan mode:
// cumulative: "kumulatif s.d. bulan ini"
// monthly: "di bulan ini"
```

Di `laporan/page.tsx`, pass `mode={materiReportMode}` ke `<MateriStatsCards>`.

===== ISSUE 4: Tab Semua — Pencapaian Materi selalu 0% di card dan "-" di tabel =====

ROOT CAUSE (dua bagian):

**4a. useMateriDashboard tidak menerima upToMonth dengan benar:**
File: `src/app/(admin)/dashboard/hooks/useMateriDashboard.ts`
File: `src/app/(admin)/dashboard/actions/materiMonitoring.ts`

Di `materiMonitoring.ts` baris ~146-148:
```typescript
if (filters.month) {
    targetQuery = targetQuery.lte('month', filters.month)
}
```
Ini sudah benar secara logic (kumulatif s.d. bulan). Tapi perlu pastikan `month` memang di-pass dari OverviewTab.

Cek `src/app/(admin)/laporan/components/OverviewTab.tsx` — apakah `month: sharedMonth` sudah ada di params `useMateriDashboard`? Kalau sudah ada tapi data tetap 0%, kemungkinan `activeYearId` kosong pada saat hook dipanggil (race condition — `activeYearId` belum ter-fetch).

**FIX race condition:**
Di OverviewTab, `useMateriDashboard` sudah di-guard dengan `!!activeYearId` sebagai condition. Pastikan condition ini benar-benar memblokir fetch sampai `activeYearId` tersedia. Jika ternyata `activeYearId` selalu kosong, debug kenapa `getActiveAcademicYear()` tidak mengisi `activeYearId`.

Tambah console.log sementara untuk debug:
```typescript
useEffect(() => {
  console.log('[OverviewTab] activeYearId:', activeYearId, 'sharedMonth:', sharedMonth, 'materiSemester:', materiSemester)
}, [activeYearId, sharedMonth, materiSemester])
```

**4b. Kolom Pencapaian Materi di tabel tampilkan 0% bukan "-" saat data kosong:**
File: `src/app/(admin)/dashboard/components/ClassMonitoringTable.tsx`

Saat ini baris ~273:
```typescript
if (!materi || materi.total_materials === 0) {
    return <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
}
```

UBAH menjadi: tampilkan `0%` dengan warna merah (pakai `getProgressColor(0)` dari `@/lib/percentages`) bukan `—`:
```typescript
if (!materi || materi.total_materials === 0) {
    return <span className={`text-sm font-semibold ${getProgressColor(0)}`}>0%</span>
}
```

Pastikan import `getProgressColor` dari `@/lib/percentages` sudah ada.

===== ISSUE 5: Monitoring — "Total Nilai" menampilkan completion % bukan nilai =====

ROOT CAUSE:
File: `src/app/(admin)/monitoring/page.tsx` baris ~1007-1013:

```tsx
<div className="text-xs font-medium ...">Total Nilai</div>
<div className="text-3xl font-bold ...">
    {currentStudentCompletion}   ← INI % COMPLETION, BUKAN NILAI AKTUAL!
</div>
```

`getStudentMetrics()` (baris 502) mengembalikan DUA nilai:
- `completion` — persentase materi tuntas (nilai ≥ 70 atau hafal=true), range 0-100%
- `avgNilai` — rata-rata nilai aktual dari materi yang sudah diisi nilai, range 0-100

Yang ditampilkan di "Total Nilai" saat ini adalah `completion`, bukan `avgNilai`.
Di baris 581: `const { completion: currentStudentCompletion } = getStudentMetrics(currentStudent.id)`
Variabel `avgNilai` sudah ada dari `getStudentMetrics` tapi tidak di-destructure untuk currentStudent.

FIX:
Di baris 581, tambah destructure `avgNilai`:
```typescript
const { completion: currentStudentCompletion, avgNilai: currentStudentAvgNilai } = currentStudent
    ? getStudentMetrics(currentStudent.id)
    : { completion: 0, avgNilai: 0 };
```

Lalu di baris ~1007-1013, ganti value dari `currentStudentCompletion` ke `currentStudentAvgNilai`:
```tsx
<div className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
    Total Nilai
</div>
<div className={`text-3xl text-center font-bold ${currentStudentAvgNilai >= 90 ? 'text-green-500' :
    currentStudentAvgNilai >= 80 ? 'text-blue-500' :
        currentStudentAvgNilai >= 70 ? 'text-yellow-500' :
            'text-red-500'}`}>
    {currentStudentAvgNilai}
</div>
```

Ganti juga strokeDasharray di baris ~1036 dari `currentStudentCompletion` ke `currentStudentAvgNilai`.

CATATAN: Ada DUA blok serupa di halaman ini (baris ~931 dan ~1009) — keduanya menampilkan completion dengan circular progress. Yang di ~931 adalah "Pencapaian" (completion % — BIARKAN), yang di ~1009 adalah "Total Nilai" (GANTI ke avgNilai).

===== ISSUE 6: Tampilkan info Semester + Tahun Ajaran (read-only) di filter =====

KONTEKS:
User ingin tahu mereka sedang melihat data semester berapa dan tahun ajaran apa, tapi tidak bisa mengubahnya dari sana (hanya bisa ubah dari filter Bulan). Info ini opsional — kalau props tidak di-pass, tidak perlu ditampilkan.

PENDEKATAN:
Tambah props opsional ke `LaporanTimeFilter`. Kalau di-pass, render teks info kecil di bawah dua dropdown. Kalau tidak di-pass, komponen tetap render dua InputFilter saja (tidak ada perubahan tampilan).

```
Bulan: [Mei ▼]    Tahun: [2026 ▼]
Semester 2 • TA 2025/2026          ← muncul hanya kalau props di-pass
```

FIX:
Di `src/app/(admin)/laporan/components/LaporanTimeFilter.tsx`:

1. Tambah props opsional ke interface:
```typescript
interface LaporanTimeFilterProps {
  month: number
  year: number
  onMonthChange: (month: number) => void
  onYearChange: (year: number) => void
  semester?: 1 | 2          // opsional — kalau tidak di-pass, tidak tampil
  academicYear?: string     // e.g. "2025/2026", opsional
}
```

2. Komponen sudah headless (render `<>`). Tambah teks info SETELAH dua InputFilter, masih di dalam fragment yang sama. Teks ini akan muncul sebagai item ketiga di grid parent — harus `col-span-2` atau sesuaikan dengan grid:
```tsx
export default function LaporanTimeFilter({ month, year, onMonthChange, onYearChange, semester, academicYear }: LaporanTimeFilterProps) {
  return (
    <>
      <InputFilter id="laporanMonthFilter" ... />
      <InputFilter id="laporanYearFilter" ... />
      {(semester !== undefined || academicYear) && (
        <span className="col-span-2 text-xs text-gray-500 dark:text-gray-400 -mt-1">
          {semester !== undefined ? `Semester ${semester}` : ''}
          {semester !== undefined && academicYear ? ' • ' : ''}
          {academicYear ? `TA ${academicYear}` : ''}
        </span>
      )}
    </>
  )
}
```

PERHATIAN: span dengan `col-span-2` hanya bekerja kalau grid parent adalah `grid-cols-2` atau lebih. Di `MateriFilterSection`, grid adalah `grid-cols-1 md:grid-cols-2 lg:grid-cols-4` — gunakan `col-span-2` atau `lg:col-span-2`. Di `FilterSection`, grid adalah `grid-cols-2 gap-4` — `col-span-2` langsung bekerja.

Di `src/app/(admin)/laporan/page.tsx`, compute `academicYearLabel`:
```typescript
const academicYearLabel = `${activeStartYear}/${activeStartYear + 1}`
```
(variabel `activeStartYear` sudah ada di baris ~91)

Pass ke LaporanTimeFilter melalui FilterSection dan MateriFilterSection:
- `FilterSection`: tambah props `semester` dan `academicYear`, forward ke `<LaporanTimeFilter>`
- `MateriFilterSection`: sama — tambah props, forward ke `<LaporanTimeFilter>`
- Di `laporan/page.tsx`, pass `semester={activeSemester}` dan `academicYear={academicYearLabel}` ke kedua komponen tersebut

VERIFIKASI SEMUA ISSUE:
1. Tab Materi → pilih Kelompok+Kelas → refresh → filter masih ada ✓
2. Tab Materi → 3 card tampil di atas toggle ✓
3. Tab Materi Kumulatif → card subtitle "kumulatif s.d. bulan ini" | Tab Bulan Ini → "di bulan ini" ✓
4. Tab Semua → Pencapaian Materi di card bukan 0% (debug dulu kenapa) | kolom tabel tampil 0% bukan "-" ✓
5. Monitoring → "Total Nilai" tampilkan avgNilai aktual (bukan completion %) ✓
6. Filter area → tampil "Semester 2 • TA 2025/2026" sebagai teks kecil ✓
7. npm run type-check → 0 error ✓

REFERENCE FILES:
- @src/stores/laporanStore.ts
- @src/app/(admin)/laporan/page.tsx
- @src/app/(admin)/laporan/components/MateriStatsCards.tsx
- @src/app/(admin)/laporan/components/LaporanTimeFilter.tsx
- @src/app/(admin)/laporan/components/FilterSection.tsx
- @src/app/(admin)/laporan/components/MateriFilterSection.tsx
- @src/app/(admin)/laporan/components/OverviewTab.tsx
- @src/app/(admin)/dashboard/hooks/useMateriDashboard.ts
- @src/app/(admin)/dashboard/actions/materiMonitoring.ts
- @src/app/(admin)/dashboard/components/ClassMonitoringTable.tsx
- @src/app/(admin)/monitoring/page.tsx
- @src/lib/percentages.ts
- @CLAUDE.md
