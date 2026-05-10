# Plan: sm-mf8 — Tab Navigation Loading Indicator + SWR Cache untuk MateriView

## Context

Perpindahan antar tab di `/users/siswa/[studentId]/` terasa "stuck" karena:
1. Tidak ada visual feedback saat navigasi route sedang berjalan
2. `MateriView` pakai `useState` + manual fetch — data tidak di-cache, setiap kunjungan ulang fetch lagi

Dua perbaikan:
- **Loading indicator di tab**: saat user klik tab, spinner muncul di tab tersebut sampai konten halaman baru mount
- **SWR cache di MateriView**: ganti manual fetch → `useSWR`, kunjungan kedua ke tab Materi = instant

---

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` | MODIF — tambah loading state + spinner |
| `src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx` | MODIF — ganti useState+fetch → useSWR |

---

## TASK 1 — Loading Indicator di Tab Header

### File: `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx`

Replace seluruh isi dengan implementasi berikut. Perubahan utama:
- Tambah `useRouter` + `useState<string | null>(null)` untuk `loadingHref`
- `useEffect` watch `pathname` → clear `loadingHref` saat route selesai
- `handleTabClick`: intercept click, set `loadingHref`, panggil `router.push()`
- Render spinner kecil (`animate-spin`) di tab yang loading

```tsx
'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

interface StudentTabHeaderProps {
    studentId: string
}

type TabItem = {
    label: string
    href: string
    match: string
}

export default function StudentTabHeader({ studentId }: StudentTabHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [loadingHref, setLoadingHref] = useState<string | null>(null)

    // Clear loading state when route actually changes (new page mounted)
    useEffect(() => {
        setLoadingHref(null)
    }, [pathname])

    const tabs: TabItem[] = [
        { label: 'Profil', href: `/users/siswa/${studentId}`, match: `/${studentId}` },
        { label: 'Presensi', href: `/users/siswa/${studentId}/presensi`, match: '/presensi' },
        { label: 'Materi', href: `/users/siswa/${studentId}/materi`, match: '/materi' },
        { label: 'Biodata', href: `/users/siswa/${studentId}/biodata`, match: '/biodata' },
    ]

    const isActive = (tab: TabItem) => {
        if (tab.match === `/${studentId}`) {
            return pathname === `/users/siswa/${studentId}`
        }
        return pathname.includes(tab.match)
    }

    const handleTabClick = (e: React.MouseEvent, tab: TabItem) => {
        if (isActive(tab)) return
        e.preventDefault()
        setLoadingHref(tab.href)
        router.push(tab.href)
    }

    return (
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6 overflow-x-auto no-scrollbar">
            {tabs.map((tab) => {
                const active = isActive(tab)
                const loading = loadingHref === tab.href

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={(e) => handleTabClick(e, tab)}
                        className={`relative px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                            active
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : loading
                                    ? 'border-brand-300 text-brand-400 dark:text-brand-500'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }`}
                    >
                        <span className={loading ? 'opacity-60' : ''}>{tab.label}</span>
                        {loading && (
                            <span className="ml-1.5 inline-block w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin align-middle" />
                        )}
                    </Link>
                )
            })}
        </div>
    )
}
```

Update `StudentTabHeader.test.tsx` jika ada assertion yang break. Jalankan `npm run test:run`.

---

## TASK 2 — Ganti MateriView ke useSWR

### File: `src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx`

Replace seluruh isi. Perubahan utama:
- Hapus `useCallback`, `fetchProgress` manual, dan `useEffect` untuk fetch
- Tambah `import useSWR from 'swr'`
- SWR key: `student-materi-${studentId}-${selectedYearId}-${selectedSemester}` (null jika yearId belum siap)
- SWR config: `revalidateOnFocus: false`, `revalidateOnReconnect: false`, `keepPreviousData: true`
- Loading condition: `isLoading && categories.length === 0` (skeleton hanya saat benar-benar kosong)

```tsx
'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import InputFilter from '@/components/form/input/InputFilter'
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'
import { getStudentMateriProgress, type StudentMateriProgressItem } from '../actions/materi'

interface MateriViewProps {
    studentId: string
}

export default function MateriView({ studentId }: MateriViewProps) {
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

    const swrKey = selectedYearId
        ? `student-materi-${studentId}-${selectedYearId}-${selectedSemester}`
        : null

    const { data, isLoading } = useSWR(
        swrKey,
        () => getStudentMateriProgress(studentId, selectedYearId, Number(selectedSemester)),
        {
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
            keepPreviousData: true,
        }
    )

    const grouped = data?.grouped ?? {}
    const categories = Object.keys(grouped)

    return (
        <div className="space-y-4">
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

            {isLoading && categories.length === 0 ? (
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

Jalankan `npm run test:run` → pass. Lalu `npm run type-check` → bersih.

---

## Verification

- [ ] Klik tab yang belum aktif → spinner muncul di tab tersebut
- [ ] Setelah konten mount → spinner hilang, tab aktif
- [ ] Klik tab yang sudah aktif → tidak ada efek
- [ ] Tab Materi pertama kali → skeleton loading
- [ ] Pindah tab lain → kembali ke Materi = instant (tanpa loading)
- [ ] Ganti semester → data lama tetap tampil sementara fetch baru berjalan
- [ ] `npm run type-check` → bersih
- [ ] `npm run test:run` → pass

## Commit Message Template

```
feat(siswa): tambah loading indicator tab + SWR cache untuk MateriView

- StudentTabHeader: spinner di tab saat navigasi, hilang saat route selesai
- MateriView: ganti useState+fetch → useSWR (cache per student/year/semester)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
