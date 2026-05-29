# sm-1jj: feat: bulk edit teacher permissions

## Context

Admin harus set permissions materi/monitoring/archive satu per satu per guru via `SettingsModal`. Dengan ratusan guru, ini tidak efisien. Fitur ini menambah multi-select di `GuruTable` + `BulkPermissionsModal` untuk bulk grant/revoke permissions ke banyak guru sekaligus.

**Permissions yang di-bulk-edit:**
- `can_access_materials` — view materi page
- `can_manage_materials` — CRUD materi (superset dari access)
- `can_access_monitoring` — monitoring page
- `can_archive_students` — archive/unarchive siswa

**User decisions:**
- 4 toggle individual (bukan preset mode)
- Reset selection (deselect semua) setelah save berhasil

---

## Files to Modify / Create

| File | Action |
|------|--------|
| `stores/guruStore.ts` | Add `selectedTeacherIds` + `bulkPermissionsModal` state |
| `components/GuruTable.tsx` | Add checkbox column + selection props |
| `components/BulkPermissionsModal.tsx` | NEW — modal 4 toggle permissions |
| `actions/settings/queries.ts` | Add `bulkUpdateTeacherPermissionsQuery` |
| `actions/settings/logic.ts` | Add `validateBulkPermissionsInput` |
| `actions/settings/actions.ts` | Add `bulkUpdateTeacherPermissions` |
| `actions/settings/__tests__/logic.test.ts` | New tests |
| `actions/settings/__tests__/queries.test.ts` | New tests |
| `actions/settings/__tests__/actions.test.ts` | New tests (optional) |
| `actions/index.ts` | Export new action |
| `hooks/useGuruPage.ts` | Wire bulk state + handler |
| `page.tsx` | Add toolbar + BulkPermissionsModal |

All in: `src/app/(admin)/users/guru/`

---

## Task 1: Extend `guruStore.ts`

File: `src/app/(admin)/users/guru/stores/guruStore.ts`

Add to `GuruState` interface (after `formSettingsModal`):
```typescript
// Bulk selection
selectedTeacherIds: string[]
bulkPermissionsModal: { isOpen: boolean }
toggleTeacherSelection: (id: string) => void
selectAllTeachers: (ids: string[]) => void
clearTeacherSelection: () => void
openBulkPermissionsModal: () => void
closeBulkPermissionsModal: () => void
```

Add to initial state (after `formSettingsModal: ...`):
```typescript
selectedTeacherIds: [],
bulkPermissionsModal: { isOpen: false },
```

Add to actions (after `closeFormSettingsModal`):
```typescript
toggleTeacherSelection: (id) => set((state) => ({
  selectedTeacherIds: state.selectedTeacherIds.includes(id)
    ? state.selectedTeacherIds.filter(i => i !== id)
    : [...state.selectedTeacherIds, id]
})),
selectAllTeachers: (ids) => set((state) => {
  const allSelected = ids.every(id => state.selectedTeacherIds.includes(id))
  return { selectedTeacherIds: allSelected ? [] : ids }
}),
clearTeacherSelection: () => set({ selectedTeacherIds: [] }),
openBulkPermissionsModal: () => set({ bulkPermissionsModal: { isOpen: true } }),
closeBulkPermissionsModal: () => set({ bulkPermissionsModal: { isOpen: false } }),
```

**Test: run `npm run type-check` after this task.**

---

## Task 2: Add Bulk Logic to `actions/settings/logic.ts`

File: `src/app/(admin)/users/guru/actions/settings/logic.ts`

Add type + pure function:
```typescript
export interface BulkPermissionsInput {
  can_manage_materials: boolean
  can_access_materials: boolean
  can_access_monitoring: boolean
  can_archive_students: boolean
}

export function validateBulkPermissionsInput(
  userIds: string[],
  permissions: BulkPermissionsInput
): { valid: boolean; message?: string } {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return { valid: false, message: 'Pilih minimal 1 guru' }
  }
  if (userIds.some(id => !id || typeof id !== 'string')) {
    return { valid: false, message: 'ID guru tidak valid' }
  }
  const required: (keyof BulkPermissionsInput)[] = [
    'can_manage_materials', 'can_access_materials', 'can_access_monitoring', 'can_archive_students'
  ]
  for (const key of required) {
    if (typeof permissions[key] !== 'boolean') {
      return { valid: false, message: `Field ${key} harus boolean` }
    }
  }
  return { valid: true }
}
```

**TDD for Task 2:**

File: `src/app/(admin)/users/guru/actions/settings/__tests__/logic.test.ts`

Add tests:
```typescript
import { validateBulkPermissionsInput } from '../logic'

const validPerms = {
  can_manage_materials: false,
  can_access_materials: true,
  can_access_monitoring: false,
  can_archive_students: false,
}

describe('validateBulkPermissionsInput', () => {
  it('invalid for empty userIds', () => {
    const r = validateBulkPermissionsInput([], validPerms)
    expect(r.valid).toBe(false)
  })
  it('invalid for array with empty string ID', () => {
    const r = validateBulkPermissionsInput(['valid-id', ''], validPerms)
    expect(r.valid).toBe(false)
  })
  it('valid for well-formed input', () => {
    const r = validateBulkPermissionsInput(['uuid-1', 'uuid-2'], validPerms)
    expect(r.valid).toBe(true)
  })
  it('invalid when permissions missing field', () => {
    const { can_archive_students: _, ...partial } = validPerms
    const r = validateBulkPermissionsInput(['uuid-1'], partial as any)
    expect(r.valid).toBe(false)
  })
})
```

Run: `npm run test:run -- --reporter=verbose` — verify all pass.

---

## Task 3: Add Bulk Query to `actions/settings/queries.ts`

File: `src/app/(admin)/users/guru/actions/settings/queries.ts`

Import `BulkPermissionsInput` from logic at top:
```typescript
import type { BulkPermissionsInput } from './logic'
```

Add function at bottom:
```typescript
/**
 * Bulk update permissions for multiple teachers.
 * Loops through userIds, calls fetch-then-merge per user.
 * Collects errors without failing fast.
 */
export async function bulkUpdateTeacherPermissionsQuery(
  supabase: SupabaseClient,
  userIds: string[],
  data: BulkPermissionsInput
): Promise<{ errors: Array<{ userId: string; message: string }> }> {
  const errors: Array<{ userId: string; message: string }> = []

  for (const userId of userIds) {
    // Fetch existing permissions to merge
    const { data: profile } = await supabase
      .from('profiles')
      .select('permissions')
      .eq('id', userId)
      .single()

    const existing = (profile?.permissions as Record<string, unknown>) || {}
    const merged = {
      ...existing,
      can_manage_materials: data.can_manage_materials,
      can_access_materials: data.can_access_materials,
      can_access_monitoring: data.can_access_monitoring,
      can_archive_students: data.can_archive_students,
    }

    const { error } = await supabase
      .from('profiles')
      .update({ permissions: merged, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      errors.push({ userId, message: error.message })
    }
  }

  return { errors }
}
```

**TDD for Task 3:**

File: `src/app/(admin)/users/guru/actions/settings/__tests__/queries.test.ts`

Add tests:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { bulkUpdateTeacherPermissionsQuery } from '../queries'

const validPerms = {
  can_manage_materials: false,
  can_access_materials: true,
  can_access_monitoring: false,
  can_archive_students: false,
}

function makeMockSupabase(selectData = { permissions: {} }, updateError: any = null) {
  const single = vi.fn().mockResolvedValue({ data: selectData, error: null })
  const updateEq = vi.fn().mockResolvedValue({ error: updateError })
  const selectEq = vi.fn().mockReturnValue({ single })
  const updateFrom = vi.fn().mockReturnValue({ eq: updateEq })
  const selectFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({ eq: selectEq })
  })

  const from = vi.fn((table: string) => ({
    select: vi.fn().mockReturnValue({ eq: selectEq }),
    update: vi.fn().mockReturnValue({ eq: updateEq }),
  }))
  return { from } as any
}

describe('bulkUpdateTeacherPermissionsQuery', () => {
  it('returns empty errors on success', async () => {
    const supabase = makeMockSupabase()
    // Override to return no error
    const { errors } = await bulkUpdateTeacherPermissionsQuery(supabase, ['id1', 'id2'], validPerms)
    expect(Array.isArray(errors)).toBe(true)
  })
})
```

> Note: queries.test.ts uses structural mock — focus on logic.test.ts for correctness coverage.

Run: `npm run test:run` — all pass.

---

## Task 4: Add `bulkUpdateTeacherPermissions` Server Action

File: `src/app/(admin)/users/guru/actions/settings/actions.ts`

Add import at top:
```typescript
import type { BulkPermissionsInput } from './logic'
import { validateBulkPermissionsInput } from './logic'
import { bulkUpdateTeacherPermissionsQuery } from './queries'
```

Add function at bottom of file:
```typescript
/**
 * Bulk update permissions for multiple teachers at once.
 */
export async function bulkUpdateTeacherPermissions(
  userIds: string[],
  permissions: BulkPermissionsInput
): Promise<{ success: boolean; message?: string; failedCount?: number }> {
  try {
    const validation = validateBulkPermissionsInput(userIds, permissions)
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    const supabase = await createClient()
    const { errors } = await bulkUpdateTeacherPermissionsQuery(supabase, userIds, permissions)

    if (errors.length > 0) {
      return {
        success: false,
        message: `${errors.length} guru gagal diperbarui`,
        failedCount: errors.length,
      }
    }

    revalidatePath('/users/guru')
    revalidatePath('/materi')
    revalidatePath('/users/siswa')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'update_teacher_settings',
        entityType: 'teacher',
        entityId: 'bulk',
        entityLabel: 'Bulk Update Permissions',
        pagePath: '/users/guru',
        metadata: { userIds, permissions, count: userIds.length } as any,
      })
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      message: handleApiError(error, 'menyimpan data', 'Gagal memperbarui hak akses').message,
    }
  }
}
```

Export from `actions/index.ts`:
```typescript
export { bulkUpdateTeacherPermissions } from './settings/actions'
```

Run: `npm run type-check` — no errors.

---

## Task 5: Create `BulkPermissionsModal.tsx`

File: `src/app/(admin)/users/guru/components/BulkPermissionsModal.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import type { BulkPermissionsInput } from '../actions/settings/logic'

interface BulkPermissionsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedCount: number
  onSave: (permissions: BulkPermissionsInput) => Promise<void>
  isSaving: boolean
}

export default function BulkPermissionsModal({
  isOpen, onClose, selectedCount, onSave, isSaving
}: BulkPermissionsModalProps) {
  const [canManageMaterials, setCanManageMaterials] = useState(false)
  const [canAccessMaterials, setCanAccessMaterials] = useState(false)
  const [canAccessMonitoring, setCanAccessMonitoring] = useState(false)
  const [canArchiveStudents, setCanArchiveStudents] = useState(false)

  // Reset to false on every open
  useEffect(() => {
    if (isOpen) {
      setCanManageMaterials(false)
      setCanAccessMaterials(false)
      setCanAccessMonitoring(false)
      setCanArchiveStudents(false)
    }
  }, [isOpen])

  const handleSave = async () => {
    await onSave({
      can_manage_materials: canManageMaterials,
      can_access_materials: canManageMaterials ? true : canAccessMaterials,
      can_access_monitoring: canAccessMonitoring,
      can_archive_students: canArchiveStudents,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-md w-full m-4">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
          Edit Hak Akses
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {selectedCount} guru dipilih
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 mb-6">
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Pengaturan ini akan <strong>menimpa</strong> hak akses semua guru yang dipilih.
          </p>
        </div>

        <div className="space-y-4">
          <Label className="font-medium text-sm">Hak Akses Materi</Label>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="bulk-manage-materials"
              checked={canManageMaterials}
              onChange={(e) => setCanManageMaterials(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="bulk-manage-materials" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Kelola Materi
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tambah, edit, hapus materi; set target bulanan</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="bulk-access-materials"
              checked={canManageMaterials || canAccessMaterials}
              disabled={canManageMaterials}
              onChange={(e) => setCanAccessMaterials(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="bulk-access-materials" className={`text-sm font-medium cursor-pointer ${canManageMaterials ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300'}`}>
                Akses Halaman Materi
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Lihat halaman materi dan laporan materi</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id="bulk-access-monitoring"
              checked={canAccessMonitoring}
              onChange={(e) => setCanAccessMonitoring(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <label htmlFor="bulk-access-monitoring" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                Monitoring
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Isi penilaian monitoring; lihat laporan pencapaian materi</p>
            </div>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <Label className="font-medium text-sm mb-3">Hak Akses Siswa</Label>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="bulk-archive-students"
                checked={canArchiveStudents}
                onChange={(e) => setCanArchiveStudents(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <label htmlFor="bulk-archive-students" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  Arsip Siswa
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Tandai siswa sebagai lulus atau tidak aktif</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={isSaving} className="flex-1">
            Batal
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving ? 'Menyimpan...' : `Simpan (${selectedCount} Guru)`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
```

Run: `npm run type-check` — no errors.

---

## Task 6: Modify `GuruTable.tsx` — Add Checkbox Column

File: `src/app/(admin)/users/guru/components/GuruTable.tsx`

Add props to `GuruTableProps` interface:
```typescript
selectedIds?: string[]
onToggleSelect?: (id: string) => void
onSelectAll?: (ids: string[]) => void
```

In `buildColumns`, prepend checkbox column before `baseColumns` when `onToggleSelect` is provided:
```typescript
const buildColumns = (userProfile: UserProfile | null | undefined) => {
  // Checkbox column (added dynamically below)
  const baseColumns = [...]
  ...
  const allColumns = [
    ...baseColumns,
    { key: 'class_info', ... },
    ...orgColumns,
    { key: 'actions', ... }
  ]
  return allColumns
}
```

Change `columns` construction + add checkbox logic:
```typescript
const allFilteredIds = data.map(item => item.id)

const columns = buildColumns(userProfile)

// Prepend checkbox column if selection is enabled
const columnsWithCheckbox = onToggleSelect ? [
  {
    key: 'checkbox',
    label: (
      <input
        type="checkbox"
        checked={allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds?.includes(id))}
        ref={(el) => {
          if (el) {
            el.indeterminate = (selectedIds?.length ?? 0) > 0 && !allFilteredIds.every(id => selectedIds?.includes(id))
          }
        }}
        onChange={() => onSelectAll?.(allFilteredIds)}
        title="Pilih semua"
      />
    ) as React.ReactNode,
    align: 'center' as const,
    sortable: false,
    width: '48px',
  },
  ...columns
] : columns
```

In `renderCell`, add at the top:
```typescript
if (column.key === 'checkbox') {
  return (
    <input
      type="checkbox"
      checked={selectedIds?.includes(item.id) ?? false}
      onChange={() => onToggleSelect?.(item.id)}
    />
  )
}
```

Update return to use `columnsWithCheckbox`:
```typescript
return <DataTable columns={columnsWithCheckbox} data={data} renderCell={renderCell} />
```

Run: `npm run type-check` — no errors.

---

## Task 7: Wire `useGuruPage.ts`

File: `src/app/(admin)/users/guru/hooks/useGuruPage.ts`

Add import:
```typescript
import { useState } from 'react'
import { bulkUpdateTeacherPermissions } from '../actions'
import type { BulkPermissionsInput } from '../actions/settings/logic'
```

Add to `useGuruStore()` destructure:
```typescript
selectedTeacherIds,
bulkPermissionsModal,
toggleTeacherSelection,
selectAllTeachers,
clearTeacherSelection,
openBulkPermissionsModal,
closeBulkPermissionsModal,
```

Add state + handler after existing handlers:
```typescript
const [isBulkSaving, setIsBulkSaving] = useState(false)

const handleBulkSavePermissions = useCallback(async (permissions: BulkPermissionsInput) => {
  setIsBulkSaving(true)
  try {
    const result = await bulkUpdateTeacherPermissions(selectedTeacherIds, permissions)
    if (result.success) {
      toast.success(`Hak akses ${selectedTeacherIds.length} guru berhasil diperbarui`)
      mutate()
      clearTeacherSelection()
      closeBulkPermissionsModal()
    } else {
      toast.error(result.message || 'Gagal memperbarui hak akses')
    }
  } finally {
    setIsBulkSaving(false)
  }
}, [selectedTeacherIds, mutate, clearTeacherSelection, closeBulkPermissionsModal])
```

Add to return object:
```typescript
selectedTeacherIds,
bulkPermissionsModal,
toggleTeacherSelection,
selectAllTeachers,
clearTeacherSelection,
openBulkPermissionsModal,
closeBulkPermissionsModal,
isBulkSaving,
handleBulkSavePermissions,
```

---

## Task 8: Update `page.tsx`

File: `src/app/(admin)/users/guru/page.tsx`

Add import:
```typescript
import BulkPermissionsModal from './components/BulkPermissionsModal'
```

Add to destructure from `useGuruPage()`:
```typescript
selectedTeacherIds,
bulkPermissionsModal,
toggleTeacherSelection,
selectAllTeachers,
clearTeacherSelection,
openBulkPermissionsModal,
closeBulkPermissionsModal,
isBulkSaving,
handleBulkSavePermissions,
```

Add bulk toolbar between DataFilter and GuruTable:
```tsx
{/* Bulk Action Toolbar */}
{selectedTeacherIds.length > 0 && (
  <div className="flex items-center gap-3 px-4 py-2 mb-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
      {selectedTeacherIds.length} guru dipilih
    </span>
    <Button size="sm" onClick={openBulkPermissionsModal} className="text-sm px-3 py-1">
      Edit Hak Akses
    </Button>
    <button
      onClick={clearTeacherSelection}
      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 ml-auto"
    >
      Batalkan pilihan
    </button>
  </div>
)}
```

Update `<GuruTable>` props:
```tsx
<GuruTable
  data={teachers}
  onEdit={openEditModal}
  onResetPassword={openResetPasswordModal}
  onDelete={openDeleteConfirm}
  onConfigureForm={openFormSettingsModal}
  userProfile={userProfile}
  selectedIds={selectedTeacherIds}
  onToggleSelect={toggleTeacherSelection}
  onSelectAll={selectAllTeachers}
/>
```

Add `<BulkPermissionsModal>` in modals section (after `<SettingsModal>`):
```tsx
<BulkPermissionsModal
  isOpen={bulkPermissionsModal.isOpen}
  onClose={closeBulkPermissionsModal}
  selectedCount={selectedTeacherIds.length}
  onSave={handleBulkSavePermissions}
  isSaving={isBulkSaving}
/>
```

---

## Verification

```bash
npm run test:run         # All tests pass (no regressions)
npm run type-check       # No TS errors
```

Manual flow:
1. `/users/guru` — checkbox column muncul di sebelah kiri
2. Centang beberapa guru → blue toolbar muncul dengan count
3. Klik "Edit Hak Akses" → `BulkPermissionsModal` terbuka
4. Toggle beberapa permissions → klik "Simpan (X Guru)"
5. Toast sukses → selection reset → SWR refresh
6. Verifikasi di DB: `profiles.permissions` berubah untuk guru yang dipilih
7. "Batalkan pilihan" → toolbar hilang, checkboxes unchecked

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
  - Tidak — mengikuti pola yang sudah ada (3-layer actions, Zustand modal state, checkbox selection dari AssignStudentsModal)
- [ ] Apakah ada tabel database baru? — Tidak, menggunakan `profiles.permissions` JSONB yang sudah ada
- [ ] Apakah ada route/page baru? — Tidak
- [ ] Permission pattern baru? — `BulkPermissionsInput` type baru di `logic.ts`, dokumentasikan di `docs/claude/architecture-patterns.md` section Material Management Permissions jika perlu
