CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Redesign formula kalkulasi kumulatif materi agar grafik hanya bisa naik atau flat, dengan formula berbeda sesuai tab Per Materi / Per Siswa.

BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan)

===== BACKGROUND =====

Grafik masih naik-turun karena formula lama menggunakan denominator yang bertambah setiap bulan (akumulasi target per bulan). Formula harus diubah ke denominator FIXED = total materi unik seluruh semester.

Data aktual: kelas 1 Warlob 1 Soreang, Semester 2, punya 24 materi unik.
Struktur: tiap bulan ada 7-8 materi berbeda. Materi bisa muncul di beberapa bulan (butuh waktu lama untuk dikuasai). Satu siswa punya satu nilai per materi per semester.

Formula yang disepakati:

**Tab Per Materi:**
- % bulan M = count(materi di akumulasi s.d. M yang SEMUA siswa nilai ≥70) / totalUnikSemester × 100
- Contoh: 8 materi tuntas semua siswa dari 24 total = 33%

**Tab Per Siswa:**
- % bulan M = rata-rata per siswa (tuntas siswa dari akumulasi s.d. M / totalUnikSemester × 100)
- Contoh: rata-rata siswa tuntas 8 dari 24 = 33%

**totalUnikSemester** = jumlah materi unik seluruh semester (FIXED, tidak berubah per bulan).
**Bulan setelah upToMonth**: tetap hitung dengan data yang ada, jangan paksa 0.

===== TASK 1: `materiQueries.ts` =====

File: `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**1a. Tambah `viewMode` ke `MateriReportFilters` interface (sekitar baris 4):**
```typescript
export interface MateriReportFilters {
    classId: string
    academicYearId: string
    semester: 1 | 2
    categoryId?: string
    month?: number
    reportMode?: 'monthly' | 'cumulative'
    viewMode?: 'per_materi' | 'per_siswa'  // TAMBAH
}
```

**1b. Ubah signature `getMateriCumulativeProgress` (sekitar baris 318):**
```typescript
export async function getMateriCumulativeProgress(
    supabase: SupabaseClient,
    params: {
        classId: string
        academicYearId: string
        semester: 1 | 2
        upToMonth: number
        viewMode: 'per_materi' | 'per_siswa'  // TAMBAH
    }
): Promise<MateriMonthlyPoint[]>
```

**1c. Tambah `totalUnikSemester` setelah targets di-fetch (setelah baris `if (!targets || targets.length === 0) return []`):**
```typescript
const totalUnikSemester = new Set(targets.map((t: any) => t.material_item_id)).size
```

**1d. Ganti seluruh loop kalkulasi** (hapus loop lama dari `const result: MateriMonthlyPoint[] = []` sampai `return result`), ganti dengan:

```typescript
const result: MateriMonthlyPoint[] = []
const accumulatedMaterialIds = new Set<string>()

for (const m of semesterMonths) {
    // Akumulasi materi s.d. bulan ini (termasuk bulan setelah upToMonth)
    targets
        .filter((t: any) => t.month === m)
        .forEach((t: any) => accumulatedMaterialIds.add(t.material_item_id))
    const currentIds = Array.from(accumulatedMaterialIds)

    let percentage = 0
    let tuntasCount = 0

    if (viewMode === 'per_materi') {
        // Materi yang SEMUA siswa tuntas (nilai ≥70 atau hafal)
        tuntasCount = currentIds.filter(materialId =>
            studentIds.every(studentId => {
                const p = (progress || []).find((p: any) =>
                    p.student_id === studentId && p.material_item_id === materialId
                )
                return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            })
        ).length
        percentage = totalUnikSemester > 0
            ? Math.round((tuntasCount / totalUnikSemester) * 100)
            : 0
    } else {
        // Per siswa: rata-rata dari totalUnikSemester
        let totalPctSum = 0
        for (const studentId of studentIds) {
            const siswaCount = currentIds.filter(materialId => {
                const p = (progress || []).find((p: any) =>
                    p.student_id === studentId && p.material_item_id === materialId
                )
                return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            }).length
            totalPctSum += totalUnikSemester > 0
                ? (siswaCount / totalUnikSemester) * 100
                : 0
        }
        percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
        tuntasCount = totalStudents > 0
            ? Math.round((totalPctSum / totalStudents / 100) * totalUnikSemester)
            : 0
    }

    result.push({
        month: m,
        month_label: getMonthName(m as any).substring(0, 3),
        target_count: totalUnikSemester,
        tuntas_count: tuntasCount,
        percentage,
        tercapai: `${tuntasCount}/${totalUnikSemester}`
    })
}

return result
```

**1e. Update `fetchMateriReport` summary** (sekitar baris 158):

Saat `reportMode === 'cumulative'`, hitung `avg_completion_rate` dengan formula baru sesuai `viewMode`. `materialItemIds` sudah tersedia (materi kumulatif s.d. bulan dipilih), `progress` sudah tersedia, `studentIds` sudah tersedia.

Perlu juga `totalUnikSemester` untuk `fetchMateriReport` — fetch targets tanpa filter bulan untuk hitung total unik. Tambahkan query kecil:

```typescript
// Hitung totalUnikSemester untuk denominator fixed
const { data: allTargets } = await supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
const totalUnikSemester = new Set((allTargets || []).map((t: any) => t.material_item_id)).size

let avgCompletionRate: number
if (filters.reportMode === 'cumulative' && filters.month && totalUnikSemester > 0) {
    if (filters.viewMode === 'per_materi') {
        const tuntasCount = materialItemIds.filter(materialId =>
            studentIds.every(studentId => {
                const p = (progress || []).find((p: any) =>
                    p.student_id === studentId && p.material_item_id === materialId
                )
                return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            })
        ).length
        avgCompletionRate = Math.round((tuntasCount / totalUnikSemester) * 100)
    } else {
        let totalPctSum = 0
        for (const studentId of studentIds) {
            const siswaCount = (progress || []).filter((p: any) =>
                p.student_id === studentId &&
                materialItemIds.includes(p.material_item_id) &&
                ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            ).length
            totalPctSum += (siswaCount / totalUnikSemester) * 100
        }
        avgCompletionRate = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
    }
} else {
    avgCompletionRate = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
        : 0
}
```

CATATAN: `classMasterIds` sudah ada di `getMaterialItemIds` tapi bukan di `fetchMateriReport`. Perlu refactor kecil — extract `classMasterIds` di `fetchMateriReport` atau buat helper. Cek kode existing sebelum implementasi.

===== TASK 2: `materiActions.ts` =====

File: `src/app/(admin)/laporan/actions/reports/materiActions.ts`

Tambah `viewMode` ke parameter `getMateriTrendData`:

```typescript
export async function getMateriTrendData(params: {
    classId: string
    academicYearId: string
    semester: 1 | 2
    upToMonth: number
    viewMode: 'per_materi' | 'per_siswa'  // TAMBAH
}): Promise<MateriMonthlyPoint[]> {
    const supabase = await createAdminClient()
    return getMateriCumulativeProgress(supabase, params)
}
```

===== TASK 3: `useMateriReportData.ts` =====

File: `src/app/(admin)/laporan/hooks/useMateriReportData.ts`

**3a.** Tambah `viewMode` ke SWR key:
```typescript
const swrKey = shouldFetch
    ? ['materi-report', filters.classId, filters.academicYearId, filters.semester,
       filters.categoryId, filters.month, reportMode, viewMode]  // tambah viewMode
    : null
```

**3b.** Pass `viewMode` ke `getMateriTrendData`:
```typescript
getMateriTrendData({
    classId: filters.classId,
    academicYearId: filters.academicYearId,
    semester: filters.semester,
    upToMonth: filters.month,
    viewMode: viewMode ?? 'per_siswa'  // TAMBAH
})
```

**3c.** Pass `viewMode` ke `getMateriReport` via filters:
```typescript
getMateriReport({ ...filters, reportMode, viewMode: viewMode ?? 'per_siswa' })
```

===== TASK 4: `MateriTrendChart.tsx` =====

File: `src/app/(admin)/laporan/components/MateriTrendChart.tsx`

**4a.** Tambah prop `viewMode`:
```typescript
interface MateriTrendChartProps {
    data: MateriMonthlyPoint[]
    isLoading?: boolean
    className?: string
    semester: 1 | 2
    viewMode: 'per_materi' | 'per_siswa'  // TAMBAH
}
```

**4b.** Update `transformedData` dan `unit` sesuai mode:
```typescript
const transformedData = data.map(point => {
    const detailLine = point.target_count === 0
        ? 'Belum ada target'
        : viewMode === 'per_materi'
            ? `${point.tuntas_count} dari ${point.target_count} materi tuntas (semua siswa)`
            : `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi per siswa`

    return {
        date: point.month_label,
        fullDate: `${getMonthName(point.month as any)} — ${detailLine}`,
        percentage: point.percentage,
    }
})

const unit = viewMode === 'per_materi' ? 'materi tuntas (semua siswa)' : 'rata-rata per siswa'
```

**4c.** Pass `unit` ke `TrendChart`:
```tsx
<TrendChart
    data={transformedData}
    title="Trend Pencapaian Materi (Kumulatif)"
    isLoading={isLoading}
    className={className}
    unit={unit}
    emptyMessage="Pilih kelas untuk melihat trend pencapaian"
/>
```

===== TASK 5: `page.tsx` =====

File: `src/app/(admin)/laporan/page.tsx`

Pass `viewMode` ke `MateriTrendChart` (sekitar baris 396):
```tsx
<MateriTrendChart
    data={trendData}
    isLoading={isLoadingMateri}
    className="mb-6"
    semester={activeSemester}
    viewMode={materiViewMode}  // TAMBAH
/>
```

===== TEST =====

File: `src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts`

Update existing tests untuk `getMateriCumulativeProgress`:
- `target_count` sekarang = totalUnikSemester (fixed), bukan akumulasi per bulan
- Test mode `per_materi`: materi tuntas = hanya yang SEMUA siswa ≥70
- Test mode `per_siswa`: rata-rata per siswa dari totalUnikSemester
- Test bulan setelah upToMonth: masih dihitung (bukan 0 paksa)
- Test denominator tidak berubah antar bulan

===== URUTAN EKSEKUSI =====

1. Update test terlebih dulu (TDD: RED)
2. Task 1: Ubah `materiQueries.ts`
3. Jalankan test → GREEN
4. Task 2: Ubah `materiActions.ts`
5. Task 3: Ubah `useMateriReportData.ts`
6. Task 4: Ubah `MateriTrendChart.tsx`
7. Task 5: Ubah `page.tsx`
8. `npm run type-check` → 0 error
9. `npm run test:run` → semua pass

===== VERIFIKASI =====

1. Tab Per Materi → grafik hanya naik atau flat ✓
2. Tab Per Siswa → grafik hanya naik atau flat ✓
3. Ganti tab Per Materi ↔ Per Siswa → grafik berubah ✓
4. User pilih Mei → grafik tampil 6 bulan, Juni pakai data aktual (bukan paksa 0) ✓
5. Tooltip hover Per Materi: "Januari — 8 dari 24 materi tuntas (semua siswa)" ✓
6. Tooltip hover Per Siswa: "Januari — Rata-rata 8 dari 24 materi per siswa" ✓
7. Card "Persentase Pencapaian" konsisten dengan titik terakhir grafik ✓
8. `npm run type-check` → 0 error ✓
9. `npm run test:run` → semua pass ✓

===== REFERENCE FILES =====
- @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- @src/app/(admin)/laporan/actions/reports/materiActions.ts
- @src/app/(admin)/laporan/hooks/useMateriReportData.ts
- @src/app/(admin)/laporan/components/MateriTrendChart.tsx
- @src/app/(admin)/laporan/page.tsx
- @src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts
