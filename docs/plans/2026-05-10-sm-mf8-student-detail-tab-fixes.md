# Plan: sm-mf8 — Fix & Enhance Student Detail Tab (Post-Antigravity)

## Context

Antigravity mengimplementasikan sm-mf8 (tab layout detail siswa), namun ada bug dan fitur yang belum selesai:

1. **Bug**: Tab Materi kosong — query PostgREST nested join di `MateriView` tidak reliable, ganti ke server action (pola proven di laporan)
2. **Fix**: Label tab "Profile" → "Profil"
3. **Fix**: `layout.tsx` menambah outer wrapper `bg-gray-50 min-h-screen + px-4 py-6` yang tidak perlu
4. **Tambah**: Kolom action di `MateriDataTable` per_siswa → link ke `/users/siswa/${student_id}/materi`

Tampilan tab Materi: grouped by kategori, kolom Materi + Tipe + Nilai + Predikat.

---

## Files yang Dimodifikasi

| File | Action | Alasan |
|------|--------|--------|
| `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` | MODIF | Label "Profile" → "Profil" |
| `src/app/(admin)/users/siswa/[studentId]/layout.tsx` | MODIF | Hapus outer wrapper bg/padding redundant |
| `src/app/(admin)/users/siswa/[studentId]/actions/materi.ts` | BARU | Server action `getStudentMateriProgress` |
| `src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx` | MODIF | Ganti PostgREST nested join → server action |
| `src/app/(admin)/laporan/components/MateriDataTable.tsx` | MODIF | Tambah kolom action di per_siswa view |

---

## TASK 1 — Fix Label Tab "Profile" → "Profil"

### File: `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx`

Ubah satu baris:
```tsx
// SEBELUM:
{ label: 'Profile', href: `/users/siswa/${studentId}`, match: `/${studentId}` },

// SESUDAH:
{ label: 'Profil', href: `/users/siswa/${studentId}`, match: `/${studentId}` },
```

Test: `npm run test:run` → harus pass (StudentTabHeader.test.tsx — update expected label jika ada).

---

## TASK 2 — Fix layout.tsx — Hapus Outer Wrapper

### File: `src/app/(admin)/users/siswa/[studentId]/layout.tsx`

Replace seluruh isi dengan versi bersih (tanpa outer bg/padding wrapper):

```tsx
'use client'

import { use } from 'react'
import StudentTabHeader from './components/StudentTabHeader'

export default function StudentDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)

    return (
        <div>
            <StudentTabHeader studentId={studentId} />
            {children}
        </div>
    )
}
```

Test: `npm run type-check` setelah task ini.

---

## TASK 3 — Buat Server Action `getStudentMateriProgress`

### File: `src/app/(admin)/users/siswa/[studentId]/actions/materi.ts` (BARU)

Pola: 2 query terpisah (progress → items) untuk menghindari PostgREST nested join yang tidak reliable. Gunakan `createAdminClient()`.

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getGrade, getProgressTextColor } from '@/lib/percentages'

export interface StudentMateriProgressItem {
    material_item_id: string
    material_name: string
    type_name: string
    category_name: string
    nilai: number | null
    grade: string
    colorClass: string
}

export interface StudentMateriProgressResult {
    grouped: Record<string, StudentMateriProgressItem[]>
    totalTuntas: number
    totalItems: number
}

export async function getStudentMateriProgress(
    studentId: string,
    academicYearId: string,
    semester: number
): Promise<StudentMateriProgressResult> {
    const supabase = createAdminClient()

    // 1. Fetch progress records for this student
    const { data: progressData, error: progressError } = await supabase
        .from('student_material_progress')
        .select('material_item_id, nilai')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (progressError || !progressData || progressData.length === 0) {
        return { grouped: {}, totalTuntas: 0, totalItems: 0 }
    }

    const materialItemIds = progressData.map(p => p.material_item_id)

    // 2. Fetch material item details separately (avoid unreliable nested join)
    const { data: itemsData } = await supabase
        .from('material_items')
        .select(`
            id,
            name,
            material_types (
                id,
                name,
                material_categories ( id, name )
            )
        `)
        .in('id', materialItemIds)

    // Build lookup map
    const itemMap = new Map<string, { name: string; typeName: string; categoryName: string }>()
    for (const item of (itemsData || [])) {
        const type = item.material_types as any
        itemMap.set(item.id, {
            name: item.name,
            typeName: type?.name ?? '—',
            categoryName: type?.material_categories?.name ?? '—',
        })
    }

    // 3. Combine progress + item details
    const items: StudentMateriProgressItem[] = progressData.map(p => {
        const info = itemMap.get(p.material_item_id)
        const nilai = p.nilai ?? null
        const gradeInfo = getGrade(nilai ?? 0)
        const colorClass = getProgressTextColor(nilai ?? 0)

        return {
            material_item_id: p.material_item_id,
            material_name: info?.name ?? '—',
            type_name: info?.typeName ?? '—',
            category_name: info?.categoryName ?? '—',
            nilai,
            grade: nilai !== null ? gradeInfo.grade : '-',
            colorClass: nilai !== null ? colorClass : 'text-gray-400',
        }
    })

    // 4. Group by category
    const grouped: Record<string, StudentMateriProgressItem[]> = {}
    for (const item of items) {
        if (!grouped[item.category_name]) grouped[item.category_name] = []
        grouped[item.category_name].push(item)
    }

    const totalTuntas = items.filter(i => i.nilai !== null && i.nilai >= 70).length

    return { grouped, totalTuntas, totalItems: items.length }
}
```

Test: `npm run type-check` setelah task ini.

---

## TASK 4 — Rewrite `MateriView.tsx` — Pakai Server Action

### File: `src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx`

Replace seluruh isi. Hapus semua kode PostgREST langsung. Pakai server action dari Task 3.

Key changes:
- Import `getStudentMateriProgress` dari `../actions/materi`
- State: `grouped` (Record), `loading`, `academicYears`, `selectedYearId`, `selectedSemester`
- `useEffect` mount: load years + active year via `Promise.all([getAcademicYears(), getActiveAcademicYear()])`
- `useCallback fetchProgress`: panggil `getStudentMateriProgress(studentId, selectedYearId, Number(selectedSemester))`
- Render: filter row (Tahun Ajaran + Semester) → grouped tables per kategori

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import InputFilter from '@/components/form/input/InputFilter'
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'
import { getStudentMateriProgress, type StudentMateriProgressItem } from '../actions/materi'

interface MateriViewProps {
    studentId: string
}

export default function MateriView({ studentId }: MateriViewProps) {
    const [grouped, setGrouped] = useState<Record<string, StudentMateriProgressItem[]>>({})
    const [loading, setLoading] = useState(true)
    const [academicYears, setAcademicYears] = useState<{ value: string; label: string }[]>([])
    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1')

    useEffect(() => {
        Promise.all([
            getAcademicYears(),
            getActiveAcademicYear(),
        ]).then(([years, activeYear]) => {
            setAcademicYears(years.map(y => ({ value: y.id, label: y.name })))
            if (activeYear) setSelectedYearId(activeYear.id)
        })
    }, [])

    const fetchProgress = useCallback(async () => {
        if (!selectedYearId) return
        setLoading(true)
        const result = await getStudentMateriProgress(studentId, selectedYearId, Number(selectedSemester))
        setGrouped(result.grouped)
        setLoading(false)
    }, [studentId, selectedYearId, selectedSemester])

    useEffect(() => {
        fetchProgress()
    }, [fetchProgress])

    const categories = Object.keys(grouped)

    return (
        <div className="space-y-4">
            {/* Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="grid grid-cols-2 gap-4">
                    <InputFilter
                        id="year-filter"
                        label="Tahun Ajaran"
                        value={selectedYearId}
                        onChange={setSelectedYearId}
                        options={academicYears}
                        placeholder="Pilih Tahun"
                        compact
                    />
                    <InputFilter
                        id="semester-filter"
                        label="Semester"
                        value={selectedSemester}
                        onChange={(v) => setSelectedSemester(v as '1' | '2')}
                        options={[
                            { value: '1', label: 'Semester 1' },
                            { value: '2', label: 'Semester 2' },
                        ]}
                        compact
                    />
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl" />
                    ))}
                </div>
            ) : categories.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-12 text-center shadow-sm">
                    <p className="text-gray-500 dark:text-gray-400">Belum ada data pencapaian materi</p>
                </div>
            ) : (
                categories.map(category => {
                    const items = grouped[category]
                    const tuntasCount = items.filter(i => i.nilai !== null && i.nilai >= 70).length
                    return (
                        <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                    {category}
                                </span>
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400">
                                    {tuntasCount}/{items.length} tuntas
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {items.map(item => (
                                            <tr key={item.material_item_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-900 dark:text-white">{item.material_name}</div>
                                                    <div className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">{item.type_name}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex flex-col items-end">
                                                        <div className={`text-base font-bold ${item.colorClass}`}>
                                                            {item.nilai !== null ? item.nilai : '—'}
                                                        </div>
                                                        <div className={`text-[10px] font-bold uppercase ${item.colorClass}`}>
                                                            {item.grade !== '-' ? `Predikat ${item.grade}` : 'Belum Dinilai'}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )
}
```

Test: `npm run test:run` → harus pass. Lalu cek di browser tab Materi muncul data.

---

## TASK 5 — Tambah Kolom Action di `MateriDataTable` per_siswa

### File: `src/app/(admin)/laporan/components/MateriDataTable.tsx`

**Perubahan:**

1. Tambah imports di atas file:
```tsx
import Link from 'next/link'
import { ReportIcon } from '@/lib/icons'
```

2. Di `columns` useMemo, untuk `per_siswa` tambah kolom `actions` di depan:
```tsx
return [
    { key: 'actions', label: 'Detail', align: 'center' as const, width: '24' },
    { key: 'student_name', label: 'Nama Siswa', sortable: true, align: 'left' as const },
    { key: 'percentage', label: 'Tercapai', sortable: true, align: 'center' as const },
    { key: 'avg_nilai', label: 'Nilai', sortable: true, align: 'center' as const, className: 'hidden md:table-cell' },
]
```

3. Di `renderCell`, dalam blok `if (viewMode === 'per_siswa')`, tambah case `actions` sebelum `student_name`:
```tsx
case 'actions':
    return (
        <Link
            href={`/users/siswa/${row.student_id}/materi`}
            className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-300 block"
            title="Lihat Pencapaian Materi"
        >
            <ReportIcon className="w-6 h-6 mx-auto" />
        </Link>
    )
```

Test: `npm run type-check` → bersih. Cek di laporan tab Materi → Per Siswa → icon muncul.

---

## Verification Checklist

- [ ] Tab label "Profil" (bukan "Profile")
- [ ] Layout tidak ada double padding/background
- [ ] Tab Materi → data tampil grouped per kategori dengan nilai & predikat
- [ ] Tab Materi → loading skeleton saat fetch, empty state jika tidak ada data
- [ ] Laporan tab Materi → Per Siswa → icon kuning → klik → `/materi` siswa
- [ ] `npm run type-check` → bersih
- [ ] `npm run test:run` → pass

---

## Tidak Berubah

- `StudentsTable.tsx` — href ke root `[studentId]` sudah benar (tab Profil)
- `laporan/DataTable.tsx` — sudah diupdate ke `/presensi` oleh Antigravity
- `presensi/page.tsx` — sudah bersih
- `IkhtisarView.tsx` — field names sudah cocok
- Sidebar siswa — issue terpisah

## Commit Message Template

```
fix(siswa): fix materi tab data, label Profil, tambah link detail materi di laporan

- MateriView: ganti PostgREST nested join → server action (fix data kosong)  
- layout.tsx: hapus outer wrapper redundant
- StudentTabHeader: label "Profile" → "Profil"
- MateriDataTable: tambah kolom action per_siswa → link ke /materi

Fixes GH-#58

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
