# Plan: Student Detail Sidebar — Navigasi Cepat Antar Siswa

## Context

Saat guru membuka halaman detail siswa (`/users/siswa/[studentId]`), tidak ada cara cepat untuk berpindah ke siswa lain tanpa back ke list. Fitur ini menambah sidebar (desktop: panel kiri, mobile: drawer) berisi daftar siswa yang bisa diakses user — dengan filter kelas dan data kontekstual sesuai role — mengikuti pattern yang sudah ada di monitoring dan rapot.

Beads: sm-4n5 | GH: https://github.com/abuabdirohman4/generus-mandiri/issues/73

---

## Scope & Behavior

- **Data siswa**: nama + kelas. Tampilkan info org tambahan sesuai role:
  - teacher/admin kelompok: nama + kelas saja
  - admin desa: nama + kelas + kelompok
  - admin daerah / superadmin: nama + kelas + kelompok + desa
- **Scope**: semua siswa yang boleh diakses user (via `getAllStudents()` yang sudah ada — sudah handle RLS + teacher scope)
- **Filter kelas**: dropdown di atas list, default ke kelas siswa yang sedang dilihat
- **Search**: real-time filter by nama
- **Navigasi**: `router.replace()` ke `/users/siswa/[newStudentId]` — konsisten dengan tab navigation
- **Mobile trigger**: hamburger icon `≡` di kiri `StudentTabHeader`
- **Sidebar auto-close** di mobile setelah pilih siswa

---

## Files yang Dimodifikasi / Dibuat

| File | Action |
|------|--------|
| `src/app/(admin)/users/siswa/[studentId]/actions/sidebar.ts` | NEW — server action fetch siswa untuk sidebar |
| `src/app/(admin)/users/siswa/[studentId]/components/StudentSidebar.tsx` | NEW — sidebar component |
| `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx` | EDIT — tambah hamburger + `onSidebarToggle` prop |
| `src/app/(admin)/users/siswa/[studentId]/layout.tsx` | EDIT — tambah sidebar state + StudentSidebar render |

---

## TASK 1 — Server Action: `actions/sidebar.ts`

**File baru**: `src/app/(admin)/users/siswa/[studentId]/actions/sidebar.ts`

```ts
'use server'

import { getAllStudents } from '@/app/(admin)/users/siswa/actions/students/actions'
import { getCurrentUserProfile } from '@/lib/accessControlServer'

export interface SidebarStudent {
    id: string
    name: string
    class_id: string | null
    class_name: string | null
    kelompok_name: string | null
    desa_name: string | null
}

export async function getStudentsForSidebar(): Promise<SidebarStudent[]> {
    const profile = await getCurrentUserProfile()
    if (!profile) return []

    // getAllStudents sudah handle RLS + teacher scope, tidak perlu classId filter
    const students = await getAllStudents()

    return students.map(s => ({
        id: s.id,
        name: s.name,
        class_id: s.class_id || null,
        class_name: s.class_name || null,
        kelompok_name: s.kelompok_name || null,
        desa_name: s.desa_name || null,
    }))
}
```

> Cek apakah `StudentWithClasses` (tipe return `getAllStudents`) punya field `kelompok_name` dan `desa_name`. Jika tidak, tambah query join di action ini menggunakan `createClient()` langsung.
>
> Fallback: Jika `getAllStudents` tidak return org info, buat query baru di file ini (bukan modifikasi `getAllStudents` yang sudah kompleks):

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { getTeacherAllowedClassIds } from '@/app/(admin)/users/siswa/actions/students/actions'

export interface SidebarStudent {
    id: string
    name: string
    class_id: string | null
    class_name: string | null
    kelompok_name: string | null
    desa_name: string | null
}

export async function getStudentsForSidebar(): Promise<SidebarStudent[]> {
    const profile = await getCurrentUserProfile()
    if (!profile) return []

    const supabase = await createClient()

    let query = supabase
        .from('students')
        .select(`
            id, name, class_id,
            classes:class_id(
                name,
                kelompok:kelompok_id(
                    name,
                    desa:desa_id(name)
                )
            )
        `)
        .is('deleted_at', null)
        .eq('status', 'active')

    // Scope filter sesuai role
    if (profile.role === 'teacher') {
        const allowedClassIds = await getTeacherAllowedClassIds(profile.id)
        if (allowedClassIds.length === 0) return []
        query = query.in('class_id', allowedClassIds)
    } else if (profile.role === 'admin' && profile.kelompok_id) {
        // admin kelompok: filter by kelompok via class
        const { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('kelompok_id', profile.kelompok_id)
        const classIds = (classes || []).map((c: any) => c.id)
        if (classIds.length === 0) return []
        query = query.in('class_id', classIds)
    } else if (profile.role === 'admin' && profile.desa_id) {
        const { data: classes } = await supabase
            .from('classes')
            .select('id, kelompok:kelompok_id(desa_id)')
            .eq('kelompok.desa_id', profile.desa_id)
        const classIds = (classes || []).map((c: any) => c.id)
        if (classIds.length === 0) return []
        query = query.in('class_id', classIds)
    }

    const { data } = await query.order('name')

    return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        class_id: s.class_id || null,
        class_name: s.classes?.name || null,
        kelompok_name: s.classes?.kelompok?.name || null,
        desa_name: s.classes?.kelompok?.desa?.name || null,
    }))
}
```

> Pilih implementasi mana yang cocok berdasarkan hasil cek `StudentWithClasses` type.

### Jalankan test

`npm run test:run` → PASS.

---

## TASK 2 — Component: `StudentSidebar.tsx`

**File baru**: `src/app/(admin)/users/siswa/[studentId]/components/StudentSidebar.tsx`

Ikuti **exact pattern** dari `src/app/(admin)/monitoring/components/StudentSidebar.tsx` — mobile drawer + desktop panel — tapi lebih sederhana (tidak ada metrics materi).

```tsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { SidebarStudent } from '../actions/sidebar'

interface StudentSidebarProps {
    students: SidebarStudent[]
    currentStudentId: string
    isOpen: boolean
    onClose: () => void
    userRole: string
}

export default function StudentSidebar({
    students, currentStudentId, isOpen, onClose, userRole
}: StudentSidebarProps) {
    const router = useRouter()
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedClassId, setSelectedClassId] = useState<string | 'all'>('all')

    // Init class filter ke kelas siswa saat ini setelah data load
    useEffect(() => {
        const s = students.find(s => s.id === currentStudentId)
        if (s?.class_id) setSelectedClassId(s.class_id)
    }, [currentStudentId, students])

    const classes = useMemo(() => {
        const map = new Map<string, string>()
        students.forEach(s => {
            if (s.class_id && s.class_name) map.set(s.class_id, s.class_name)
        })
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name))
    }, [students])

    const filtered = useMemo(() => {
        let list = students
        if (selectedClassId !== 'all') list = list.filter(s => s.class_id === selectedClassId)
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(s => s.name.toLowerCase().includes(q))
        }
        return list.sort((a, b) => a.name.localeCompare(b.name))
    }, [students, selectedClassId, searchQuery])

    const handleSelect = (studentId: string) => {
        if (studentId === currentStudentId) return
        router.replace(`/users/siswa/${studentId}`)
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            onClose()
        }
    }

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
            )}

            <div className={`
                fixed lg:relative inset-y-0 left-0
                w-72 bg-white dark:bg-gray-800
                border-r border-gray-200 dark:border-gray-700
                transform transition-transform duration-300 ease-in-out
                z-50 lg:z-0 flex flex-col
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Pilih Siswa</h2>
                    <button onClick={onClose} className="lg:hidden text-gray-500">✕</button>
                </div>

                <div className="px-3 pt-3">
                    <select
                        value={selectedClassId}
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                    >
                        <option value="all">Semua Kelas</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="px-3 py-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari siswa..."
                        className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"
                    />
                </div>

                <div className="flex-1 overflow-y-auto">
                    {filtered.map(student => {
                        const isActive = student.id === currentStudentId
                        const orgLine = userRole === 'superadmin' || userRole === 'admin'
                            ? [student.kelompok_name, student.desa_name].filter(Boolean).join(' · ')
                            : student.kelompok_name || null
                        return (
                            <button
                                key={student.id}
                                onClick={() => handleSelect(student.id)}
                                className={`
                                    w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700
                                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                                    ${isActive ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-l-brand-500' : ''}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm font-medium text-brand-700 dark:text-brand-300 shrink-0">
                                        {student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>
                                            {student.name}
                                        </p>
                                        {student.class_name && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                                {student.class_name}
                                                {orgLine ? ` · ${orgLine}` : ''}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                    {filtered.length === 0 && (
                        <p className="text-center text-sm text-gray-400 py-8">Tidak ada siswa</p>
                    )}
                </div>
            </div>
        </>
    )
}
```

### Jalankan test

`npm run test:run` → PASS.

---

## TASK 3 — Edit `StudentTabHeader.tsx`: tambah hamburger button

**File**: `src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx`

Tambah prop `onSidebarToggle` ke props interface dan hamburger button di render.

**Tambah ke props interface:**
```ts
interface StudentTabHeaderProps {
    studentId: string
    onSidebarToggle?: () => void
}
```

**Tambah hamburger di render (sebelum tab list, atau di awal flex container):**
```tsx
{onSidebarToggle && (
    <button
        onClick={onSidebarToggle}
        className="lg:hidden mr-2 p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400"
        aria-label="Buka daftar siswa"
    >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
    </button>
)}
```

### Jalankan test

`npm run test:run` → PASS.

---

## TASK 4 — Edit `layout.tsx`: wiring state + SWR + render

**File**: `src/app/(admin)/users/siswa/[studentId]/layout.tsx`

Baca file ini dulu untuk memahami struktur saat ini. Kemudian:
1. Tambah import `useSWR`, `StudentSidebar`, `getStudentsForSidebar`, `getCurrentUserRole`
2. Tambah state `sidebarOpen`
3. Tambah SWR fetch untuk `students` dan `userRole`
4. Wrap children dalam flex layout dengan `<StudentSidebar>` di kiri

```tsx
'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import StudentTabHeader from './components/StudentTabHeader'
import StudentSidebar from './components/StudentSidebar'
import { getStudentsForSidebar } from './actions/sidebar'
import { getCurrentUserRole } from '@/app/(admin)/users/siswa/actions/students/actions'

export default function StudentDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    const [sidebarOpen, setSidebarOpen] = useState(false)

    const { data: students = [] } = useSWR(
        'sidebar-students',
        () => getStudentsForSidebar(),
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    )

    const { data: userRole = '' } = useSWR(
        'current-user-role',
        () => getCurrentUserRole(),
        { revalidateOnFocus: false }
    )

    return (
        <div className="flex h-full">
            <StudentSidebar
                students={students}
                currentStudentId={studentId}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                userRole={userRole ?? ''}
            />
            <div className="flex-1 min-w-0">
                <StudentTabHeader
                    studentId={studentId}
                    onSidebarToggle={() => setSidebarOpen(prev => !prev)}
                />
                {children}
            </div>
        </div>
    )
}
```

> **Note**: SWR key `'sidebar-students'` dengan `dedupingInterval: 60000` — data tidak perlu fresh setiap mount. `getCurrentUserRole()` sudah ada di `actions/students/actions.ts`.

### Jalankan test + type-check

`npm run test:run` → PASS. `npm run type-check` → bersih.

---

## Verification

- [ ] Desktop: sidebar tampil sebagai panel kiri permanen (lg:relative)
- [ ] Mobile: hamburger muncul di kiri tab header, tap → drawer slide dari kiri
- [ ] Klik siswa lain → navigasi ke `/users/siswa/[newId]`, tab aktif tidak reset
- [ ] Filter kelas default ke kelas siswa saat ini
- [ ] Search nama bekerja
- [ ] Admin desa: tampil kolom kelompok di bawah nama
- [ ] Admin daerah/superadmin: tampil kelompok + desa
- [ ] `npm run type-check` → bersih
- [ ] `npm run test:run` → pass

---

## Commit Message Template

```
feat(siswa): tambah sidebar navigasi antar siswa di halaman detail

- StudentSidebar: panel kiri (desktop) / drawer (mobile) dengan search + filter kelas
- Layout: wiring SWR untuk fetch students + state sidebar open/close
- StudentTabHeader: tambah hamburger toggle untuk mobile
- Sidebar menampilkan org info sesuai role (kelompok/desa untuk admin)

fixes #73

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Pattern sidebar (mobile drawer + desktop panel) sudah ada di monitoring dan rapot — tidak ada pattern baru
- [ ] `getCurrentUserRole()` sudah ada di `actions/students/actions.ts`
- [ ] SWR key `sidebar-students` tidak konflik dengan key yang ada
- [ ] Tidak ada tabel/route baru
