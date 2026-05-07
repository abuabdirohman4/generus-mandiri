CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Fix tampilan LaporanTimeFilter di halaman Laporan — ubah dari komponen dengan layout wrapper sendiri menjadi "headless" (React.Fragment) agar bisa masuk ke dalam grid yang sama dengan filter lain.

ISSUE: sm-0ew / GH-#62
BRANCH: feat/sm-0ew-laporan-time-filter

MASALAH ROOT CAUSE:
`LaporanTimeFilter` saat ini render `<div className="flex gap-3">` sebagai wrapper. Ketika diletakkan di dalam card yang sudah punya grid (`DataFilter` menggunakan grid internal), dua sistem layout bertabrakan — LaporanTimeFilter tidak bisa masuk sebagai grid cell, sehingga tampil di baris baru / pojok kanan terpisah.

Antigravity sebelumnya menaruh `<LaporanTimeFilter>` di dalam `<div className="mt-4 flex justify-end">` — ini adalah workaround yang hasilnya masih floating, bukan menyatu dengan filter lain.

SOLUSI: HEADLESS PATTERN
LaporanTimeFilter harus render sebagai React.Fragment (tanpa wrapper div). Parent yang mengontrol grid.

PERUBAHAN YANG DIPERLUKAN:

### 1. `LaporanTimeFilter.tsx` — ubah menjadi headless

SEBELUM:
```tsx
export default function LaporanTimeFilter({ month, year, onMonthChange, onYearChange }: LaporanTimeFilterProps) {
  return (
    <div className="flex gap-3">
      <InputFilter id="laporanMonthFilter" ... />
      <InputFilter id="laporanYearFilter" ... />
    </div>
  )
}
```

SESUDAH:
```tsx
export default function LaporanTimeFilter({ month, year, onMonthChange, onYearChange }: LaporanTimeFilterProps) {
  return (
    <>
      <InputFilter id="laporanMonthFilter" ... />
      <InputFilter id="laporanYearFilter" ... />
    </>
  )
}
```

Tidak ada perubahan lain di file ini — hanya ganti `<div className="flex gap-3">` menjadi `<>`.

### 2. `FilterSection.tsx` — letakkan LaporanTimeFilter di dalam grid DataFilter

MASALAH SAAT INI: `<DataFilter>` punya grid internalnya sendiri. `LaporanTimeFilter` diletakkan di luar DataFilter dalam `<div className="mt-4 flex justify-end">` → tidak sejajar.

SOLUSI: DataFilter sudah punya prop untuk menambah item ke dalam gridnya. Cek apakah DataFilter punya prop seperti `extraFilters` atau `children`. Jika tidak ada, gunakan pendekatan berikut:

Pindahkan `LaporanTimeFilter` agar render setelah DataFilter tapi dalam container yang sama. Karena DataFilter menggunakan grid internal, kita tidak bisa inject item ke dalamnya tanpa mengubah DataFilter.

ALTERNATIF PALING SIMPEL yang tidak perlu ubah DataFilter:
- Hapus `<div className="mt-4 flex justify-end">` yang membungkus LaporanTimeFilter
- Letakkan `<LaporanTimeFilter>` langsung setelah DataFilter, dalam wrapper dengan grid yang selaras:

```tsx
// Di dalam FilterSection, general mode:
<>
  <DataFilter ... />
  <div className="grid grid-cols-2 gap-4 mt-0">
    <LaporanTimeFilter
      month={sharedMonth}
      year={sharedYear}
      onMonthChange={onMonthChange}
      onYearChange={onYearChange}
    />
  </div>
</>
```

Karena LaporanTimeFilter sekarang headless (render dua InputFilter sebagai fragment), menaruhnya di dalam `<div className="grid grid-cols-2 gap-4">` akan membuat keduanya menjadi dua grid cell yang rapi sejajar.

### 3. `MateriFilterSection.tsx` — sama seperti FilterSection

SAAT INI: `<LaporanTimeFilter>` di dalam `<div className="mt-4 flex justify-end">` di bawah grid filter.

SESUDAH: Hapus `<div className="mt-4 flex justify-end">`, letakkan `<LaporanTimeFilter>` langsung di dalam grid yang sudah ada:

```tsx
// Grid filter Materi sudah ada: <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
// Tambahkan LaporanTimeFilter sebagai item terakhir di dalam grid yang sama:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* ... semua filter yang sudah ada (Daerah, Desa, Kelompok, Kelas, Kategori) */}
  <LaporanTimeFilter ... />  {/* headless → render 2 InputFilter sebagai fragment → 2 grid cell */}
</div>
```

PENTING: Props `month`, `year`, `onMonthChange`, `onYearChange` harus ditambahkan ke MateriFilterSectionProps dan di-pass dari `laporan/page.tsx`. Nilai yang di-pass:
- `month={sharedMonth}` dari useLaporanPage()
- `year={sharedYear}` dari useLaporanPage()
- `onMonthChange={(m) => setSharedTime(m, sharedYear)}`
- `onYearChange={(y) => setSharedTime(sharedMonth, y)}`

### 4. `laporan/page.tsx` — hapus LaporanTimeFilter yang sudah dipindah ke dalam komponen

Setelah LaporanTimeFilter sudah masuk ke FilterSection dan MateriFilterSection, hapus semua kemunculan `<LaporanTimeFilter>` yang standalone di page.tsx (jika masih ada). Jika sudah tidak ada di page.tsx, tidak perlu ubah apapun.

Cek juga: `LaporanTimeFilter` untuk Tab Overview (OverviewTab) tidak perlu diubah — OverviewTab baca langsung dari store, bukan dari page.tsx.

HASIL YANG DIHARAPKAN:
- Tab Presensi: Bulan + Tahun tampil dalam satu baris dengan filter lain (Kelompok, Kelas, Jenis Kelamin, dll), TIDAK di pojok kanan bawah terpisah
- Tab Materi: Bulan + Tahun tampil dalam grid yang sama dengan Kelompok, Kelas, Kategori
- Tab Semua: tidak berubah (OverviewTab sudah handle sendiri)

VERIFIKASI:
1. `npm run type-check` → 0 error
2. Buka Tab Presensi → filter Bulan+Tahun sejajar dengan filter lain dalam satu card
3. Buka Tab Materi → filter Bulan+Tahun sejajar dengan Kelompok, Kelas, Kategori
4. Ganti bulan di Tab Presensi → pindah ke Tab Materi → bulan sama (shared state tetap berfungsi)
5. Ganti bulan → Tab Semua ikut update

Output: "✅ Fix complete: [ringkasan]"

REFERENCE FILES:
- @src/app/(admin)/laporan/components/LaporanTimeFilter.tsx
- @src/app/(admin)/laporan/components/FilterSection.tsx
- @src/app/(admin)/laporan/components/MateriFilterSection.tsx
- @src/app/(admin)/laporan/page.tsx
- @src/components/shared/DataFilter.tsx (read-only — jangan ubah)
- @CLAUDE.md
