# Plan: [sm-NEW] Student Detail Page — Tab Structure + Ikhtisar

## Context

`/users/siswa/[studentId]/` saat ini hanya punya 2 halaman terpisah tanpa tab:
- Root (`/[studentId]`) → attendance calendar (konten presensi langsung)
- `/biodata` → biodata siswa

User ingin menambah tab **Materi** (pencapaian per siswa) dan tab **Ikhtisar** (summary ringkasan). Supaya struktur konsisten dan fondasi kuat untuk akun siswa kedepan, perlu refactor menjadi tab-based layout dengan 4 tab:

| Tab | Route | Konten |
|-----|-------|--------|
| Ikhtisar | `/[studentId]` | Summary: info dasar + ringkasan presensi + ringkasan materi |
| Presensi | `/[studentId]/presensi` | Konten attendance calendar yang sekarang ada di root |
| Materi | `/[studentId]/materi` | Pencapaian materi per siswa (baru) |
| Biodata | `/[studentId]/biodata` | Sudah ada, tidak berubah |

---

## Files yang Dimodifikasi/Dibuat

| File | Action |
|------|--------|
| `src/app/(admin)/users/siswa/[studentId]/layout.tsx` | MODIF — jadikan client component, tambah tab nav |
| `src/app/(admin)/users/siswa/[studentId]/page.tsx` | MODIF — jadikan halaman Ikhtisar (summary) |
| `src/app/(admin)/users/siswa/[studentId]/presensi/page.tsx` | BARU — pindah konten dari root page.tsx |
| `src/app/(admin)/users/siswa/[studentId]/materi/page.tsx` | BARU — pencapaian materi per siswa |
| `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` | BARU — tab nav component |
| `src/app/(admin)/users/siswa/[studentId]/components/IkhtisarView.tsx` | BARU — summary content |
| `src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx` | BARU — materi content |
| `src/app/(admin)/users/siswa/components/StudentsTable.tsx` | MODIF — update link ke `/presensi` |
| `src/app/(admin)/laporan/components/DataTable.tsx` | MODIF — update link ke `/presensi` |

---

## TASK 1 — Buat `StudentTabHeader` Component

### File: `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` (BARU)

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface StudentTabHeaderProps {
    studentId: string
}

type TabItem = {
    label: string
    href: string
    match: string // pathname segment to match for active state
}

export default function StudentTabHeader({ studentId }: StudentTabHeaderProps) {
    const pathname = usePathname()

    const tabs: TabItem[] = [
        { label: 'Ikhtisar', href: `/users/siswa/${studentId}`, match: `/${studentId}` },
        { label: 'Presensi', href: `/users/siswa/${studentId}/presensi`, match: '/presensi' },
        { label: 'Materi', href: `/users/siswa/${studentId}/materi`, match: '/materi' },
        { label: 'Biodata', href: `/users/siswa/${studentId}/biodata`, match: '/biodata' },
    ]

    const isActive = (tab: TabItem) => {
        if (tab.match === `/${studentId}`) {
            // Root tab — active only when no sub-segment
            return pathname === `/users/siswa/${studentId}`
        }
        return pathname.includes(tab.match)
    }

    return (
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
            {tabs.map((tab) => (
                <Link
                    key={tab.href}
                    href={tab.href}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                        isActive(tab)
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                    }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    )
}
```

---

## TASK 2 — Update `layout.tsx` untuk Render Tab Header

### File: `src/app/(admin)/users/siswa/[studentId]/layout.tsx`

Jadikan client component supaya bisa baca params dan render `StudentTabHeader`.

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

**Catatan**: Metadata export dihapus dari layout (client component tidak bisa export metadata). Metadata bisa dipindah ke masing-masing `page.tsx` jika dibutuhkan, atau dihapus saja karena tidak kritikal.

---

## TASK 3 — Pindah Konten Root ke `presensi/page.tsx`

### File: `src/app/(admin)/users/siswa/[studentId]/presensi/page.tsx` (BARU)

Salin **seluruh konten** dari `src/app/(admin)/users/siswa/[studentId]/page.tsx` yang sekarang (230 baris, attendance calendar) ke file baru ini. Tidak ada perubahan logika — hanya pindah file.

**Back button update**: Di konten yang dipindah, back button `router.push('/users/siswa')` dan `/laporan` tetap sama — tidak perlu diubah karena context `from=laporan` masih relevan.

---

## TASK 4 — Buat Halaman Ikhtisar (Root `page.tsx`)

### File: `src/app/(admin)/users/siswa/[studentId]/page.tsx` (MODIF — replace content)

Halaman ini menggantikan konten attendance yang dipindah ke `/presensi`. Konten: summary card 3 section.

```tsx
'use client'

import { use } from 'react'
import IkhtisarView from './components/IkhtisarView'

export default function StudentIkhtisarPage({
    params,
}: {
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    return <IkhtisarView studentId={studentId} />
}
```

### File: `src/app/(admin)/users/siswa/[studentId]/components/IkhtisarView.tsx` (BARU)

Gunakan `useStudentDetail` hook yang sudah ada untuk data presensi. Untuk data materi, buat query sederhana (fetch `student_material_progress` count tuntas).

```tsx
'use client'

import { useStudentDetail } from '../hooks/useStudentDetail'

interface IkhtisarViewProps {
    studentId: string
}

export default function IkhtisarView({ studentId }: IkhtisarViewProps) {
    const { studentInfo, stats, isLoading } = useStudentDetail(studentId)

    if (isLoading) return <IkhtisarSkeleton />

    return (
        <div className="space-y-6">
            {/* Info Dasar */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl font-bold text-gray-500">
                        {studentInfo?.name?.charAt(0) ?? '?'}
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {studentInfo?.name ?? '—'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {studentInfo?.class_name ?? '—'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Ringkasan Presensi */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4">Ringkasan Presensi</h3>
                <div className="grid grid-cols-3 gap-4">
                    <StatCard label="Hadir" value={stats?.present ?? 0} color="text-green-600" />
                    <StatCard label="Absen" value={stats?.absent ?? 0} color="text-red-600" />
                    <StatCard label="Izin" value={stats?.excused ?? 0} color="text-yellow-600" />
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="text-center">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{label}</div>
        </div>
    )
}

function IkhtisarSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            <div className="h-28 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
    )
}
```

**Catatan**: Ringkasan materi bisa ditambahkan di iterasi berikutnya setelah tab `/materi` selesai. Untuk MVP Ikhtisar, fokus pada info dasar + ringkasan presensi saja.

---

## TASK 5 — Buat `materi/page.tsx` (Pencapaian Materi Per Siswa)

### File: `src/app/(admin)/users/siswa/[studentId]/materi/page.tsx` (BARU)

Data: ambil dari `student_material_progress` dimana `student_id = studentId`. Group by kategori → tampilkan per materi dengan nilai dan status tuntas/belum.

```tsx
'use client'

import { use } from 'react'
import MateriView from '../components/MateriView'

export default function StudentMateriPage({
    params,
}: {
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    return <MateriView studentId={studentId} />
}
```

### File: `src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx` (BARU)

Filter: Tahun Ajaran + Semester (wajib), Kategori (opsional).

Query: `student_material_progress` → join `material_items` → join `material_types` + `material_categories`.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import InputFilter from '@/components/form/input/InputFilter'
import { getAcademicYears, getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years'

interface MateriProgress {
    material_item_id: string
    material_name: string
    category_name: string
    type_name: string
    nilai: number | null
    tuntas: boolean  // nilai >= 70
    semester: number
    academic_year_id: string
}

interface MateriViewProps {
    studentId: string
}

export default function MateriView({ studentId }: MateriViewProps) {
    const [progress, setProgress] = useState<MateriProgress[]>([])
    const [loading, setLoading] = useState(true)
    const [academicYears, setAcademicYears] = useState<{ value: string; label: string }[]>([])
    const [selectedYearId, setSelectedYearId] = useState('')
    const [selectedSemester, setSelectedSemester] = useState<'1' | '2'>('1')

    useEffect(() => {
        getAcademicYears().then(years => {
            setAcademicYears(years.map(y => ({ value: y.id, label: y.name })))
        })
        getActiveAcademicYear().then(year => {
            if (year) setSelectedYearId(year.id)
        })
    }, [])

    useEffect(() => {
        if (!selectedYearId) return
        fetchProgress()
    }, [studentId, selectedYearId, selectedSemester])

    const fetchProgress = async () => {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('student_material_progress')
            .select(`
                material_item_id,
                nilai,
                semester,
                academic_year_id,
                material_items(
                    name,
                    material_types(name, material_categories(name))
                )
            `)
            .eq('student_id', studentId)
            .eq('academic_year_id', selectedYearId)
            .eq('semester', Number(selectedSemester))

        if (data) {
            setProgress(data.map((row: any) => ({
                material_item_id: row.material_item_id,
                material_name: row.material_items?.name ?? '—',
                category_name: row.material_items?.material_types?.material_categories?.name ?? '—',
                type_name: row.material_items?.material_types?.name ?? '—',
                nilai: row.nilai,
                tuntas: (row.nilai ?? 0) >= 70,
                semester: row.semester,
                academic_year_id: row.academic_year_id,
            })))
        }
        setLoading(false)
    }

    // Group by category
    const grouped = progress.reduce((acc, item) => {
        if (!acc[item.category_name]) acc[item.category_name] = []
        acc[item.category_name].push(item)
        return acc
    }, {} as Record<string, MateriProgress[]>)

    return (
        <div className="space-y-4">
            {/* Filter */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
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

            {/* Table per kategori */}
            {loading ? (
                <div className="animate-pulse space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
                </div>
            ) : Object.keys(grouped).length === 0 ? (
                <div className="text-center py-12 text-gray-400">Belum ada data pencapaian materi</div>
            ) : (
                Object.entries(grouped).map(([category, items]) => {
                    const tuntasCount = items.filter(i => i.tuntas).length
                    return (
                        <div key={category} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{category}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">{tuntasCount}/{items.length} tuntas</span>
                            </div>
                            <table className="w-full text-sm">
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {items.map(item => (
                                        <tr key={item.material_item_id}>
                                            <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{item.material_name}</td>
                                            <td className="px-4 py-2.5 text-gray-500 dark:text-gray-400 text-xs">{item.type_name}</td>
                                            <td className="px-4 py-2.5 text-right font-medium">
                                                {item.nilai !== null ? (
                                                    <span className={item.tuntas ? 'text-green-600' : 'text-red-500'}>
                                                        {item.nilai}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                })
            )}
        </div>
    )
}
```

---

## TASK 6 — Update Navigation Sources

### File: `src/app/(admin)/users/siswa/components/StudentsTable.tsx`

Cari link ke `href={`/users/siswa/${student.id}`}` (attendance icon + student name — **bukan** biodata link), update ke:

```tsx
// SEBELUM:
href={`/users/siswa/${student.id}`}

// SESUDAH:
href={`/users/siswa/${student.id}/presensi`}
```

**Hati-hati**: Biodata link (`/users/siswa/${student.id}/biodata`) TIDAK diubah.

Ada 2 link yang perlu diupdate:
- Line ~327: Report icon (Lihat Absensi)
- Line ~473: Student name click

### File: `src/app/(admin)/laporan/components/DataTable.tsx`

Update 2 link dari laporan (student name + report icon):

```tsx
// SEBELUM:
href={`/users/siswa/${item.student_id}?month=${filters.month}&year=${filters.year}&from=laporan`}

// SESUDAH:
href={`/users/siswa/${item.student_id}/presensi?month=${filters.month}&year=${filters.year}&from=laporan`}
```

---

## TASK 7 — Update Back Navigation di `presensi/page.tsx`

Setelah konten dipindah ke `presensi/page.tsx`, cek back button logic:
- `router.push('/users/siswa')` → tetap sama ✅
- `router.push('/laporan')` (jika `from=laporan`) → tetap sama ✅

Tidak ada perubahan diperlukan untuk back navigation.

---

## Verification

1. `/users/siswa/[studentId]` → tampil halaman Ikhtisar dengan info siswa + ringkasan presensi
2. Tab "Presensi" → attendance calendar (sama seperti sebelumnya)
3. Tab "Materi" → filter tahun ajaran + semester, tabel per kategori dengan nilai dan status tuntas
4. Tab "Biodata" → biodata view (tidak berubah)
5. Klik nama siswa di `/users/siswa` → redirect ke `/presensi` tab
6. Klik report icon di `/laporan` → redirect ke `/presensi` tab dengan month/year params
7. Tab highlight aktif sesuai route yang sedang dibuka
8. `npm run type-check` → bersih

---

## CLAUDE.md Check
- [x] Route baru? → `/presensi` dan `/materi` di bawah `[studentId]` — pattern sudah ada
- [x] Pattern baru? → Tab di layout.tsx (client component layout) — perlu didokumentasikan
- [ ] Tabel baru? → Tidak
- [ ] Permission pattern baru? → Tidak

## Commit Message Template

```
feat(siswa): refactor student detail into tab layout with Ikhtisar, Presensi, Materi, Biodata tabs

- layout.tsx jadi client component dengan StudentTabHeader
- Root [studentId] → Ikhtisar (summary info + ringkasan presensi)
- /presensi → konten attendance calendar (pindah dari root)
- /materi → pencapaian materi per siswa dengan filter tahun/semester
- Update navigation links di StudentsTable dan laporan DataTable

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
