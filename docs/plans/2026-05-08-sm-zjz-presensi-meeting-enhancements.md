# Plan: Search, Sort, Kolom Kelompok/Desa, Pagination & Dirty State di Presensi Meeting

**Issue:** sm-zjz  
**Priority:** P2  
**Type:** Feature

---

## Context

Halaman presensi meeting (`/presensi/[meetingId]`) perlu ditingkatkan untuk mendukung meeting dengan 200+ peserta. Saat ini table hanya punya kolom Nama + H/I/S/A tanpa pagination. Fitur baru: search nama, kolom Kelompok/Desa (role-conditional di kanan HISA), sorting header, column visibility toggle, pagination 25/page, dan dirty state indicator pada tombol Save.

---

## Files yang Diubah

| File | Perubahan |
|------|-----------|
| `src/app/(admin)/presensi/actions/attendance/queries.ts` | Tambah join kelompok + desa ke query |
| `src/app/(admin)/presensi/hooks/useMeetingAttendance.ts` | Extend Student interface + extract kelompok/desa name |
| `src/app/(admin)/presensi/actions/attendance/actions.ts` | Extend transform di `getStudentsFromSnapshot` |
| `src/app/(admin)/presensi/stores/presensiAttendanceStore.ts` | File baru — Zustand persist untuk column visibility |
| `src/app/(admin)/presensi/components/AttendanceTable.tsx` | Search, sort, pagination, kolom baru, ColumnToggle slot |
| `src/app/(admin)/presensi/[meetingId]/page.tsx` | ColumnToggle integration, column visibility state, dirty state |
| `src/lib/userUtils.ts` | Tambah clear `presensi-attendance-storage` di `clearUserCache()` |

---

## Task 1 — Update Query Supabase

**File:** `src/app/(admin)/presensi/actions/attendance/queries.ts`

### 1a. `fetchAttendanceByMeeting`

Cari fungsi ini dengan grep:
```bash
grep -n "fetchAttendanceByMeeting" src/app/\(admin\)/presensi/actions/attendance/queries.ts
```

Pada bagian `.select(...)` di dalam students, tambahkan join kelompok langsung dari students dan desa via kelompok:

```typescript
// Di dalam select students (...), tambah:
kelompok:kelompok_id (id, name, desa:desa_id (id, name)),
```

Hasil akhir bagian students:
```typescript
students (
  id,
  name,
  gender,
  class_id,
  kelompok_id,
  kelompok:kelompok_id (id, name, desa:desa_id (id, name)),  // TAMBAH
  classes (id, name),
  student_classes (
    class_id,
    classes:class_id (
      id,
      name,
      kelompok_id,
      kelompok:kelompok_id (id, name)
    )
  )
)
```

### 1b. `fetchStudentsByIds`

Tambah join yang sama (saat ini tidak ada join kelompok/desa di query ini):
```typescript
id, name, gender, class_id, kelompok_id,
kelompok:kelompok_id (id, name, desa:desa_id (id, name)),  // TAMBAH
classes (id, name),
student_classes (...)
```

---

## Task 2 — Update Hook Transform

**File:** `src/app/(admin)/presensi/hooks/useMeetingAttendance.ts`

### 2a. Extend interface Student (baris ~7-14)

```typescript
interface Student {
  id: string
  name: string
  gender: string
  class_name: string
  class_id: string
  classes?: Array<{ id: string; name: string }>
  kelompok_name?: string   // TAMBAH
  desa_name?: string       // TAMBAH
}
```

### 2b. Update transform di fetcher

Di dalam transform loop yang membangun `students` array, tambah extraction:

```typescript
// Ekstrak dari join langsung di student (prioritas utama)
// Fallback ke join via student_classes → kelompok
const kelompokName = (studentData?.kelompok as any)?.name
  || studentData?.student_classes?.[0]?.classes?.kelompok?.name
  || undefined

const desaName = (studentData?.kelompok as any)?.desa?.name
  || studentData?.student_classes?.[0]?.classes?.kelompok?.desa?.name
  || undefined

// Tambahkan ke object student yang di-push:
{
  ...existingFields,
  kelompok_name: kelompokName,
  desa_name: desaName,
}
```

---

## Task 3 — Update getStudentsFromSnapshot Transform

**File:** `src/app/(admin)/presensi/actions/attendance/actions.ts`

Cari fungsi `getStudentsFromSnapshot` (grep: `getStudentsFromSnapshot`), khususnya bagian `transformedStudents.map(...)`.

Tambah field yang sama ke return object:
```typescript
return {
  id: student.id,
  name: student.name,
  gender: student.gender || 'L',
  class_name: allClasses[0]?.name || 'Unknown Class',
  class_id: allClasses[0]?.id || student.class_id || '',
  classes: allClasses,
  kelompok_name: (student?.kelompok as any)?.name || undefined,   // TAMBAH
  desa_name: (student?.kelompok as any)?.desa?.name || undefined, // TAMBAH
}
```

---

## Task 4 — Buat Zustand Store

**File baru:** `src/app/(admin)/presensi/stores/presensiAttendanceStore.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PresensiColumnVisibility {
  showKelompokColumn: boolean
  showDesaColumn: boolean
}

interface PresensiAttendanceStore {
  columnVisibility: PresensiColumnVisibility
  setColumnVisibility: (visibility: Partial<PresensiColumnVisibility>) => void
}

export const usePresensiAttendanceStore = create<PresensiAttendanceStore>()(
  persist(
    (set) => ({
      columnVisibility: { showKelompokColumn: true, showDesaColumn: true },
      setColumnVisibility: (visibility) => set((state) => ({
        columnVisibility: { ...state.columnVisibility, ...visibility }
      })),
    }),
    {
      name: 'presensi-attendance-storage',
      partialize: (state) => ({ columnVisibility: state.columnVisibility }),
    }
  )
)
```

**File:** `src/lib/userUtils.ts`

Cari fungsi `clearUserCache()` (grep: `clearUserCache`), tambahkan:
```typescript
localStorage.removeItem('presensi-attendance-storage')
```

---

## Task 5 — Update AttendanceTable Props & Internal State

**File:** `src/app/(admin)/presensi/components/AttendanceTable.tsx`

### 5a. Update interface Student (lokal di file ini)

```typescript
interface Student {
  // ...existing fields...
  kelompok_name?: string  // TAMBAH
  desa_name?: string      // TAMBAH
}
```

### 5b. Update AttendanceTableProps

```typescript
interface AttendanceTableProps {
  // ...existing props...
  showKelompokColumn?: boolean    // TAMBAH
  showDesaColumn?: boolean        // TAMBAH
  columnToggle?: React.ReactNode  // TAMBAH — slot dari page
}
```

### 5c. Tambah internal state

```typescript
const [searchQuery, setSearchQuery] = useState('')
const [sortColumn, setSortColumn] = useState<'kelompok' | 'desa' | null>(null)
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
const [currentPage, setCurrentPage] = useState(1)
const PAGE_SIZE = 25
```

### 5d. Reset page saat filter/sort/students berubah

```typescript
useEffect(() => {
  setCurrentPage(1)
}, [students, searchQuery, sortColumn, sortDirection])
```

### 5e. Pipeline useMemo: filter → search → sort → paginate

```typescript
const processedStudents = useMemo(() => {
  let result = students.filter(s => s.id && s.id.trim() !== '')

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase()
    result = result.filter(s => s.name.toLowerCase().includes(q))
  }

  result = [...result].sort((a, b) => {
    if (sortColumn === 'kelompok') {
      const aVal = a.kelompok_name || ''
      const bVal = b.kelompok_name || ''
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    if (sortColumn === 'desa') {
      const aVal = a.desa_name || ''
      const bVal = b.desa_name || ''
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    }
    return a.name.localeCompare(b.name)
  })

  return result
}, [students, searchQuery, sortColumn, sortDirection])

const totalPages = Math.ceil(processedStudents.length / PAGE_SIZE)

const pagedStudents = useMemo(() => {
  const start = (currentPage - 1) * PAGE_SIZE
  return processedStudents.slice(start, start + PAGE_SIZE)
}, [processedStudents, currentPage])
```

### 5f. Sort handler

```typescript
const handleSort = (column: 'kelompok' | 'desa') => {
  if (sortColumn === column) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
  } else {
    setSortColumn(column)
    setSortDirection('asc')
  }
}
```

---

## Task 6 — Update JSX AttendanceTable

**File:** `src/app/(admin)/presensi/components/AttendanceTable.tsx`

### 6a. Toolbar di atas `<table>`

Tambahkan sebelum wrapper tabel:
```tsx
{/* Toolbar */}
<div className="px-3 py-2 flex items-center gap-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 rounded-t-lg">
  {students.length > 10 && (
    <input
      type="search"
      placeholder="Cari nama siswa..."
      value={searchQuery}
      onChange={e => setSearchQuery(e.target.value)}
      className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  )}
  {columnToggle && <div className="ml-auto">{columnToggle}</div>}
</div>
```

### 6b. Header kolom setelah `<th>Alfa (A)</th>`

```tsx
{showKelompokColumn && (
  <th
    className="px-2 sm:px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none whitespace-nowrap"
    onClick={() => handleSort('kelompok')}
  >
    <span className="flex items-center gap-1">
      Kelompok
      <span className="text-gray-400 text-xs">
        {sortColumn === 'kelompok' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </span>
  </th>
)}
{showDesaColumn && (
  <th
    className="px-2 sm:px-4 py-4 text-left text-sm font-semibold text-gray-900 dark:text-white cursor-pointer select-none whitespace-nowrap"
    onClick={() => handleSort('desa')}
  >
    <span className="flex items-center gap-1">
      Desa
      <span className="text-gray-400 text-xs">
        {sortColumn === 'desa' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </span>
  </th>
)}
```

### 6c. Cells di setiap row setelah cell status (A/Alfa)

```tsx
{showKelompokColumn && (
  <td className="px-2 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
    {student.kelompok_name || '—'}
  </td>
)}
{showDesaColumn && (
  <td className="px-2 sm:px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
    {student.desa_name || '—'}
  </td>
)}
```

### 6d. Ganti `sortedStudents.map(...)` dengan `pagedStudents.map(...)`

Saat ini ada variabel `sortedStudents` yang dipakai di render. Ganti dengan `pagedStudents`.

### 6e. Pagination footer setelah `</tbody></table>`

```tsx
{totalPages > 1 && (
  <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-lg flex items-center justify-between gap-2">
    <span className="text-sm text-gray-500 dark:text-gray-400">
      {processedStudents.length} siswa
      {searchQuery.trim() && ` (dari ${students.length})`}
    </span>
    <div className="flex items-center gap-1">
      <button
        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
        disabled={currentPage === 1}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        ‹
      </button>
      <span className="px-2 text-sm text-gray-600 dark:text-gray-400">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
        disabled={currentPage === totalPages}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-700"
      >
        ›
      </button>
    </div>
  </div>
)}
```

---

## Task 7 — Dirty State di Page

**File:** `src/app/(admin)/presensi/[meetingId]/page.tsx`

### 7a. Tambah `isDirty` useMemo

```typescript
const isDirty = useMemo(() => {
  const keys = Object.keys(localAttendance)
  if (keys.length !== Object.keys(attendance).length) return true
  return keys.some(id => {
    const local = localAttendance[id]
    const orig = attendance[id]
    return !orig || local.status !== orig.status || local.reason !== orig.reason
  })
}, [localAttendance, attendance])
```

### 7b. Update tombol Save

Cari tombol Save di render, tambahkan `disabled={saving || !isDirty}`:
```tsx
<Button
  onClick={handleSave}
  disabled={saving || !isDirty}
  // ...rest of props
>
  Simpan
</Button>
```

### 7c. Reset hasInitialized setelah save sukses

Di dalam `handleSave`, cari `if (result.success)`, tambahkan sebelum `mutate()`:
```typescript
hasInitialized.current = false  // Allow re-sync dari fresh data
mutate()
```

---

## Task 8 — Integrasi ColumnToggle di Page

**File:** `src/app/(admin)/presensi/[meetingId]/page.tsx`

### 8a. Import

```typescript
import { usePresensiAttendanceStore } from '../stores/presensiAttendanceStore'
import ColumnToggle from '@/components/table/ColumnToggle'
```

### 8b. State dari store

```typescript
const { columnVisibility, setColumnVisibility } = usePresensiAttendanceStore()
```

### 8c. Compute kolom yang tersedia by role

```typescript
const availableColumns = useMemo(() => {
  if (!userProfile) return { kelompok: false, desa: false }
  const hasDesa = !!userProfile.desa_id
  const hasDaerah = !!userProfile.daerah_id
  const isSuper = isSuperAdmin(userProfile)

  if (isSuper || hasDaerah) return { kelompok: true, desa: true }
  if (hasDesa) return { kelompok: true, desa: false }
  return { kelompok: false, desa: false }
}, [userProfile])

const showKelompokColumn = availableColumns.kelompok && columnVisibility.showKelompokColumn
const showDesaColumn = availableColumns.desa && columnVisibility.showDesaColumn

const toggleableColumns = [
  availableColumns.kelompok && { key: 'showKelompokColumn' as const, label: 'Kelompok' },
  availableColumns.desa && { key: 'showDesaColumn' as const, label: 'Desa' },
].filter(Boolean) as Array<{ key: keyof typeof columnVisibility; label: string }>

const columnToggleElement = toggleableColumns.length > 0
  ? <ColumnToggle columns={toggleableColumns} visibility={columnVisibility} onChange={setColumnVisibility} />
  : undefined
```

### 8d. Pass props ke AttendanceTable

```tsx
<AttendanceTable
  students={visibleStudents}
  attendance={localAttendance}
  onStatusChange={handleStatusChange}
  canEditStudent={canEditStudent}
  showKelompokColumn={showKelompokColumn}
  showDesaColumn={showDesaColumn}
  columnToggle={columnToggleElement}
/>
```

---

## Dependency Order

```
Task 1 (queries) → Task 2 (hook) → Task 3 (actions transform)
Task 4 (store) [independen]
Task 2 → Task 5 (table props) → Task 6 (table JSX)
Task 7 (dirty state) [independen dari 1-6]
Task 4 + Task 6 → Task 8 (page integration)
```

Task 1, 4, 7 bisa dikerjakan paralel. Task 2 setelah 1. Task 5-6 setelah 2. Task 8 setelah semua.

---

## Verifikasi

1. Login akun **kelompok** → tidak ada kolom Kelompok/Desa, tidak ada ColumnToggle
2. Login akun **desa** → kolom Kelompok muncul di kanan HISA, ColumnToggle 1 opsi
3. Login akun **daerah/superadmin** → kolom Kelompok + Desa, ColumnToggle 2 opsi
4. Meeting dengan > 10 peserta → search input muncul di toolbar
5. Meeting dengan > 25 peserta → pagination muncul di footer
6. Klik radio button → tombol Simpan aktif; tanpa perubahan → tombol Simpan disabled
7. Save sukses → tombol Simpan kembali disabled
8. Toggle kolom off → kolom hilang, tersimpan setelah refresh halaman
9. Mobile: scroll horizontal untuk lihat kolom Kelompok/Desa, HISA tetap di kiri

---

## CLAUDE.md Check

- [ ] Pattern baru? → `presensiAttendanceStore` adalah Zustand persist store baru, ikuti pattern `materiStore.ts`
- [ ] Tabel database baru? → Tidak
- [ ] Route/page baru? → Tidak
- [ ] Permission pattern baru? → `availableColumns` logic di page adalah pattern baru untuk column visibility by role
- [ ] Jika ada yang perlu diupdate → tidak perlu update docs, pattern sudah terdokumentasi di `materiStore.ts`
