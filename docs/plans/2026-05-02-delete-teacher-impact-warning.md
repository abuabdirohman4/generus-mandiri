# Plan: Delete Teacher — Impact Warning Modal

## Context

Saat admin hapus guru, kode sudah bisa berjalan (bug FK sudah di-fix di commit sebelumnya).
Namun UX-nya masih buta — admin langsung konfirmasi tanpa tahu dampaknya.

Beberapa tabel memiliki referensi ke guru yang dihapus:
- `classes.teacher_id` — kelas jadi tanpa guru (paling berdampak operasional)
- `meetings.teacher_id` — pertemuan kehilangan referensi guru
- `student_material_progress.teacher_id` — progress materi kehilangan referensi guru
- `student_reports.teacher_id` — laporan siswa kehilangan referensi guru

Goal: Sebelum konfirmasi hapus, fetch impact summary dan tampilkan di modal warning.

---

## Architecture Overview

```
openDeleteConfirm(guru) 
  → fetch getTeacherDeleteImpact(id) [new server action]
  → store impact in guruStore.deleteConfirm.impact
  → ConfirmModal renders impact summary

handleDelete() → deleteTeacher(id) [existing, sudah di-fix]
```

---

## Files Changed (~5 files, ~120 lines)

| File | Perubahan |
|------|-----------|
| `src/app/(admin)/users/guru/actions/teachers/queries.ts` | Tambah `fetchTeacherDeleteImpact()` query |
| `src/app/(admin)/users/guru/actions/teachers/actions.ts` | Tambah `getTeacherDeleteImpact()` server action |
| `src/app/(admin)/users/guru/actions/index.ts` | Re-export `getTeacherDeleteImpact` |
| `src/app/(admin)/users/guru/stores/guruStore.ts` | Tambah `impact` field di `deleteConfirm` state |
| `src/app/(admin)/users/guru/hooks/useGuruPage.ts` | `openDeleteConfirm` fetch impact dulu sebelum buka modal |
| `src/app/(admin)/users/guru/page.tsx` | Pass impact summary ke ConfirmModal message |

---

## Task 1 — Tambah `fetchTeacherDeleteImpact()` di queries.ts

**File**: `src/app/(admin)/users/guru/actions/teachers/queries.ts`

Tambah fungsi query baru di akhir file:

```typescript
export interface TeacherDeleteImpact {
  classes_count: number
  meetings_count: number
  material_progress_count: number
  student_reports_count: number
}

export async function fetchTeacherDeleteImpact(
  supabase: any,
  teacherId: string
): Promise<TeacherDeleteImpact> {
  const [classesRes, meetingsRes, progressRes, reportsRes] = await Promise.all([
    supabase.from('classes').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
    supabase.from('meetings').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
    supabase.from('student_material_progress').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
    supabase.from('student_reports').select('id', { count: 'exact', head: true }).eq('teacher_id', teacherId),
  ])

  return {
    classes_count: classesRes.count ?? 0,
    meetings_count: meetingsRes.count ?? 0,
    material_progress_count: progressRes.count ?? 0,
    student_reports_count: reportsRes.count ?? 0,
  }
}
```

---

## Task 2 — Tambah `getTeacherDeleteImpact()` server action di actions.ts

**File**: `src/app/(admin)/users/guru/actions/teachers/actions.ts`

Import `fetchTeacherDeleteImpact` dari queries (tambah ke existing import):

```typescript
import {
  fetchTeachers,
  fetchTeacherDeleteImpact,   // ADD
  // ... existing imports
} from './queries'
```

Tambah server action baru setelah `deleteTeacher()`:

```typescript
/**
 * Get impact summary before deleting a teacher
 */
export async function getTeacherDeleteImpact(id: string) {
  try {
    const adminClient = await createAdminClient()
    const impact = await fetchTeacherDeleteImpact(adminClient, id)
    return { success: true, impact }
  } catch (error) {
    console.error('Error fetching teacher delete impact:', error)
    return { success: false, impact: null }
  }
}
```

---

## Task 3 — Re-export di index.ts

**File**: `src/app/(admin)/users/guru/actions/index.ts`

Tambah `getTeacherDeleteImpact` ke existing re-exports dari teachers/actions:

```typescript
export { getTeacherDeleteImpact } from './teachers/actions'
```

---

## Task 4 — Update `guruStore.ts`: tambah `impact` ke `deleteConfirm` state

**File**: `src/app/(admin)/users/guru/stores/guruStore.ts`

```typescript
// BEFORE
deleteConfirm: { isOpen: boolean; guru: any }

// AFTER
deleteConfirm: {
  isOpen: boolean
  guru: any
  impact: {
    classes_count: number
    meetings_count: number
    material_progress_count: number
    student_reports_count: number
  } | null
  isLoadingImpact: boolean
}
```

Update initial state:
```typescript
deleteConfirm: { isOpen: false, guru: null, impact: null, isLoadingImpact: false },
```

Update `openDeleteConfirm`:
```typescript
openDeleteConfirm: (guru, impact = null) => set({ 
  deleteConfirm: { isOpen: true, guru, impact, isLoadingImpact: false } 
}),
```

Tambah `setDeleteImpact` action:
```typescript
setDeleteImpact: (impact, isLoadingImpact = false) => set((state) => ({
  deleteConfirm: { ...state.deleteConfirm, impact, isLoadingImpact }
})),
```

Update `closeDeleteConfirm`:
```typescript
closeDeleteConfirm: () => set({ deleteConfirm: { isOpen: false, guru: null, impact: null, isLoadingImpact: false } }),
```

Update interface:
```typescript
interface GuruState {
  // ...
  deleteConfirm: { isOpen: boolean; guru: any; impact: TeacherDeleteImpact | null; isLoadingImpact: boolean }
  // ...
  openDeleteConfirm: (guru: any, impact?: TeacherDeleteImpact | null) => void
  setDeleteImpact: (impact: TeacherDeleteImpact | null, isLoadingImpact?: boolean) => void
  // ...
}
```

Import type di store:
```typescript
import type { TeacherDeleteImpact } from '../actions/teachers/queries'
```

---

## Task 5 — Update `useGuruPage.ts`: fetch impact saat `openDeleteConfirm`

**File**: `src/app/(admin)/users/guru/hooks/useGuruPage.ts`

Import `setDeleteImpact` dari store:
```typescript
const {
  // ... existing
  openDeleteConfirm,
  closeDeleteConfirm,
  setDeleteImpact,   // ADD
  // ...
} = useGuruStore()
```

Wrap `openDeleteConfirm` dengan async impact fetch:

```typescript
const handleOpenDeleteConfirm = useCallback(async (guru: any) => {
  // Buka modal dulu dengan loading state
  openDeleteConfirm(guru)
  setDeleteImpact(null, true)  // isLoadingImpact = true

  try {
    const { getTeacherDeleteImpact } = await import('../actions')
    const result = await getTeacherDeleteImpact(guru.id)
    setDeleteImpact(result.impact, false)
  } catch {
    setDeleteImpact(null, false)
  }
}, [openDeleteConfirm, setDeleteImpact])
```

Return `handleOpenDeleteConfirm` sebagai `openDeleteConfirm` (ganti nama):
```typescript
return {
  // ...
  openDeleteConfirm: handleOpenDeleteConfirm,  // replace existing
  // ...
}
```

---

## Task 6 — Update `page.tsx`: tampilkan impact di ConfirmModal message

**File**: `src/app/(admin)/users/guru/page.tsx`

Ganti bagian `<ConfirmModal>` untuk render impact summary:

```tsx
<ConfirmModal
  isOpen={deleteConfirm.isOpen}
  onClose={closeDeleteConfirm}
  onConfirm={handleDelete}
  title="Hapus Guru?"
  message={(() => {
    const { guru, impact, isLoadingImpact } = deleteConfirm
    const baseName = `Apakah Anda yakin ingin menghapus guru <strong>"${guru?.full_name || guru?.username}"</strong>?`

    if (isLoadingImpact) {
      return `${baseName}<br/><br/><span class="text-gray-400 text-xs">Mengecek dampak penghapusan...</span>`
    }

    if (!impact) return baseName

    const warnings: string[] = []
    if (impact.classes_count > 0)
      warnings.push(`${impact.classes_count} kelas akan kehilangan guru`)
    if (impact.meetings_count > 0)
      warnings.push(`${impact.meetings_count} pertemuan akan kehilangan referensi guru`)
    if (impact.material_progress_count > 0)
      warnings.push(`${impact.material_progress_count} catatan progress materi akan kehilangan referensi guru`)
    if (impact.student_reports_count > 0)
      warnings.push(`${impact.student_reports_count} laporan siswa akan kehilangan referensi guru`)

    if (warnings.length === 0) return baseName

    const warningHtml = warnings.map(w => `• ${w}`).join('<br/>')
    return `${baseName}<br/><br/><span class="text-amber-600 dark:text-amber-400 font-medium text-xs">⚠️ Dampak penghapusan:</span><br/><span class="text-xs text-gray-600 dark:text-gray-400">${warningHtml}</span>`
  })()}
  confirmText="Hapus"
  cancelText="Batal"
  isDestructive={true}
  isLoading={false}
/>
```

---

## Task 7 — Type-check

```bash
npm run type-check
```

Expected: 0 errors

---

## Verification

Manual test:
1. Buka `/users/guru`
2. Klik hapus pada guru yang **memiliki kelas yang di-assign**
   → Modal harus tampil: "⚠️ Dampak penghapusan: • X kelas akan kehilangan guru"
3. Klik hapus pada guru yang **tidak punya kelas/pertemuan apapun**
   → Modal harus tampil tanpa warning (hanya konfirmasi biasa)
4. Konfirmasi hapus → guru terhapus, tidak ada error

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU? → Tidak, ini mengikuti pattern yang sudah ada (impact check sebelum destructive action)
- [ ] Tabel baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak

## Commit Message Template
```
feat(guru): show impact warning before deleting teacher

- Add getTeacherDeleteImpact() server action to count affected records
- Fetch impact asynchronously when delete modal opens (non-blocking)
- Display warning in ConfirmModal: affected classes, meetings, progress, reports
- Empty impact (new teacher) shows simple confirm dialog without warnings

fixes #XX

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
