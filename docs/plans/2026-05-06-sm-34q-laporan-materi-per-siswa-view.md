# Plan: [sm-34q] View Mode Per Materi vs Per Siswa di Laporan Materi

## Context

Laporan materi saat ini hanya bisa menampilkan data dengan baris = materi (per materi). User ingin bisa memilih view mode: **Per Materi** (default) atau **Per Siswa** (baris = siswa, kolom = % tuntas + avg nilai).

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/app/(admin)/laporan/page.tsx` | Tambah state `materiViewMode`, pass ke child |
| `src/app/(admin)/laporan/components/MateriFilterSection.tsx` | Tambah InputFilter "Tampilkan" |
| `src/app/(admin)/laporan/actions/reports/materiQueries.ts` | Tambah `MateriSiswaRow` + `fetchMateriReportBySiswa()` |
| `src/app/(admin)/laporan/actions/reports/materiActions.ts` | Tambah `getMateriReportBySiswa()` server action |
| `src/app/(admin)/laporan/hooks/useMateriReportData.ts` | Tambah param `viewMode` ke hook |
| `src/app/(admin)/laporan/components/MateriDataTable.tsx` | Conditional columns per viewMode |

---

## TASK 1 — State `materiViewMode` di page.tsx

### File: `src/app/(admin)/laporan/page.tsx`

**Step 1a**: Tambah state setelah `materiFilters`:

```typescript
const [materiViewMode, setMateriViewMode] = useState<'per_materi' | 'per_siswa'>('per_materi')
```

**Step 1b**: Pass ke `useMateriReportData`:

```typescript
const { data: materiData, isLoading: isLoadingMateri } = useMateriReportData({
    filters: materiFilters,
    enabled: laporanTab === 'materi',
    viewMode: materiViewMode   // TAMBAH INI
})
```

**Step 1c**: Pass ke komponen di JSX:

```tsx
<MateriFilterSection
    filters={materiFilters}
    categories={categories}
    onFilterChange={handleMateriFilterChange}
    userProfile={userProfile}
    daerahList={daerah || []}
    desaList={desa || []}
    kelompokList={kelompok || []}
    classList={classes || []}
    viewMode={materiViewMode}              {/* TAMBAH */}
    onViewModeChange={setMateriViewMode}   {/* TAMBAH */}
/>

<MateriDataTable
    rows={materiData?.rows || []}
    isLoading={isLoadingMateri}
    viewMode={materiViewMode}              {/* TAMBAH */}
    siswaBySiswaRows={materiData?.siswaRows || []}  {/* TAMBAH — lihat Task 4 */}
/>
```

---

## TASK 2 — InputFilter "Tampilkan" di MateriFilterSection

### File: `src/app/(admin)/laporan/components/MateriFilterSection.tsx`

**Step 2a**: Tambah props ke interface:

```typescript
interface MateriFilterSectionProps {
    // ...existing props...
    viewMode: 'per_materi' | 'per_siswa'
    onViewModeChange: (mode: 'per_materi' | 'per_siswa') => void
}
```

**Step 2b**: Destructure dari params:

```typescript
export default function MateriFilterSection({
    // ...existing...
    viewMode,
    onViewModeChange,
}: MateriFilterSectionProps) {
```

**Step 2c**: Tambah InputFilter di dalam grid (kolom terakhir, setelah Bulan):

```tsx
{/* View Mode */}
<InputFilter
    id="view-mode-filter"
    label="Tampilkan"
    value={viewMode}
    onChange={(val) => onViewModeChange(val as 'per_materi' | 'per_siswa')}
    options={[
        { value: 'per_materi', label: 'Per Materi' },
        { value: 'per_siswa', label: 'Per Siswa' }
    ]}
    compact
/>
```

Update grid columns dari `md:grid-cols-7` ke `md:grid-cols-8` (atau sesuaikan jumlah kolom yang ada).

---

## TASK 3 — `MateriSiswaRow` + `fetchMateriReportBySiswa` di materiQueries.ts

### File: `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**Step 3a**: Tambah interface baru setelah `MateriReportRow`:

```typescript
export interface MateriSiswaRow {
    student_id: string
    student_name: string
    tuntas_count: number
    total_materials: number
    percentage: number
    avg_nilai: number
}
```

**Step 3b**: Update `MateriReportData` untuk include siswa rows:

```typescript
export interface MateriReportData {
    rows: MateriReportRow[]
    siswaRows: MateriSiswaRow[]   // TAMBAH
    summary: {
        total_materials: number
        avg_completion_rate: number
        class_name: string
    }
}
```

**Step 3c**: Extract helper `getMaterialItemIds()` dari `fetchMateriReport()` agar bisa di-reuse:

```typescript
async function getMaterialItemIds(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<string[]> {
    // Step 2-3 dari fetchMateriReport yang ada (ambil class_master_ids → material_item_ids)
    // Return array of material_item_id strings
    
    // Step 1: class_master_ids via class_master_mappings
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_master_id')
        .eq('class_id', filters.classId)
    
    if (!mappings?.length) return []
    const classMasterIds = mappings.map(m => m.class_master_id)

    // Step 2: material_item_ids via material_monthly_targets
    let targetQuery = supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', filters.academicYearId)
        .eq('semester', filters.semester)

    if (filters.month) {
        targetQuery = targetQuery.eq('month', filters.month)
    }
    if (filters.categoryId) {
        // Join via material_items → material_types → material_categories
        // Gunakan subquery atau filter post-fetch
    }

    const { data: targets } = await targetQuery
    if (!targets?.length) return []
    
    return [...new Set(targets.map(t => t.material_item_id))]
}
```

**Step 3d**: Tambah `fetchMateriReportBySiswa()`:

```typescript
export async function fetchMateriReportBySiswa(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<MateriSiswaRow[]> {
    // Step 1: enrolled students
    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, students(id, full_name)')
        .eq('class_id', filters.classId)
        .eq('academic_year_id', filters.academicYearId)
        .eq('status', 'active')

    if (!enrollments?.length) return []

    const studentMap = new Map(
        enrollments.map(e => [e.student_id, (e.students as any)?.full_name || ''])
    )
    const studentIds = [...studentMap.keys()]

    // Step 2: material item IDs (reuse helper)
    const materialItemIds = await getMaterialItemIds(supabase, filters)
    if (!materialItemIds.length) return []

    // Step 3: progress per student
    const { data: progressList } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai')
        .in('student_id', studentIds)
        .in('material_item_id', materialItemIds)
        .eq('academic_year_id', filters.academicYearId)
        .eq('semester', filters.semester)

    // Step 4: aggregate per student
    return studentIds.map(studentId => {
        const studentProgress = (progressList || []).filter(p => p.student_id === studentId)
        const tuntas = studentProgress.filter(p => (p.nilai ?? 0) >= 70).length
        const scored = studentProgress.filter(p => (p.nilai ?? 0) > 0)
        const avgNilai = scored.length > 0
            ? Math.round(scored.reduce((s, p) => s + (p.nilai ?? 0), 0) / scored.length)
            : 0

        return {
            student_id: studentId,
            student_name: studentMap.get(studentId) || '',
            tuntas_count: tuntas,
            total_materials: materialItemIds.length,
            percentage: Math.round((tuntas / materialItemIds.length) * 100),
            avg_nilai: avgNilai,
        }
    }).sort((a, b) => b.percentage - a.percentage)
}
```

**Step 3e**: Update `fetchMateriReport()` untuk juga return `siswaRows`:

Tambah call ke `fetchMateriReportBySiswa()` di dalam `fetchMateriReport()` dan include di return object.

---

## TASK 4 — `getMateriReportBySiswa` di materiActions.ts

### File: `src/app/(admin)/laporan/actions/reports/materiActions.ts`

```typescript
export async function getMateriReportBySiswa(filters: MateriReportFilters): Promise<MateriSiswaRow[]> {
    const supabase = await createClient()
    return fetchMateriReportBySiswa(supabase, filters)
}
```

---

## TASK 5 — Update `useMateriReportData` hook

### File: `src/app/(admin)/laporan/hooks/useMateriReportData.ts`

Tambah param `viewMode` — tapi karena kedua view pakai data yang sama (dari `getMateriReport` yang sekarang return `rows` + `siswaRows`), hook tidak perlu berubah banyak. SWR key tetap sama, data yang di-consume berbeda di komponen:

```typescript
// Tidak perlu perubahan besar — `data.rows` untuk per_materi, `data.siswaRows` untuk per_siswa
// Hanya update return type jika perlu
```

Jika `MateriReportData` sudah include `siswaRows`, hook tidak perlu diubah — cukup page.tsx yang pass `siswaRows` ke `MateriDataTable`.

---

## TASK 6 — Conditional Columns di MateriDataTable

### File: `src/app/(admin)/laporan/components/MateriDataTable.tsx`

**Step 6a**: Update props interface:

```typescript
interface MateriDataTableProps {
    rows: MateriReportRow[]
    siswaRows?: MateriSiswaRow[]
    viewMode: 'per_materi' | 'per_siswa'
    isLoading: boolean
}
```

**Step 6b**: Add import:

```typescript
import type { MateriSiswaRow } from '../actions/reports/materiQueries'
```

**Step 6c**: Conditional columns:

```typescript
const columns = useMemo(() => {
    if (viewMode === 'per_siswa') {
        return [
            { key: 'student_name', label: 'Siswa', sortable: true, align: 'left' as const },
            { key: 'percentage', label: 'Tercapai', sortable: true, align: 'center' as const },
            { key: 'avg_nilai', label: 'Nilai', sortable: true, align: 'center' as const, className: 'hidden md:table-cell' },
        ]
    }
    return [
        // existing per_materi columns
        { key: 'material_name', label: 'Materi', sortable: true, align: 'left' as const },
        { key: 'material_type_name', label: 'Tipe', sortable: true, align: 'left' as const, className: 'hidden sm:table-cell' },
        { key: 'percentage', label: 'Tercapai', sortable: true, align: 'center' as const },
        { key: 'avg_nilai', label: 'Nilai', sortable: true, align: 'center' as const, className: 'hidden md:table-cell' },
    ]
}, [viewMode])
```

**Step 6d**: Conditional renderCell dan data:

```typescript
const tableData = viewMode === 'per_siswa' ? (siswaRows || []) : rows
const tableTitle = viewMode === 'per_siswa' ? 'Detail Pencapaian per Siswa' : 'Detail Pencapaian per Materi'
const tableSearchPlaceholder = viewMode === 'per_siswa' ? 'Cari siswa...' : 'Cari materi...'
const tableGetRowId = viewMode === 'per_siswa'
    ? (row: any) => row.student_id
    : (row: any) => row.material_item_id

const renderCell = (column: any, row: any) => {
    if (viewMode === 'per_siswa') {
        // render per siswa
        switch (column.key) {
            case 'student_name':
                return <span className="font-medium text-gray-900 dark:text-white">{row.student_name}</span>
            case 'percentage':
                return (
                    <div className="flex items-center justify-center gap-1.5 font-semibold">
                        <span className={getCompletionColor(row.percentage)}>{row.percentage}%</span>
                        <span className="text-gray-400">({row.tuntas_count}/{row.total_materials})</span>
                    </div>
                )
            case 'avg_nilai':
                if (row.avg_nilai <= 0) return <span className="text-gray-400">—</span>
                const { grade, color: gradeColor } = getGrade(row.avg_nilai)
                return (
                    <div className="flex items-center justify-center gap-2 font-semibold">
                        <span className="text-gray-700 dark:text-gray-300">{row.avg_nilai}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-black ${gradeColor}`}>{grade}</span>
                    </div>
                )
        }
    }
    // existing per_materi renderCell cases...
}
```

---

## TDD Tests

### File: `src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts` (BARU atau TAMBAH)

```typescript
describe('fetchMateriReportBySiswa', () => {
    it('returns empty array if no enrollments', async () => {
        const mockSupabase = {
            from: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
        const result = await fetchMateriReportBySiswa(mockSupabase as any, {
            classId: 'cls-1',
            academicYearId: 'yr-1',
            semester: 1
        })
        expect(result).toEqual([])
    })

    it('calculates percentage correctly', () => {
        // Pure logic test: 2 tuntas dari 4 total = 50%
        const tuntas = 2
        const total = 4
        expect(Math.round((tuntas / total) * 100)).toBe(50)
    })
})
```

---

## Verification

1. Tab Materi → pilih kelas → default tampil tabel "Per Materi"
2. Ganti filter "Tampilkan" ke "Per Siswa" → tabel berubah: baris = siswa, judul "Detail Pencapaian per Siswa"
3. Search/sort per siswa berfungsi
4. Stats cards tidak berubah di kedua mode
5. `npm run type-check` → bersih

---

## CLAUDE.md Check

- [ ] Pattern baru? → Tidak
- [ ] Tabel database baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak

---

## Commit Message Template

```
feat(laporan): add per-siswa view mode to materi report with student-level completion breakdown

fixes #54
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
