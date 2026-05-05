# Plan: Monitoring Filter Bug + Sidebar Summary + Laporan Materi

## Context

Tiga task berurutan priority-nya yang semuanya berkaitan dengan halaman monitoring dan laporan:

1. **Bug** (P1): Filter Desa→Kelompok di monitoring tidak bekerja untuk teacher karena `desa_id` tidak di-select dari Supabase query, sehingga semua kelompok di `accessibleKelompokList` punya `desa_id: ""`.
2. **Feature**: Panel ringkasan kelas di sidebar monitoring — 3 metrik cepat (avg nilai, % target, siswa aktif) di atas daftar siswa.
3. **Feature**: Section "Laporan Materi" baru di halaman `/laporan` via tab toggle — laporan pencapaian materi per kelas untuk evaluasi admin.

---

## TASK 1 — Bugfix: Filter Desa→Kelompok di Monitoring

### Root Cause

`fetchAllClassesBasic()`, `fetchClassesByIds()`, dan `fetchClassesHierarchical()` di
`src/app/(admin)/users/siswa/actions/classes/queries.ts`
hanya select `id, name` dari tabel `kelompok` — tidak include `desa_id`.

Akibatnya di `monitoring/page.tsx` baris 362:
```typescript
desa_id: cls.kelompok.desa_id || '',  // selalu '' karena tidak di-fetch
```

Filter di `filteredKelompokList` (line 382-391) yang `filter(k => k.desa_id === selectedDesaId)` tidak pernah match karena semua `desa_id` kosong.

### Fix

**File**: `src/app/(admin)/users/siswa/actions/classes/queries.ts`

Tambah `desa_id` ke 4 select query:

```typescript
// Line 62 — fetchAllClassesBasic
// BEFORE:
.select('id, name, kelompok_id, kelompok:kelompok(id, name)')
// AFTER:
.select('id, name, kelompok_id, kelompok:kelompok(id, name, desa_id)')

// Line 68 — fetchClassesByIds
// BEFORE:
.select('id, name, kelompok_id, kelompok:kelompok(id, name)')
// AFTER:
.select('id, name, kelompok_id, kelompok:kelompok(id, name, desa_id)')

// Line 84 — fetchClassesHierarchical (kelompok_id branch)
// BEFORE:
.select('id, name, kelompok_id, kelompok:kelompok_id(id, name)')
// AFTER:
.select('id, name, kelompok_id, kelompok:kelompok_id(id, name, desa_id)')

// Line 122 — fetchClassesHierarchical (desa/daerah branch)
// BEFORE:
.select('id, name, kelompok_id, kelompok:kelompok_id(id, name)')
// AFTER:
.select('id, name, kelompok_id, kelompok:kelompok_id(id, name, desa_id)')
```

### Test

Tidak ada unit test untuk query layer ini (pure Supabase select). Verifikasi manual:
1. Login sebagai teacher yang punya kelas di beberapa desa
2. Buka `/monitoring` → pilih Desa X
3. Dropdown Kelompok harus hanya tampilkan kelompok yang ada di Desa X
4. Sebelumnya: semua kelompok tampil tanpa filter

### Commit message
```
fix(monitoring): include desa_id in class query so desa→kelompok filter works for teachers

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## TASK 2 — Feature: Class Summary Panel di Sidebar Monitoring

### Goal

Tampilkan 3 metrik agregat kelas di atas daftar siswa di `StudentSidebar`, setelah header dan sebelum search input. Panel muncul hanya jika kelas sudah dipilih dan ada data.

### Metrik yang ditampilkan

| Metrik | Kalkulasi | Fallback |
|--------|-----------|---------|
| **Avg Nilai** | Rata-rata nilai semua siswa yang ada progress (nilai > 0) | "—" jika belum ada data |
| **Target %** | Rata-rata % dari `monthlyPercentages` Map | "—" jika bulan belum dipilih |
| **Aktif/Total** | Count siswa dengan nilai > 0 / total siswa di kelas | "0/N" jika belum ada data |

### File 1: `src/app/(admin)/monitoring/page.tsx`

Tambah `classMetrics` useMemo setelah state declarations, sebelum return:

```typescript
const classMetrics = useMemo(() => {
    if (!students.length) return null

    // Avg nilai: rata-rata nilai semua siswa yang ada progress
    let totalNilai = 0
    let nilaiCount = 0
    students.forEach(s => {
        const studentProgress = [...progressData.values()].filter(
            p => p.student_id === s.id && (p.nilai ?? 0) > 0
        )
        if (studentProgress.length > 0) {
            const avg = studentProgress.reduce((sum, p) => sum + (p.nilai ?? 0), 0) / studentProgress.length
            totalNilai += avg
            nilaiCount++
        }
    })
    const avgNilai = nilaiCount > 0 ? Math.round(totalNilai / nilaiCount) : 0

    // % capai target bulan ini (dari monthlyPercentages Map yang sudah ada)
    const monthlyArr = [...monthlyPercentages.values()]
    const avgMonthly = monthlyArr.length > 0
        ? Math.round(monthlyArr.reduce((a, b) => a + b, 0) / monthlyArr.length)
        : null

    // Siswa aktif: ada nilai > 0
    const activeCount = students.filter(s =>
        [...progressData.values()].some(p => p.student_id === s.id && (p.nilai ?? 0) > 0)
    ).length

    return { avgNilai, avgMonthly, activeCount, totalCount: students.length }
}, [students, progressData, monthlyPercentages])
```

Tambah prop ke `<StudentSidebar>`:
```typescript
<StudentSidebar
    students={students}
    selectedStudentId={selectedStudentId}
    onStudentSelect={setSelectedStudentId}
    progressData={progressData}
    materials={materials}
    isOpen={sidebarOpen}
    onToggle={() => setSidebarOpen(!sidebarOpen)}
    isLoading={loading}
    selectedClassName={selectedClass?.name}
    monthlyPercentages={monthlyPercentages}
    classMetrics={classMetrics}   // ← TAMBAH INI
/>
```

### File 2: `src/app/(admin)/monitoring/components/StudentSidebar.tsx`

**Step 1** — Tambah interface `ClassMetrics` dan prop ke interface utama:

```typescript
interface ClassMetrics {
    avgNilai: number
    avgMonthly: number | null
    activeCount: number
    totalCount: number
}

interface StudentSidebarProps {
    students: Student[];
    selectedStudentId: string;
    onStudentSelect: (studentId: string) => void;
    progressData: Map<string, Progress>;
    materials: Material[];
    isOpen: boolean;
    onToggle: () => void;
    isLoading?: boolean;
    selectedClassName?: string;
    monthlyPercentages?: Map<string, number>;
    classMetrics?: ClassMetrics | null;   // ← TAMBAH INI
}
```

**Step 2** — Destructure `classMetrics` dari props:
```typescript
export default function StudentSidebar({
    students,
    selectedStudentId,
    onStudentSelect,
    progressData,
    materials,
    isOpen,
    onToggle,
    isLoading,
    selectedClassName,
    monthlyPercentages,
    classMetrics,   // ← TAMBAH INI
}: StudentSidebarProps) {
```

**Step 3** — Insert panel setelah header section (setelah closing tag header div, sebelum search div):

```tsx
{/* Class Summary Panel */}
{classMetrics && (
    <div className="px-4 pb-3 border-b border-gray-100 dark:border-gray-800">
        <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                <div className="text-base font-bold text-gray-900 dark:text-white">
                    {classMetrics.avgNilai > 0 ? classMetrics.avgNilai : '—'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Avg Nilai</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                <div className="text-base font-bold text-gray-900 dark:text-white">
                    {classMetrics.avgMonthly !== null ? `${classMetrics.avgMonthly}%` : '—'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Target</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-2 text-center">
                <div className="text-base font-bold text-gray-900 dark:text-white">
                    {classMetrics.activeCount}/{classMetrics.totalCount}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Aktif</div>
            </div>
        </div>
    </div>
)}
```

### Test

Tidak ada pure logic yang perlu unit test (semua kalkulasi dari data yang sudah ada di state). Verifikasi manual:
1. Buka monitoring → pilih kelas dengan beberapa siswa
2. Sidebar harus tampilkan 3 card: Avg Nilai, Target, Aktif/Total
3. Jika bulan belum dipilih → Target tampil "—"
4. Jika belum ada progress → Avg Nilai tampil "—", Aktif "0/N"

### Commit message
```
feat(monitoring): add class summary panel to sidebar showing avg nilai, target %, active students

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## TASK 3 — Feature: Laporan Materi di Halaman Laporan

### Goal

Tambah tab "Materi" di halaman `/laporan` yang sudah ada. Tab "Presensi" (existing) tidak berubah sama sekali. Tab "Materi" menampilkan laporan pencapaian materi per kelas: berapa % siswa yang tuntas (nilai ≥ 70) per material item.

### Architecture

Ikuti 3-layer pattern yang sudah ada di laporan:
- `materiQueries.ts` — Layer 1: raw DB queries
- `materiActions.ts` — Layer 2+3: server action orchestration
- `useMateriReportData.ts` — SWR hook (ikut pattern `useReportData.ts`)
- Komponen: `MateriFilterSection`, `MateriStatsCards`, `MateriDataTable`

### File 1 (BARU): `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'

export interface MateriReportFilters {
    classId: string
    academicYearId: string
    semester: 1 | 2
    categoryId?: string
    month?: number
}

export interface MateriReportRow {
    material_item_id: string
    material_name: string
    material_type_name: string
    category_name: string
    tuntas_count: number
    total_students: number
    percentage: number
    avg_nilai: number
}

export interface MateriReportData {
    rows: MateriReportRow[]
    summary: {
        total_materials: number
        avg_completion_rate: number
        class_name: string
    }
}

export async function fetchMateriReport(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<MateriReportData> {
    const { classId, academicYearId, semester, categoryId, month } = filters

    // Step 1: Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')

    if (enrollError) throw new Error(enrollError.message)
    const studentIds = (enrollments || []).map((e: any) => e.student_id)
    const totalStudents = studentIds.length

    if (totalStudents === 0) {
        return { rows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: '' } }
    }

    // Step 2: Get class name
    const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single()
    const className = classData?.name || ''

    // Step 3: Resolve material items
    // Get class_master_ids for this class
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_master_id')
        .eq('class_id', classId)
    const classMasterIds = (mappings || []).map((m: any) => m.class_master_id)

    if (classMasterIds.length === 0) {
        return { rows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Get material items via monthly_targets (scope to class_master + semester + academic_year)
    let targetQuery = supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (month) {
        targetQuery = targetQuery.eq('month', month)
    }

    const { data: targets } = await targetQuery
    let materialItemIds = [...new Set((targets || []).map((t: any) => t.material_item_id))]

    if (materialItemIds.length === 0) {
        return { rows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Step 4: Get material item details with type + category
    let materialQuery = supabase
        .from('material_items')
        .select(`
            id,
            name,
            material_types!inner(
                name,
                material_categories!inner(id, name)
            )
        `)
        .in('id', materialItemIds)

    if (categoryId) {
        materialQuery = materialQuery.eq('material_types.material_categories.id', categoryId)
    }

    const { data: materialItems } = await materialQuery

    if (!materialItems || materialItems.length === 0) {
        return { rows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Re-scope materialItemIds to filtered result
    materialItemIds = materialItems.map((m: any) => m.id)

    // Step 5: Get progress for all students × all material items
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai')
        .in('student_id', studentIds)
        .in('material_item_id', materialItemIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    // Step 6: Aggregate per material_item
    const progressByMaterial = new Map<string, number[]>()
    ;(progress || []).forEach((p: any) => {
        if (p.nilai !== null && p.nilai !== undefined) {
            if (!progressByMaterial.has(p.material_item_id)) {
                progressByMaterial.set(p.material_item_id, [])
            }
            progressByMaterial.get(p.material_item_id)!.push(p.nilai)
        }
    })

    const rows: MateriReportRow[] = materialItems.map((item: any) => {
        const nilaiList = progressByMaterial.get(item.id) || []
        const tuntasCount = nilaiList.filter(n => n >= 70).length
        const avgNilai = nilaiList.length > 0
            ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length)
            : 0
        const percentage = totalStudents > 0
            ? Math.round((tuntasCount / totalStudents) * 100)
            : 0

        return {
            material_item_id: item.id,
            material_name: item.name,
            material_type_name: item.material_types?.name || '',
            category_name: item.material_types?.material_categories?.name || '',
            tuntas_count: tuntasCount,
            total_students: totalStudents,
            percentage,
            avg_nilai: avgNilai,
        }
    })

    const avgCompletionRate = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
        : 0

    return {
        rows,
        summary: {
            total_materials: rows.length,
            avg_completion_rate: avgCompletionRate,
            class_name: className,
        }
    }
}
```

### File 2 (BARU): `src/app/(admin)/laporan/actions/reports/materiActions.ts`

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { fetchMateriReport, type MateriReportFilters, type MateriReportData } from './materiQueries'

export async function getMateriReport(filters: MateriReportFilters): Promise<MateriReportData> {
    const supabase = await createAdminClient()
    return fetchMateriReport(supabase, filters)
}
```

### File 3 (BARU): `src/app/(admin)/laporan/hooks/useMateriReportData.ts`

Ikut pattern `useReportData.ts` yang sudah ada:

```typescript
'use client'

import useSWR from 'swr'
import type { MateriReportFilters, MateriReportData } from '../actions/reports/materiQueries'

interface UseMateriReportDataOptions {
    filters: MateriReportFilters
    enabled?: boolean
}

export function useMateriReportData({ filters, enabled = true }: UseMateriReportDataOptions) {
    const shouldFetch = enabled && !!filters.classId && !!filters.academicYearId

    const swrKey = shouldFetch
        ? ['materi-report', filters.classId, filters.academicYearId, filters.semester, filters.categoryId, filters.month]
        : null

    const { data, error, isLoading, mutate } = useSWR<MateriReportData>(
        swrKey,
        async () => {
            const { getMateriReport } = await import('../actions/reports/materiActions')
            return getMateriReport(filters)
        },
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 10000,
        }
    )

    return {
        data,
        error,
        isLoading: shouldFetch ? isLoading : false,
        mutate,
        hasData: !!data && data.rows.length > 0,
    }
}
```

### File 4 (BARU): `src/app/(admin)/laporan/components/MateriStatsCards.tsx`

```typescript
'use client'

import type { MateriReportData } from '../actions/reports/materiQueries'

interface MateriStatsCardsProps {
    data: MateriReportData | undefined
    isLoading: boolean
}

export default function MateriStatsCards({ data, isLoading }: MateriStatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse h-24" />
                ))}
            </div>
        )
    }

    const summary = data?.summary
    if (!summary) return null

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Rata-rata Pencapaian</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.avg_completion_rate}%
                </div>
                <div className="text-xs text-gray-400 mt-1">siswa capai target</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Materi</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.total_materials}
                </div>
                <div className="text-xs text-gray-400 mt-1">item materi dievaluasi</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400">Kelas</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white mt-1">
                    {summary.class_name || '—'}
                </div>
                <div className="text-xs text-gray-400 mt-1">yang dievaluasi</div>
            </div>
        </div>
    )
}
```

### File 5 (BARU): `src/app/(admin)/laporan/components/MateriDataTable.tsx`

```typescript
'use client'

import type { MateriReportRow } from '../actions/reports/materiQueries'

interface MateriDataTableProps {
    rows: MateriReportRow[]
    isLoading: boolean
}

function getCompletionColor(percentage: number) {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

export default function MateriDataTable({ rows, isLoading }: MateriDataTableProps) {
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="animate-pulse p-4 space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>
        )
    }

    if (rows.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-400">
                Tidak ada data materi untuk filter yang dipilih.
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Materi</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Tipe</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tuntas</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">%</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Avg Nilai</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {rows.map((row) => (
                        <tr key={row.material_item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-4 py-3 text-gray-900 dark:text-white font-medium">
                                {row.material_name}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                                {row.material_type_name}
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">
                                {row.tuntas_count}/{row.total_students}
                            </td>
                            <td className={`px-4 py-3 text-center font-semibold ${getCompletionColor(row.percentage)}`}>
                                {row.percentage}%
                            </td>
                            <td className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 hidden md:table-cell">
                                {row.avg_nilai > 0 ? row.avg_nilai : '—'}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
```

### File 6 (BARU): `src/app/(admin)/laporan/components/MateriFilterSection.tsx`

```typescript
'use client'

interface MateriFilters {
    classId: string
    academicYearId: string
    semester: 1 | 2
    categoryId: string
    month: number | null
}

interface ClassOption { value: string; label: string }
interface YearOption { value: string; label: string }
interface CategoryOption { value: string; label: string }

interface MateriFilterSectionProps {
    filters: MateriFilters
    classes: ClassOption[]
    academicYears: YearOption[]
    categories: CategoryOption[]
    onFilterChange: (key: keyof MateriFilters, value: any) => void
}

const SEMESTER_OPTIONS = [
    { value: 1, label: 'Semester 1' },
    { value: 2, label: 'Semester 2' },
]

const MONTH_OPTIONS = [
    { value: null, label: 'Semua Bulan' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' },
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
]

export default function MateriFilterSection({
    filters,
    classes,
    academicYears,
    categories,
    onFilterChange,
}: MateriFilterSectionProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {/* Tahun Ajaran */}
                <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Tahun Ajaran</label>
                    <select
                        value={filters.academicYearId}
                        onChange={e => onFilterChange('academicYearId', e.target.value)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Pilih Tahun</option>
                        {academicYears.map(y => (
                            <option key={y.value} value={y.value}>{y.label}</option>
                        ))}
                    </select>
                </div>

                {/* Semester */}
                <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Semester</label>
                    <select
                        value={filters.semester}
                        onChange={e => onFilterChange('semester', Number(e.target.value) as 1 | 2)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        {SEMESTER_OPTIONS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>

                {/* Kelas */}
                <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Kelas</label>
                    <select
                        value={filters.classId}
                        onChange={e => onFilterChange('classId', e.target.value)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Pilih Kelas</option>
                        {classes.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Kategori (opsional) */}
                <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Kategori</label>
                    <select
                        value={filters.categoryId}
                        onChange={e => onFilterChange('categoryId', e.target.value)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        <option value="">Semua Kategori</option>
                        {categories.map(c => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                    </select>
                </div>

                {/* Bulan (opsional) */}
                <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Bulan</label>
                    <select
                        value={filters.month ?? ''}
                        onChange={e => onFilterChange('month', e.target.value ? Number(e.target.value) : null)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                        {MONTH_OPTIONS.map((m, i) => (
                            <option key={i} value={m.value ?? ''}>{m.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    )
}
```

### File 7 (MODIF): `src/app/(admin)/laporan/page.tsx`

Tambah state `laporanTab` dan render section materi:

```typescript
// Tambah state di atas existing state
const [laporanTab, setLaporanTab] = useState<'presensi' | 'materi'>('presensi')

// Tambah state filter materi
const [materiFilters, setMateriFilters] = useState({
    classId: '',
    academicYearId: '',
    semester: 1 as 1 | 2,
    categoryId: '',
    month: null as number | null,
})

// Di render: tambah tab selector sebelum FilterSection yang sudah ada
<div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
    <button
        onClick={() => setLaporanTab('presensi')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            laporanTab === 'presensi'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
        }`}
    >
        Presensi
    </button>
    <button
        onClick={() => setLaporanTab('materi')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            laporanTab === 'materi'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
        }`}
    >
        Materi
    </button>
</div>

{/* Existing presensi content — wrapped */}
{laporanTab === 'presensi' && (
    <>
        {/* ... existing FilterSection, StatsCards, ReportChart, DataTable ... */}
    </>
)}

{/* New materi section */}
{laporanTab === 'materi' && (
    <MateriSection
        filters={materiFilters}
        onFilterChange={(key, value) => setMateriFilters(prev => ({ ...prev, [key]: value }))}
        classes={classes}
        academicYears={academicYears}  // perlu fetch ini jika belum ada
        categories={categories}
    />
)}
```

Buat komponen `MateriSection` inline di page.tsx atau sebagai file terpisah `MateriSection.tsx` yang menggunakan `useMateriReportData`, `MateriFilterSection`, `MateriStatsCards`, `MateriDataTable`.

### Data tambahan yang perlu di-fetch di page.tsx

Di `loadInitialData()` atau useEffect awal, tambahkan fetch untuk:
- `academicYears`: `getAcademicYears()` — sudah ada di `tahun-ajaran/actions`
- `categories`: `getHafalanCategories()` — sudah ada di `monitoring/actions/monitoring.ts`, atau buat yang lebih general `getMaterialCategories()`
- `classes`: sudah tersedia dari `getAllClasses()` yang dipanggil existing laporan page

### Verification

1. Buka `/laporan` → harus ada 2 tab: "Presensi" dan "Materi"
2. Tab Presensi: behavior tidak berubah sama sekali
3. Tab Materi:
   - Pilih Tahun Ajaran + Semester + Kelas → tabel muncul dengan % tuntas per materi
   - Kolom: Nama Materi | Tipe | Tuntas (X/N) | % | Avg Nilai
   - Filter kategori: hanya materi dari kategori yang dipilih
   - Filter bulan: hanya materi yang masuk target bulan itu
4. `npm run type-check` — 0 errors

---

## Critical Files

| Task | File | Action |
|------|------|--------|
| T1 | `src/app/(admin)/users/siswa/actions/classes/queries.ts` | Add `desa_id` to 4 select statements (lines 62, 68, 84, 122) |
| T2 | `src/app/(admin)/monitoring/page.tsx` | Add `classMetrics` useMemo + pass to StudentSidebar |
| T2 | `src/app/(admin)/monitoring/components/StudentSidebar.tsx` | Add `classMetrics` prop + render panel |
| T3 | `src/app/(admin)/laporan/actions/reports/materiQueries.ts` | NEW |
| T3 | `src/app/(admin)/laporan/actions/reports/materiActions.ts` | NEW |
| T3 | `src/app/(admin)/laporan/hooks/useMateriReportData.ts` | NEW |
| T3 | `src/app/(admin)/laporan/components/MateriStatsCards.tsx` | NEW |
| T3 | `src/app/(admin)/laporan/components/MateriDataTable.tsx` | NEW |
| T3 | `src/app/(admin)/laporan/components/MateriFilterSection.tsx` | NEW |
| T3 | `src/app/(admin)/laporan/page.tsx` | Add tab toggle + render materi section |

---

## CLAUDE.md Check
- [ ] Pattern baru? → Tab toggle di laporan adalah UX pattern baru — dokumentasikan di architecture-patterns.md jika diadopsi di halaman lain
- [ ] Tabel baru? → Tidak
- [ ] Route baru? → Tidak (section di dalam `/laporan` yang sudah ada)
- [ ] Permission pattern baru? → Tidak, ikut existing role-based filtering
- [ ] Jika ada yang perlu diupdate → update `docs/claude/architecture-patterns.md` dengan tab toggle pattern setelah implementasi selesai
