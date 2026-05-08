CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Redesign kalkulasi kumulatif materi di halaman Laporan — ubah formula agar persentase hanya bisa naik atau flat, tidak pernah turun.

BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan)

===== BACKGROUND =====

Formula lama di `getMateriCumulativeProgress`:
```
percentage = tuntas_count / (totalStudents × akumulasiTarget) × 100
```

Masalah: tiap bulan ada materi BERBEDA yang ditargetkan (bukan set materi yang sama). Saat materi baru masuk akumulasi tapi belum ada nilainya, denominator naik → persentase bisa turun. Guru melihat Februari 80%, Maret 57% → bingung.

Investigasi data aktual: struktur `material_monthly_targets` berisi 7-8 materi berbeda per bulan (ada overlap, banyak yang unik per bulan). Total materi unik semester 2 kelas 1 Warlob 1 = 24 materi.

Formula baru yang disepakati:
```
percentage = rata-rata per siswa (tuntasPerSiswa / materiKumulatif × 100)
```
- Denominator = materi kumulatif s.d. bulan ini (bukan × jumlah siswa)
- Numerator = per siswa, berapa materi yang sudah tuntas
- Hasilnya: hanya bisa naik atau flat

===== TASK 1: `materiQueries.ts` =====

File: `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**1a. Ubah loop di `getMateriCumulativeProgress` (ganti baris 353-389):**

Hapus:
```typescript
const relevantMonths = semesterMonths.filter(m => {
    if (semester === 1) return m <= upToMonth
    return m <= upToMonth
})

const result: MateriMonthlyPoint[] = []
const accumulatedMaterialIds = new Set<string>()

for (const m of relevantMonths) {
    targets
        .filter(t => t.month === m)
        .forEach(t => accumulatedMaterialIds.add(t.material_item_id))
    
    const currentTargetIds = Array.from(accumulatedMaterialIds)
    const totalTargetPossible = totalStudents * currentTargetIds.length
    
    let tuntasCount = 0
    if (totalTargetPossible > 0) {
        tuntasCount = (progress || []).filter(p => 
            accumulatedMaterialIds.has(p.material_item_id) && 
            ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
        ).length
    }

    result.push({
        month: m,
        month_label: getMonthName(m as any).substring(0, 3),
        target_count: currentTargetIds.length,
        tuntas_count: tuntasCount,
        percentage: totalTargetPossible > 0 ? Math.round((tuntasCount / totalTargetPossible) * 100) : 0,
        tercapai: `${tuntasCount}/${totalTargetPossible}`
    })
}

return result
```

Ganti dengan:
```typescript
const result: MateriMonthlyPoint[] = []
const accumulatedMaterialIds = new Set<string>()

for (const m of semesterMonths) {
    // Bulan setelah upToMonth: tampil titik kosong (belum ada data)
    if (m > upToMonth) {
        result.push({
            month: m,
            month_label: getMonthName(m as any).substring(0, 3),
            target_count: accumulatedMaterialIds.size,
            tuntas_count: 0,
            percentage: 0,
            tercapai: `0/${accumulatedMaterialIds.size}`
        })
        continue
    }

    // Akumulasi materi s.d. bulan ini
    targets.filter(t => t.month === m).forEach(t => accumulatedMaterialIds.add(t.material_item_id))
    const currentCount = accumulatedMaterialIds.size

    // Hitung per siswa: berapa materi di set kumulatif yang sudah tuntas
    let totalPctSum = 0
    for (const studentId of studentIds) {
        const tuntasCount = (progress || []).filter(p =>
            p.student_id === studentId &&
            accumulatedMaterialIds.has(p.material_item_id) &&
            ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
        ).length
        totalPctSum += currentCount > 0 ? (tuntasCount / currentCount) * 100 : 0
    }

    const percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
    const avgTuntas = totalStudents > 0
        ? Math.round((totalPctSum / totalStudents / 100) * currentCount)
        : 0

    result.push({
        month: m,
        month_label: getMonthName(m as any).substring(0, 3),
        target_count: currentCount,
        tuntas_count: avgTuntas,
        percentage,
        tercapai: `${avgTuntas}/${currentCount}`
    })
}

return result
```

CATATAN: `tuntas_count` sekarang = rata-rata materi tuntas per siswa (bukan aggregate siswa×materi).
`tercapai` sekarang = `"avgTuntas/currentCount"` e.g. `"8/10"` artinya "rata-rata 8 dari 10 materi per siswa".

**1b. Ubah `avg_completion_rate` di `fetchMateriReport` (ganti baris 158-160):**

Hapus:
```typescript
const avgCompletionRate = rows.length > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
    : 0
```

Ganti dengan:
```typescript
let avgCompletionRate: number
if (filters.reportMode === 'cumulative' && filters.month) {
    // Per siswa: berapa persen dari materi kumulatif s.d. bulan ini yang sudah tuntas
    let totalPctSum = 0
    for (const studentId of studentIds) {
        const tuntasCount = (progress || []).filter((p: any) =>
            p.student_id === studentId &&
            materialItemIds.includes(p.material_item_id) &&
            ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
        ).length
        totalPctSum += materialItemIds.length > 0
            ? (tuntasCount / materialItemIds.length) * 100
            : 0
    }
    avgCompletionRate = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
} else {
    avgCompletionRate = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
        : 0
}
```

CATATAN: `progress` dan `materialItemIds` sudah tersedia di scope `fetchMateriReport` (baris 110-116 dan 107). Tidak perlu query ulang.

===== TASK 2: `MateriTrendChart.tsx` =====

File: `src/app/(admin)/laporan/components/MateriTrendChart.tsx`

Ganti seluruh isi `transformedData`:

```typescript
const transformedData = data.map(point => {
    const detailLine = point.target_count === 0
        ? 'Belum ada target'
        : `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi per siswa`

    return {
        date: point.month_label,
        fullDate: `${getMonthName(point.month as any)} — ${detailLine}`,
        percentage: point.percentage,
    }
})
```

Hapus semua variabel `totalPossible`, `siswaCount`, `avgPerSiswa` yang lama — tidak diperlukan lagi.

===== TASK 3: `MateriStatsCards.tsx` =====

File: `src/app/(admin)/laporan/components/MateriStatsCards.tsx` baris 52

```tsx
// Sebelum:
{mode === 'cumulative' ? 'kumulatif s.d. bulan ini' : 'di bulan ini'}

// Sesudah:
{mode === 'cumulative' ? 'rata-rata per siswa, kumulatif s.d. bulan ini' : 'di bulan ini'}
```

===== TEST YANG PERLU DIUPDATE =====

File: `src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts`

Test existing untuk `getMateriCumulativeProgress` perlu diupdate karena:
- `tuntas_count` sekarang = rata-rata per siswa (bukan aggregate)
- `tercapai` sekarang format "avgTuntas/currentCount"
- `percentage` sekarang = rata-rata per siswa (berbeda dari formula lama)
- Grafik selalu 6 titik (bukan hanya s.d. upToMonth)

Contoh expected values baru:
```typescript
// GIVEN: 2 siswa, bulan 7, 1 materi, keduanya tuntas
// percentage = rata-rata(1/1 × 100, 1/1 × 100) / 2 = 100%  (sama dengan lama)
// tuntas_count = round(100/100 × 1) = 1  (lama: 2 = siswa×materi)
// tercapai = "1/1"  (lama: "2/2")

// GIVEN: 2 siswa, bulan 8, tambah 1 materi baru (belum ada nilai)
// accumulatedMaterials = 2, siswa1: 1/2 = 50%, siswa2: 1/2 = 50%
// percentage = 50%  (lama juga 50% tapi dari 2/(2×2)=50%)
// tuntas_count = round(50/100 × 2) = 1  (lama: 2)
// tercapai = "1/2"  (lama: "2/4")

// Bulan setelah upToMonth: percentage=0, tuntas_count=0, target_count=akumulasi terakhir
```

===== URUTAN EKSEKUSI =====

1. Update test file dulu (TDD: buat test baru → RED)
2. Task 1: Ubah `materiQueries.ts`
3. Jalankan test → GREEN
4. Task 2: Ubah `MateriTrendChart.tsx`
5. Task 3: Ubah `MateriStatsCards.tsx`
6. `npm run type-check` → 0 error
7. `npm run test:run` → semua pass

===== VERIFIKASI =====

1. Grafik Tab Materi: selalu tampil 6 titik (bulan penuh semester) ✓
2. Titik grafik: Januari 100% → Februari ≥ 80% → tidak pernah turun ✓
3. Tooltip hover bulan dengan data: "Februari — Rata-rata 8 dari 10 materi per siswa" ✓
4. Tooltip hover bulan kosong: "Maret — Belum ada target" ✓
5. Card "Persentase Pencapaian": label bawah "rata-rata per siswa, kumulatif s.d. bulan ini" ✓
6. `npm run type-check` → 0 error ✓
7. `npm run test:run` → semua pass ✓

===== REFERENCE FILES =====
- @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- @src/app/(admin)/laporan/components/MateriTrendChart.tsx
- @src/app/(admin)/laporan/components/MateriStatsCards.tsx
- @src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts
