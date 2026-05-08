# Plan: Fix Bulanan Denominator + Chart Bulanan Baru

**Branch:** `feat/sm-6au-laporan-materi-kumulatif` (lanjutan)
**Date:** 2026-05-08

---

## Context

Dua masalah diselesaikan bersama:

**Masalah 1 — Denominator salah di mode Bulanan:**
Setelah fix denominator kumulatif (totalUnikSemester=24), mode Bulanan ikut terdampak:
- **Kumulatif** → denominator = `totalUnikSemester` (24) ✓ benar
- **Bulanan** → denominator = `materialItemIds.length` (7 materi bulan dipilih) ← perlu fix

Saat ini `fetchMateriReportBySiswa` dan `fetchMateriReport` summary memakai `totalUnikSemester` untuk semua mode → tabel Per Siswa mode Bulanan: `7/24` seharusnya `7/7`, card "Total Materi": `24` seharusnya `7`.

**Masalah 2 — Chart mode Bulanan belum ada:**
Mode Bulanan hanya menampilkan tabel. User ingin bar chart persentase pencapaian per bulan dalam semester (semua 6 bulan). `TrendChart` sudah support bar chart — tinggal feed data baru.

---

## Task 1 — Fix denominator branching di `fetchMateriReportBySiswa`

**File:** `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**Root cause:** Baris ~343-344 memakai `totalUnikSemester` untuk semua mode.

**Fix — tambahkan setelah baris ~303 (setelah `totalUnikSemester` dihitung):**
```typescript
const denominator = filters.reportMode === 'cumulative'
    ? totalUnikSemester
    : materialItemIds.length
```

**Ubah return statement:**
```typescript
total_materials: denominator,
percentage: denominator > 0 ? Math.round((tuntasCount / denominator) * 100) : 0,
```

---

## Task 2 — Fix `summary.total_materials` di `fetchMateriReport`

**File:** `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**Fix — ubah summary (~baris 201-209):**
```typescript
summary: {
    total_materials: filters.reportMode === 'cumulative'
        ? totalUnikSemester
        : materialItemIds.length,
    avg_completion_rate: avgCompletionRate,
    class_name: className,
}
```

---

## Task 3a — Buat `getMateriMonthlyChart` di `materiQueries.ts`

**File:** `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

Tambahkan fungsi baru setelah `getMateriCumulativeProgress`:

```typescript
export async function getMateriMonthlyChart(
    supabase: SupabaseClient,
    params: {
        classId: string
        academicYearId: string
        semester: 1 | 2
    }
): Promise<MateriMonthlyPoint[]> {
    const { classId, academicYearId, semester } = params

    const classMasterIds = await getClassMasterIds(supabase, classId)
    if (classMasterIds.length === 0) return []

    // Fetch semua targets semester ini (semua bulan)
    const { data: targets } = await supabase
        .from('material_monthly_targets')
        .select('month, material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (!targets || targets.length === 0) return []

    // Get students
    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')
    const totalStudents = enrollments?.length || 0
    if (totalStudents === 0) return []
    const studentIds = enrollments!.map(e => e.student_id)

    // Get all progress semester ini
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, hafal')
        .in('student_id', studentIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    const semesterMonths = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6]
    const result: MateriMonthlyPoint[] = []

    for (const m of semesterMonths) {
        const monthTargets = targets.filter((t: any) => t.month === m)
        const monthMaterialIds = [...new Set(monthTargets.map((t: any) => t.material_item_id))]

        let totalPctSum = 0
        for (const studentId of studentIds) {
            const siswaCount = (progress || []).filter((p: any) =>
                p.student_id === studentId &&
                monthMaterialIds.includes(p.material_item_id) &&
                ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            ).length
            totalPctSum += monthMaterialIds.length > 0
                ? (siswaCount / monthMaterialIds.length) * 100
                : 0
        }

        const percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
        const avgTuntas = totalStudents > 0
            ? Math.round((totalPctSum / totalStudents / 100) * monthMaterialIds.length)
            : 0

        result.push({
            month: m,
            month_label: getMonthName(m as any).substring(0, 3),
            target_count: monthMaterialIds.length,
            tuntas_count: avgTuntas,
            percentage,
            tercapai: `${avgTuntas}/${monthMaterialIds.length}`
        })
    }

    return result
}
```

---

## Task 3b — Tambah `getMateriMonthlyChartData` di `materiActions.ts`

**File:** `src/app/(admin)/laporan/actions/reports/materiActions.ts`

```typescript
export async function getMateriMonthlyChartData(params: {
    classId: string
    academicYearId: string
    semester: 1 | 2
}): Promise<MateriMonthlyPoint[]> {
    const supabase = await createAdminClient()
    return getMateriMonthlyChart(supabase, params)
}
```

Import `getMateriMonthlyChart` dari `materiQueries`.

---

## Task 3c — Update `useMateriReportData.ts`

**File:** `src/app/(admin)/laporan/hooks/useMateriReportData.ts`

Ubah bagian fetch trendData di SWR fetcher:
```typescript
reportMode === 'cumulative' && filters.month
    ? getMateriTrendData({ ... })
    : reportMode === 'monthly' && filters.classId && filters.academicYearId
        ? getMateriMonthlyChartData({
            classId: filters.classId,
            academicYearId: filters.academicYearId,
            semester: filters.semester,
          })
        : Promise.resolve([])
```

Tambahkan `getMateriMonthlyChartData` ke dynamic import:
```typescript
const { getMateriReport, getMateriTrendData, getMateriMonthlyChartData } =
    await import('../actions/reports/materiActions')
```

---

## Task 3d — Update `page.tsx`

**File:** `src/app/(admin)/laporan/page.tsx`

Ubah kondisi render chart (~baris 396):
```tsx
{(materiReportMode === 'cumulative' || materiReportMode === 'monthly') && (
    <div className="mb-6">
        <MateriTrendChart
            data={materiTrendData}
            isLoading={isLoadingMateri}
            semester={activeSemester}
            viewMode={materiViewMode}
            reportMode={materiReportMode}
        />
    </div>
)}
```

---

## Task 3e — Update `MateriTrendChart.tsx`

**File:** `src/app/(admin)/laporan/components/MateriTrendChart.tsx`

Tambah prop `reportMode`:
```typescript
interface MateriTrendChartProps {
    data: MateriMonthlyPoint[]
    isLoading?: boolean
    className?: string
    semester: 1 | 2
    viewMode: 'per_materi' | 'per_siswa'
    reportMode?: 'cumulative' | 'monthly'
}
```

Update title dan unit:
```typescript
const title = reportMode === 'monthly'
    ? 'Pencapaian Materi per Bulan'
    : 'Trend Pencapaian Materi (Kumulatif)'

const unit = reportMode === 'monthly'
    ? 'rata-rata per siswa'
    : viewMode === 'per_materi'
        ? 'materi tuntas (semua siswa)'
        : 'rata-rata per siswa'
```

Update tooltip fullDate:
```typescript
const detailLine = point.target_count === 0
    ? 'Belum ada target'
    : reportMode === 'monthly'
        ? `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi dikuasai`
        : viewMode === 'per_materi'
            ? `${point.tuntas_count} dari ${point.target_count} materi tuntas (semua siswa)`
            : `Rata-rata ${point.tuntas_count} dari ${point.target_count} materi per siswa`
```

---

## Urutan Eksekusi

1. Task 1 — fix denominator branching `fetchMateriReportBySiswa`
2. Task 2 — fix `summary.total_materials` branching
3. Task 3a — buat `getMateriMonthlyChart`
4. Task 3b — tambah `getMateriMonthlyChartData` action
5. Task 3c — update hook
6. Task 3d — update page.tsx
7. Task 3e — update MateriTrendChart.tsx
8. `npm run type-check` → 0 error
9. `npm run test:run` → semua pass

---

## Verifikasi

1. Mode Bulanan, bulan Mei, Kelas 1:
   - Card "Total Materi" → `7` ✓
   - Tabel Per Siswa → `X/7` ✓
   - Chart bulanan tampil 6 bar (Jan–Jun) ✓
   - Tooltip: "Rata-rata X dari 7 materi dikuasai" ✓
2. Mode Kumulatif tidak berubah — tetap `24` ✓
3. `npm run type-check` → 0 error ✓
4. `npm run test:run` → semua pass ✓

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU? → Tidak, reuse TrendChart + MateriTrendChart
- [ ] Tabel database baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
