# sm-97n: feat: can_multi_kelompok_laporan permission

## Context

Guru desa yang punya akses ke 2+ kelompok (via `teacher_kelompok_access`) perlu bisa memilih beberapa kelompok sekaligus di OverviewTab laporan untuk laporan gabungan. Saat ini filter kelompok di OverviewTab dipaksa single-select ketika `comparisonLevel === 'class'` (via `forceSingleSelectGroupings = true`).

**Design decision:**
- Flag `can_multi_kelompok_laporan` di `profiles.permissions` JSONB
- Hanya berlaku di OverviewTab laporan (bukan halaman lain)
- Admin set flag ini via `SettingsModal` di halaman guru
- Kalau flag aktif → `forceSingleSelectGroupings = false` → kelompok jadi multi-select

---

## Files to Modify

| File | Action |
|------|--------|
| `src/types/user.ts` | Add `can_multi_kelompok_laporan?: boolean` ke permissions |
| `src/lib/userUtils.ts` | Add `canMultiKelompokLaporan()` helper function |
| `src/app/(admin)/users/guru/components/SettingsModal.tsx` | Add toggle untuk flag ini |
| `src/app/(admin)/users/guru/actions/settings/actions.ts` | `updateTeacherPermissions` already handles permissions — confirm it merges |
| `src/components/shared/DataFilter.tsx` | Add prop `allowMultiKelompok?: boolean` |
| `src/app/(admin)/laporan/components/OverviewTab.tsx` | Read flag, pass to DataFilter |

---

## Task 1: Add Type + Helper

**File: `src/types/user.ts`**

Cari `permissions?:` block, tambah field:
```typescript
permissions?: {
  can_archive_students?: boolean
  can_transfer_students?: boolean
  can_soft_delete_students?: boolean
  can_hard_delete_students?: boolean
  can_manage_materials?: boolean
  can_access_materials?: boolean
  can_access_monitoring?: boolean
  can_multi_kelompok_laporan?: boolean  // NEW
}
```

**File: `src/lib/userUtils.ts`**

Cari exports lain seperti `canManageMaterials`, tambah:
```typescript
export function canMultiKelompokLaporan(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  if (profile.role === 'superadmin' || profile.role === 'admin') return true
  return profile.permissions?.can_multi_kelompok_laporan === true
}
```

Run: `npm run type-check` — no errors.

---

## Task 2: Add Toggle di `SettingsModal.tsx`

File: `src/app/(admin)/users/guru/components/SettingsModal.tsx`

**2a. Tambah state** — setelah state permissions existing (cari `canArchiveStudents`):
```typescript
const [canMultiKelompokLaporan, setCanMultiKelompokLaporan] = useState(false)
```

**2b. Load dari permissions** — di `useEffect` yang load permissions:
```typescript
setCanMultiKelompokLaporan(perms.can_multi_kelompok_laporan ?? false)
```

**2c. Include dalam save** — di `handleSave`, dalam call `updateTeacherPermissions`:
```typescript
await updateTeacherPermissions(userId, {
  can_archive_students: canArchiveStudents,
  can_transfer_students: canTransferStudents,
  can_soft_delete_students: canSoftDeleteStudents,
  can_hard_delete_students: canHardDeleteStudents,
  can_multi_kelompok_laporan: canMultiKelompokLaporan,  // NEW
})
```

**2d. Tambah UI toggle** — cari section "Manajemen Siswa" atau permission checkboxes, tambah section baru setelah:
```tsx
{/* Laporan */}
<div className="border-t border-gray-200 dark:border-gray-700 pt-4">
  <Label className="font-medium text-sm mb-3">Laporan</Label>
  <div className="flex items-start gap-3">
    <input
      type="checkbox"
      id="canMultiKelompokLaporan"
      checked={canMultiKelompokLaporan}
      onChange={(e) => setCanMultiKelompokLaporan(e.target.checked)}
      className="mt-0.5"
    />
    <div>
      <label htmlFor="canMultiKelompokLaporan" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
        Multi-Kelompok di Overview Laporan
      </label>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Izinkan pilih lebih dari 1 kelompok sekaligus di tab Overview laporan
      </p>
    </div>
  </div>
</div>
```

**Note**: `updateTeacherPermissions` di `actions/settings/queries.ts` saat ini melakukan **full overwrite** permissions (bukan merge seperti material permissions). Cek apakah ini akan menghapus fields lain (can_manage_materials, dll). Jika ya, ubah ke merge pattern — fetch existing dulu lalu spread.

Cek `queries.ts` line ~53-70: `updateTeacherPermissionsQuery` pakai `.update({ permissions })` langsung. Ini akan overwrite seluruh JSONB. Perlu fix: ubah ke fetch-then-merge pattern seperti `updateTeacherMaterialPermissionsQuery`.

**Fix di `actions/settings/queries.ts`** — ubah `updateTeacherPermissionsQuery`:
```typescript
export async function updateTeacherPermissionsQuery(
  supabase: SupabaseClient,
  userId: string,
  permissions: {
    can_archive_students?: boolean
    can_transfer_students?: boolean
    can_soft_delete_students?: boolean
    can_hard_delete_students?: boolean
    can_multi_kelompok_laporan?: boolean
  }
) {
  // Fetch existing permissions to merge (avoid overwriting other fields)
  const { data: profile } = await supabase
    .from('profiles')
    .select('permissions')
    .eq('id', userId)
    .single()

  const existing = (profile?.permissions as Record<string, unknown>) || {}
  const merged = { ...existing, ...permissions }

  return await supabase
    .from('profiles')
    .update({
      permissions: merged,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
}
```

---

## Task 3: Add prop ke `DataFilter.tsx`

File: `src/components/shared/DataFilter.tsx`

**3a. Tambah prop** ke `DataFilterProps` interface:
```typescript
allowMultiKelompok?: boolean  // Override forceSingleSelectGroupings for kelompok
```

**3b. Update `forceSingleSelectGroupings` logic** — cari line:
```typescript
const forceSingleSelectGroupings = showComparisonLevel && comparisonLevel === 'class'
```
Ubah ke:
```typescript
const forceSingleSelectGroupings = showComparisonLevel && comparisonLevel === 'class' && !allowMultiKelompok
```

Run: `npm run type-check` — no errors.

---

## Task 4: Update `OverviewTab.tsx`

File: `src/app/(admin)/laporan/components/OverviewTab.tsx`

**4a. Import helper**:
```typescript
import { canAccessMaterials, canAccessMonitoring, isSuperAdmin, isAdminDaerah, isTeacherDaerah, canMultiKelompokLaporan } from '@/lib/userUtils'
```

**4b. Compute flag** — setelah `hasPencapaianAccess` useMemo (line ~57):
```typescript
const hasMultiKelompokLaporan = useMemo(() => {
  return canMultiKelompokLaporan(userProfile)
}, [userProfile])
```

**4c. Pass ke DataFilter** — di `<DataFilter>` component (line ~278):
```tsx
<DataFilter
  ...existing props...
  allowMultiKelompok={hasMultiKelompokLaporan}
/>
```

---

## Verification

```bash
npm run type-check       # No TS errors
```

Manual:
1. Buka `/users/guru` → klik gear icon guru desa → SettingsModal
2. Toggle "Multi-Kelompok di Overview Laporan" → save
3. Login sebagai guru tersebut → `/laporan` → tab Overview
4. Filter kelompok: harus bisa pilih **lebih dari 1** kelompok (multi-select)
5. Guru lain tanpa flag → filter kelompok tetap single-select saat comparison = "Kelas"

---

## CLAUDE.md Check

- [ ] Permission field baru `can_multi_kelompok_laporan` → update `docs/claude/architecture-patterns.md` section Material Management Permissions (tambah field baru)
- [ ] Fix bug `updateTeacherPermissionsQuery` overwrite → catat di correction jika belum ada
- [ ] Tabel baru? — Tidak
- [ ] Route baru? — Tidak
