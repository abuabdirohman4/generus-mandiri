CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Fix 2 UI issues di halaman Laporan.

BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan)

===== ISSUE 1: Tab Semua tidak menampilkan info Semester + Tahun Ajaran di filter =====

ROOT CAUSE:
`src/app/(admin)/laporan/components/OverviewTab.tsx` baris 269-277:

```tsx
<div className="grid grid-cols-2 gap-4 mt-2">
  <LaporanTimeFilter
    month={sharedMonth}
    year={sharedYear}
    onMonthChange={(m) => setSharedTime(m, sharedYear)}
    onYearChange={(y) => setSharedTime(sharedMonth, y)}
  />
</div>
```

`LaporanTimeFilter` dipanggil TANPA props `semester` dan `academicYear` — jadi teks info tidak muncul.
Tab Presensi dan Tab Materi sudah pass props ini (via FilterSection dan MateriFilterSection), tapi OverviewTab belum.

FIX:
Di `OverviewTab.tsx`:

1. Hitung `activeSemester` dan `academicYearLabel` dari `sharedMonth` dan `sharedYear`:
```typescript
const activeSemester = useMemo((): 1 | 2 => sharedMonth >= 7 ? 1 : 2, [sharedMonth])
const activeStartYear = useMemo(() => sharedMonth >= 7 ? sharedYear : sharedYear - 1, [sharedMonth, sharedYear])
const academicYearLabel = `${activeStartYear}/${activeStartYear + 1}`
```

2. Pass ke `<LaporanTimeFilter>`:
```tsx
<LaporanTimeFilter
  month={sharedMonth}
  year={sharedYear}
  onMonthChange={(m) => setSharedTime(m, sharedYear)}
  onYearChange={(y) => setSharedTime(sharedMonth, y)}
  semester={activeSemester}
  academicYear={academicYearLabel}
/>
```

CATATAN: `LaporanTimeFilter` sudah punya props `semester` dan `academicYear` (opsional) — kalau di-pass, render teks info kecil "Semester 2 • TA 2025/2026" di bawah filter. Tidak perlu ubah `LaporanTimeFilter` sama sekali.

VERIFY: Buka Tab Semua → di bawah filter Bulan+Tahun muncul teks "Semester 2 • TA 2025/2026".

===== ISSUE 2: Chart Tab Materi — tooltip hover membingungkan =====

ROOT CAUSE + KONTEKS:
`src/app/(admin)/laporan/actions/reports/materiQueries.ts` baris 371-387:

```typescript
const totalTargetPossible = totalStudents * currentTargetIds.length  // e.g. 3 siswa × 10 materi = 30
tuntasCount = progress.filter(p => tuntas).length  // e.g. 6 baris tuntas
percentage = tuntasCount / totalTargetPossible * 100  // 6/30 = 20%
```

Jadi `percentage = 20%` artinya "dari semua pasangan siswa-materi, 20% tuntas."
Ini BUKAN "6 dari 10 materi tuntas" (yang hasilnya 60%), tapi "6 dari 30 pasangan siswa-materi tuntas" (20%).

`MateriTrendChart.tsx` saat ini mengisi `details` dengan field presensi (present=tuntas_count, total=target_count) yang menyebabkan tooltip tampil label salah dan data tidak relevan:
```
Februari (6/10 materi tuntas)  ← menyesatkan: 6 itu bukan materi tuntas tapi siswa-materi
20% tuntas
0 Pertemuan        ← tidak relevan
10 Peserta         ← tidak relevan (ini target_count, bukan jumlah siswa)
6 hadir, 0 alfa    ← tidak relevan
0 izin, 0 sakit    ← tidak relevan
```

FIX di `MateriTrendChart.tsx`:

**Step 1** — Hapus `details` dari transformedData (hilangkan semua baris presensi dari tooltip).

**Step 2** — Ubah `fullDate` agar menjelaskan 20% dengan cara yang mudah dimengerti:

Penjelasan terbaik untuk 20%: "rata-rata per siswa, 2 dari 10 materi dikuasai" (secara matematis identik dengan 6/30 = 20%).

Cara hitung `avgPerSiswa`:
```typescript
// Dari MateriMonthlyPoint: tuntas_count = total tuntas (siswa × materi), target_count = materi unik
// Jumlah siswa tidak ada di MateriMonthlyPoint, tapi bisa dihitung:
// tuntas_count / percentage = totalTargetPossible = siswa × target_count
// siswa = totalTargetPossible / target_count = (tuntas_count / (percentage/100)) / target_count
// TAPI ini risky kalau percentage = 0. Lebih aman: gunakan tercapai field.
```

CATATAN: `MateriMonthlyPoint` sudah punya field `tercapai` (format `"6/30"`) dari server action.
Cek apakah field `tercapai` ada di type `MateriMonthlyPoint` di `materiQueries.ts`. Kalau ada, ekstrak totalSiswaMateri dari situ.

Alternatif yang lebih simpel tanpa hitung ulang — ubah `fullDate` menjadi:
```typescript
// Hitung avg materi per siswa dari tuntas_count dan target_count:
// Kita tidak tahu jumlah siswa langsung di sini, tapi:
// percentage = tuntas_count / (siswa * target_count) * 100
// Jika target_count > 0 dan percentage > 0:
//   siswa = tuntas_count / target_count / (percentage / 100)
// Atau: gunakan tercapai field yang sudah format "tuntas/total"

const [tuntasStr, totalStr] = point.tercapai.split('/')
const totalPossible = Number(totalStr)  // siswa × materi
const siswaCount = point.target_count > 0 ? Math.round(totalPossible / point.target_count) : 0
const avgPerSiswa = siswaCount > 0 ? Math.round(point.tuntas_count / siswaCount) : 0

fullDate: `${getMonthName(point.month as any)}`,
// Dan tambah detail khusus materi di bawahnya (bukan pakai details interface):
```

TAPI karena TrendChart tidak support custom detail lines, cara paling bersih adalah:

**FINAL FIX di `MateriTrendChart.tsx`:**

```tsx
const transformedData = data.map(point => {
    const totalPossible = point.tercapai ? Number(point.tercapai.split('/')[1]) : 0
    const siswaCount = point.target_count > 0 && totalPossible > 0
        ? Math.round(totalPossible / point.target_count)
        : 0
    const avgPerSiswa = siswaCount > 0
        ? Math.round(point.tuntas_count / siswaCount)
        : 0

    const detailLine = siswaCount > 0
        ? `Rata-rata ${avgPerSiswa} dari ${point.target_count} materi per siswa (${siswaCount} siswa)`
        : `${point.target_count} materi ditargetkan`

    return {
        date: point.month_label,
        fullDate: `${getMonthName(point.month as any)} — ${detailLine}`,
        percentage: point.percentage,
        // Tidak pass details — hapus semua field presensi
    }
})
```

Hasil tooltip yang diharapkan:
```
Februari — Rata-rata 2 dari 10 materi per siswa (3 siswa)
20% rata-rata per siswa
```

CATATAN PENTING: Cek dulu apakah `MateriMonthlyPoint` di `materiQueries.ts` sudah export field `tercapai`. Kalau belum ada di type interface, tambahkan:
```typescript
export interface MateriMonthlyPoint {
  month: number
  month_label: string
  target_count: number
  tuntas_count: number
  percentage: number
  tercapai: string  // format "tuntasCount/totalTargetPossible" e.g. "6/30"
}
```

VERIFY: Hover chart di Tab Materi → tooltip tampil:
```
Februari — Rata-rata 2 dari 10 materi per siswa (3 siswa)
20% rata-rata per siswa
```
Tidak ada baris "0 Pertemuan", "Peserta", "hadir/alfa", "izin/sakit".

===== REFERENCE FILES =====
- @src/app/(admin)/laporan/components/OverviewTab.tsx
- @src/app/(admin)/laporan/components/MateriTrendChart.tsx
- @src/components/charts/TrendChart.tsx
- @src/app/(admin)/laporan/components/LaporanTimeFilter.tsx (baca saja — tidak perlu diubah)
- @CLAUDE.md

===== VERIFIKASI =====
1. Tab Semua → filter area tampil "Semester 2 • TA 2025/2026" di bawah Bulan+Tahun ✓
2. Tab Materi → hover chart → tooltip bersih tanpa data presensi ✓
3. npm run type-check → 0 error ✓
