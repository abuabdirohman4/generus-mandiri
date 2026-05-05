# Plan: [sm-n0r] Dashboard Widget Pencapaian Materi

## Context

Dashboard saat ini hanya menampilkan presensi monitoring. User dengan akses materi (admin/superadmin/guru dengan `can_manage_materials`) perlu bisa melihat ringkasan pencapaian materi lintas kelas di dashboard, tanpa harus buka halaman laporan. Widget ini di-gate behind `canManageMaterials()`.

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/app/(admin)/dashboard/actions/materiMonitoring.ts` | BARU — server action |
| `src/app/(admin)/dashboard/hooks/useMateriDashboard.ts` | BARU — SWR hook |
| `src/app/(admin)/dashboard/components/MateriMonitoringCard.tsx` | BARU — widget component |
| `src/app/(admin)/dashboard/page.tsx` | Tambah widget section + AcademicYearSelector |

---

## TASK 1 — Server Action `getMateriDashboardSummary`

### File: `src/app/(admin)/dashboard/actions/materiMonitoring.ts` (BARU)

```typescript
'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { canManageMaterials } from '@/lib/accessControlServer'
import { getCurrentUserProfile } from '@/lib/accessControlServer'

export interface ClassMateriSummary {
    class_id: string
    class_name: string
    kelompok_name: string
    total_materials: number
    avg_completion_rate: number  // % siswa capai target (nilai >= 70) rata-rata lintas materi
    avg_nilai: number
}

export interface MateriDashboardFilters {
    academicYearId: string
    semester: 1 | 2
    categoryId?: string
    daerahId?: string
    desaId?: string
    kelompokId?: string
    classIds?: string[]  // override — jika diisi, hanya kelas ini yang dihitung
}

export async function getMateriDashboardSummary(
    filters: MateriDashboardFilters
): Promise<ClassMateriSummary[]> {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()

    if (!profile || !canManageMaterials(profile)) return []
    if (!filters.academicYearId) return []

    // Step 1: Tentukan kelas yang accessible
    let classQuery = supabase
        .from('classes')
        .select('id, name, kelompok:kelompok_id(id, name, desa_id)')
    
    if (filters.classIds?.length) {
        classQuery = classQuery.in('id', filters.classIds)
    } else if (profile.role === 'teacher' && profile.classes?.length) {
        classQuery = classQuery.in('id', profile.classes.map(c => c.id))
    }
    // Admin: filter by org scope
    if (filters.kelompokId) classQuery = classQuery.eq('kelompok_id', filters.kelompokId)

    const { data: classes } = await classQuery
    if (!classes?.length) return []

    // Step 2: Untuk setiap kelas, hitung ringkasan materi
    const results: ClassMateriSummary[] = []

    for (const cls of classes) {
        // 2a: enrolled students
        const { data: enrollments } = await supabase
            .from('student_enrollments')
            .select('student_id')
            .eq('class_id', cls.id)
            .eq('academic_year_id', filters.academicYearId)
            .eq('status', 'active')

        if (!enrollments?.length) {
            results.push({
                class_id: cls.id,
                class_name: cls.name,
                kelompok_name: (cls.kelompok as any)?.name || '',
                total_materials: 0,
                avg_completion_rate: 0,
                avg_nilai: 0,
            })
            continue
        }

        const studentIds = enrollments.map(e => e.student_id)

        // 2b: material item IDs via class_master_mappings → material_monthly_targets
        const { data: mappings } = await supabase
            .from('class_master_mappings')
            .select('class_master_id')
            .eq('class_id', cls.id)
        
        if (!mappings?.length) continue
        const classMasterIds = mappings.map(m => m.class_master_id)

        let targetQuery = supabase
            .from('material_monthly_targets')
            .select('material_item_id')
            .in('class_master_id', classMasterIds)
            .eq('academic_year_id', filters.academicYearId)
            .eq('semester', filters.semester)

        if (filters.categoryId) {
            // Filter by category via material_items → material_types → material_categories
            const { data: itemsInCategory } = await supabase
                .from('material_items')
                .select('id, material_types(material_category_id)')
                .eq('material_types.material_category_id', filters.categoryId)
            
            const categoryItemIds = (itemsInCategory || []).map(i => i.id)
            if (categoryItemIds.length) {
                targetQuery = targetQuery.in('material_item_id', categoryItemIds)
            }
        }

        const { data: targets } = await targetQuery
        if (!targets?.length) continue

        const materialItemIds = [...new Set(targets.map(t => t.material_item_id))]

        // 2c: progress
        const { data: progressList } = await supabase
            .from('student_material_progress')
            .select('student_id, material_item_id, nilai')
            .in('student_id', studentIds)
            .in('material_item_id', materialItemIds)
            .eq('academic_year_id', filters.academicYearId)
            .eq('semester', filters.semester)

        // 2d: aggregate per material, then average
        let totalCompletionRate = 0
        let totalNilaiSum = 0
        let nilaiCount = 0

        for (const materialId of materialItemIds) {
            const matProgress = (progressList || []).filter(p => p.material_item_id === materialId)
            const tuntasCount = matProgress.filter(p => (p.nilai ?? 0) >= 70).length
            totalCompletionRate += studentIds.length > 0
                ? (tuntasCount / studentIds.length) * 100
                : 0
            
            const scored = matProgress.filter(p => (p.nilai ?? 0) > 0)
            if (scored.length) {
                totalNilaiSum += scored.reduce((s, p) => s + (p.nilai ?? 0), 0) / scored.length
                nilaiCount++
            }
        }

        results.push({
            class_id: cls.id,
            class_name: cls.name,
            kelompok_name: (cls.kelompok as any)?.name || '',
            total_materials: materialItemIds.length,
            avg_completion_rate: materialItemIds.length > 0
                ? Math.round(totalCompletionRate / materialItemIds.length)
                : 0,
            avg_nilai: nilaiCount > 0 ? Math.round(totalNilaiSum / nilaiCount) : 0,
        })
    }

    return results.sort((a, b) => b.avg_completion_rate - a.avg_completion_rate)
}
```

---

## TASK 2 — SWR Hook `useMateriDashboard`

### File: `src/app/(admin)/dashboard/hooks/useMateriDashboard.ts` (BARU)

```typescript
import useSWR from 'swr'
import { getMateriDashboardSummary } from '../actions/materiMonitoring'
import type { MateriDashboardFilters, ClassMateriSummary } from '../actions/materiMonitoring'

export function useMateriDashboard(
    filters: MateriDashboardFilters,
    enabled: boolean
) {
    const swrKey = enabled && filters.academicYearId
        ? ['materi-dashboard', JSON.stringify(filters)]
        : null

    return useSWR<ClassMateriSummary[]>(
        swrKey,
        () => getMateriDashboardSummary(filters),
        {
            revalidateOnFocus: false,
            dedupingInterval: 300000,  // 5 menit
            keepPreviousData: true,
        }
    )
}
```

---

## TASK 3 — Widget Component `MateriMonitoringCard`

### File: `src/app/(admin)/dashboard/components/MateriMonitoringCard.tsx` (BARU)

```tsx
'use client'

import type { ClassMateriSummary } from '../actions/materiMonitoring'
import { getProgressColor, getGrade } from '@/lib/percentages'

interface MateriMonitoringCardProps {
    data: ClassMateriSummary[]
    isLoading: boolean
}

function getCompletionColor(percentage: number) {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
}

export default function MateriMonitoringCard({ data, isLoading }: MateriMonitoringCardProps) {
    if (isLoading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="animate-pulse p-6 space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
                    ))}
                </div>
            </div>
        )
    }

    if (!data.length) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    Tidak ada data materi. Pilih tahun ajaran dan semester.
                </p>
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400">Kelas</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 dark:text-gray-400 hidden sm:table-cell">Kelompok</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">Total Materi</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400">% Tercapai</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 dark:text-gray-400 hidden md:table-cell">Avg Nilai</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                        {data.map((row) => {
                            const { grade, color: gradeColor } = getGrade(row.avg_nilai)
                            return (
                                <tr key={row.class_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.class_name}</td>
                                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 hidden sm:table-cell">{row.kelompok_name}</td>
                                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{row.total_materials}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`font-semibold ${getCompletionColor(row.avg_completion_rate)}`}>
                                            {row.avg_completion_rate}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center hidden md:table-cell">
                                        {row.avg_nilai > 0 ? (
                                            <div className="flex items-center justify-center gap-1.5">
                                                <span className="text-gray-700 dark:text-gray-300 font-medium">{row.avg_nilai}</span>
                                                <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${gradeColor}`}>{grade}</span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">—</span>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
```

---

## TASK 4 — Tambah Widget di Dashboard Page

### File: `src/app/(admin)/dashboard/page.tsx`

**Step 4a**: Tambah imports:

```typescript
import { canManageMaterials } from '@/lib/accessControl'
import { useMateriDashboard } from './hooks/useMateriDashboard'
import MateriMonitoringCard from './components/MateriMonitoringCard'
import AcademicYearSelector from '@/components/shared/AcademicYearSelector'
```

**Step 4b**: Tambah state dan computed values di dalam component (setelah existing state):

```typescript
const hasMateriAccess = useMemo(() => {
    if (!userProfile) return false
    return canManageMaterials(userProfile)
}, [userProfile])

const [materiYearId, setMateriYearId] = useState('')
const [materiSemester, setMateriSemester] = useState<1 | 2>(1)

const { data: materiDashboardData = [], isLoading: materiLoading } = useMateriDashboard(
    {
        academicYearId: materiYearId,
        semester: materiSemester,
        daerahId: filters.daerah?.join(','),
        desaId: filters.desa?.join(','),
        kelompokId: filters.kelompok?.join(','),
    },
    hasMateriAccess && !!materiYearId
)
```

**Step 4c**: Tambah JSX section setelah `ClassMonitoringTable` (cari `<ClassMonitoringTable` di page.tsx, tambahkan section di bawahnya):

```tsx
{/* Pencapaian Materi — hanya untuk user dengan akses materi */}
{hasMateriAccess && (
    <div className="mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pencapaian Materi
            </h2>
            <div className="w-full sm:w-auto">
                <AcademicYearSelector
                    selectedYearId={materiYearId}
                    selectedSemester={materiSemester}
                    onYearChange={setMateriYearId}
                    onSemesterChange={setMateriSemester}
                    compact
                    className="flex-row gap-2"
                />
            </div>
        </div>
        <MateriMonitoringCard
            data={materiDashboardData}
            isLoading={materiLoading && !!materiYearId}
        />
    </div>
)}
```

---

## Verification

1. Login sebagai **guru biasa** → tidak ada section "Pencapaian Materi" di dashboard
2. Login sebagai **admin/superadmin** → section muncul dengan AcademicYearSelector
3. Pilih tahun ajaran + semester → tabel per kelas muncul dengan % tercapai dan avg nilai
4. Tabel diurutkan dari % tertinggi ke terendah
5. `npm run type-check` → bersih

---

## CLAUDE.md Check

- [x] Pattern baru? → Widget materi di dashboard dengan role gate — catat di `docs/claude/architecture-patterns.md` setelah implementasi: "Widget sections di dashboard dapat di-gate dengan `canManageMaterials()` — lihat MateriMonitoringCard"
- [ ] Tabel database baru? → Tidak
- [ ] Route baru? → Tidak
- [x] Permission pattern baru? → `canManageMaterials()` dipakai untuk show/hide dashboard section

---

## Commit Message Template

```
feat(dashboard): add materi achievement widget for users with material access

fixes #55
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
