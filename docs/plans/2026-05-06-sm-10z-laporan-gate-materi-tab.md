# Plan: [sm-10z] Granular Teacher Permissions + Gate UI per Permission

## Context

Permission guru saat ini hanya punya `can_manage_materials`. Perlu diperluas menjadi 3 permission granular:

| Permission | Akses ke | Default guru |
|---|---|---|
| `can_manage_materials` | CRUD di `/materi` (tambah/edit/hapus, set target) | ❌ Off |
| `can_access_materials` | READ-only di `/materi` + laporan materi di `/laporan` | ❌ Off |
| `can_access_monitoring` | `/monitoring` + tab Materi di `/laporan` | ❌ Off |

**Aturan:**
- `can_manage_materials` → superset dari `can_access_materials` (yang bisa manage otomatis bisa access)
- Tab Materi di `/laporan` → gated by `can_access_monitoring` — karena guru yang bisa input nilai di monitoring = yang relevan melihat laporan materinya
- Admin/superadmin → semua akses otomatis, tidak perlu toggle

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/types/user.ts` | Tambah 2 field baru di `permissions` |
| `src/lib/accessControl.ts` | Tambah `canAccessMaterials()` + `canAccessMonitoring()` |
| `src/lib/accessControlServer.ts` | Sama — tambah 2 fungsi baru |
| `src/app/(admin)/users/guru/components/SettingsModal.tsx` | Tambah 2 toggle baru |
| `src/app/(admin)/home/components/QuickActions.tsx` | Update gate materi + monitoring |
| `src/components/layouts/AppSidebar.tsx` | Update gate `/materi` + `/monitoring` |
| `src/app/(admin)/laporan/page.tsx` | Gate tab Materi dengan `canAccessMonitoring` |
| `src/app/(admin)/laporan/components/LaporanTabHeader.tsx` | BARU — underline tab style |

---

## TASK 1 — Tambah field di `src/types/user.ts`

Lokasi: baris 55–61 (blok `permissions`).

```typescript
permissions?: {
    can_archive_students?: boolean
    can_transfer_students?: boolean
    can_soft_delete_students?: boolean
    can_hard_delete_students?: boolean
    can_manage_materials?: boolean
    can_access_materials?: boolean    // TAMBAH — READ /materi + laporan materi
    can_access_monitoring?: boolean   // TAMBAH — /monitoring + tab materi di laporan
}
```

---

## TASK 2 — Tambah fungsi di `src/lib/accessControl.ts`

Tambah setelah `canManageMaterials()` (baris 75–80):

```typescript
export function canAccessMaterials(profile: UserProfile | null): boolean {
    if (!profile) return false
    if (profile.role === 'superadmin') return true
    if (profile.role === 'admin') return true
    // can_manage_materials adalah superset dari can_access_materials
    if (profile.permissions?.can_manage_materials === true) return true
    return profile.permissions?.can_access_materials === true
}

export function canAccessMonitoring(profile: UserProfile | null): boolean {
    if (!profile) return false
    if (profile.role === 'superadmin') return true
    if (profile.role === 'admin') return true
    return profile.permissions?.can_access_monitoring === true
}
```

---

## TASK 3 — Sama di `src/lib/accessControlServer.ts`

Cari fungsi `canManageMaterials` di file tersebut, tambah dua fungsi baru di bawahnya dengan logika identik:

```typescript
export function canAccessMaterials(profile: UserProfile | null): boolean {
    if (!profile) return false
    if (profile.role === 'superadmin') return true
    if (profile.role === 'admin') return true
    if (profile.permissions?.can_manage_materials === true) return true
    return profile.permissions?.can_access_materials === true
}

export function canAccessMonitoring(profile: UserProfile | null): boolean {
    if (!profile) return false
    if (profile.role === 'superadmin') return true
    if (profile.role === 'admin') return true
    return profile.permissions?.can_access_monitoring === true
}
```

---

## TASK 4 — SettingsModal: tambah 2 toggle baru

### File: `src/app/(admin)/users/guru/components/SettingsModal.tsx`

**Step 4a**: Tambah state baru setelah `canManageMaterials` state:

```typescript
const [canAccessMaterials, setCanAccessMaterials] = useState(false)
const [canAccessMonitoring, setCanAccessMonitoring] = useState(false)
```

**Step 4b**: Di `useEffect` yang load permissions, tambah:

```typescript
setCanAccessMaterials((materialPerms as any).can_access_materials ?? false)
setCanAccessMonitoring((materialPerms as any).can_access_monitoring ?? false)
```

**Step 4c**: Di `handleSave`, sertakan permission baru saat update:

```typescript
const materialResult = await updateTeacherMaterialPermissions(userId, {
    can_manage_materials: canManageMaterials,
    can_access_materials: canAccessMaterials,
    can_access_monitoring: canAccessMonitoring,
})
```

**Step 4d**: Tambah 2 toggle di JSX, di bawah toggle `can_manage_materials` yang sudah ada:

```tsx
{/* Toggle: Akses Materi (READ) */}
<div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
    <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">Akses Materi</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            Dapat melihat halaman materi dan laporan materi
        </p>
    </div>
    <input
        type="checkbox"
        checked={canAccessMaterials || canManageMaterials} // manage → otomatis access
        disabled={canManageMaterials} // tidak bisa diubah jika sudah manage
        onChange={(e) => setCanAccessMaterials(e.target.checked)}
        className="w-4 h-4 cursor-pointer"
    />
</div>

{/* Toggle: Akses Monitoring */}
<div className="flex items-center justify-between py-3">
    <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">Akses Monitoring & Laporan Materi</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            Dapat mengisi penilaian di monitoring dan melihat laporan pencapaian materi
        </p>
    </div>
    <input
        type="checkbox"
        checked={canAccessMonitoring}
        onChange={(e) => setCanAccessMonitoring(e.target.checked)}
        className="w-4 h-4 cursor-pointer"
    />
</div>
```

**Step 4e**: Update `updateTeacherMaterialPermissions` di `src/app/(admin)/users/guru/actions/settings/actions.ts` untuk menerima 3 field:

```typescript
export async function updateTeacherMaterialPermissions(
    userId: string,
    data: {
        can_manage_materials: boolean
        can_access_materials: boolean
        can_access_monitoring: boolean
    }
)
```

Dan di `src/app/(admin)/users/guru/actions/settings/queries.ts`, update merge:

```typescript
const merged = {
    ...existing,
    can_manage_materials: data.can_manage_materials,
    can_access_materials: data.can_access_materials,
    can_access_monitoring: data.can_access_monitoring,
}
```

---

## TASK 5 — Update QuickActions.tsx

### File: `src/app/(admin)/home/components/QuickActions.tsx`

**Step 5a**: Tambah import:

```typescript
import { canManageMaterials, canAccessMaterials, canAccessMonitoring } from '@/lib/accessControl'
```

**Step 5b**: Tambah computed values (setelah `userCanManageMaterials`):

```typescript
const userCanManageMaterials = canManageMaterials(profile)
const userCanAccessMaterials = canAccessMaterials(profile)    // TAMBAH
const userCanAccessMonitoring = canAccessMonitoring(profile)  // TAMBAH
```

**Step 5c**: Update `disabled` kondisi untuk materi dan monitoring:

```typescript
// Materi — pakai canAccessMaterials (bukan canManageMaterials)
{
    id: 'materi',
    // ...
    disabled: userCanAccessMaterials ? false : true
},

// Monitoring — pakai canAccessMonitoring
{
    id: 'monitoring',
    // ...
    disabled: userCanAccessMonitoring ? false : true
},
```

---

## TASK 6 — Update AppSidebar.tsx

### File: `src/components/layouts/AppSidebar.tsx`

**Step 6a**: Tambah import fungsi baru:

```typescript
import { canManageMaterials, canAccessMaterials, canAccessMonitoring } from '@/lib/accessControl'
```

**Step 6b**: Tambah computed values setelah `userCanManageMaterials`:

```typescript
const userCanManageMaterials = profile ? canManageMaterials(profile) : false
const userCanAccessMaterials = profile ? canAccessMaterials(profile) : false    // TAMBAH
const userCanAccessMonitoring = profile ? canAccessMonitoring(profile) : false  // TAMBAH
```

**Step 6c**: Cari nav items yang pakai `requireCanManageMaterials`, update logika filter:

Di dalam `visibleNavItems.filter()`, ganti:
```typescript
// SEBELUM:
if (item.requireCanManageMaterials && !userCanManageMaterials) return false

// SESUDAH — pisah per item:
if (item.requireCanAccessMaterials && !userCanAccessMaterials) return false
if (item.requireCanAccessMonitoring && !userCanAccessMonitoring) return false
```

**Step 6d**: Update nav item definitions — ganti `requireCanManageMaterials` ke flag yang tepat:
- `/materi` → `requireCanAccessMaterials: true`
- `/monitoring` → `requireCanAccessMonitoring: true`

---

## TASK 7 — Update laporan/page.tsx

### File: `src/app/(admin)/laporan/page.tsx`

**Step 7a**: Tambah import:

```typescript
import { canAccessMonitoring } from '@/lib/accessControl'
```

**Step 7b**: Ganti `hasMateriAccess` check:

```typescript
// SEBELUM (dari plan lama):
const hasMateriAccess = useMemo(() => canManageMaterials(userProfile), [userProfile])

// SESUDAH:
const hasMateriAccess = useMemo(() => {
    if (!userProfile) return false
    return canAccessMonitoring(userProfile)
}, [userProfile])
```

**Step 7c**: Tambah `useEffect` reset tab + render `LaporanTabHeader`:

```typescript
useEffect(() => {
    if (!hasMateriAccess && laporanTab === 'materi') {
        setLaporanTab('presensi')
    }
}, [hasMateriAccess, laporanTab])
```

Hapus tab selector lama (pill style), ganti dengan:

```tsx
{hasMateriAccess && (
    <LaporanTabHeader
        activeTab={laporanTab}
        onTabChange={setLaporanTab}
    />
)}
```

Tambah import:
```typescript
import LaporanTabHeader from './components/LaporanTabHeader'
```

---

## TASK 8 — Buat LaporanTabHeader Component

### File: `src/app/(admin)/laporan/components/LaporanTabHeader.tsx` (BARU)

```tsx
'use client'

type LaporanTab = 'presensi' | 'materi'

interface LaporanTabHeaderProps {
    activeTab: LaporanTab
    onTabChange: (tab: LaporanTab) => void
}

export default function LaporanTabHeader({ activeTab, onTabChange }: LaporanTabHeaderProps) {
    return (
        <div className="flex gap-0 mb-4 border-b border-gray-200 dark:border-gray-700">
            {(['presensi', 'materi'] as LaporanTab[]).map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                        activeTab === tab
                            ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
            ))}
        </div>
    )
}
```

---

## TDD Tests

### File: `src/lib/__tests__/accessControl.test.ts` (TAMBAH test cases)

```typescript
describe('canAccessMaterials', () => {
    it('returns true for superadmin', () => {
        expect(canAccessMaterials({ role: 'superadmin' } as any)).toBe(true)
    })
    it('returns true for admin', () => {
        expect(canAccessMaterials({ role: 'admin' } as any)).toBe(true)
    })
    it('returns true if can_manage_materials is true (superset)', () => {
        expect(canAccessMaterials({
            role: 'teacher',
            permissions: { can_manage_materials: true }
        } as any)).toBe(true)
    })
    it('returns true if can_access_materials is true', () => {
        expect(canAccessMaterials({
            role: 'teacher',
            permissions: { can_access_materials: true }
        } as any)).toBe(true)
    })
    it('returns false if teacher has no permissions', () => {
        expect(canAccessMaterials({ role: 'teacher', permissions: {} } as any)).toBe(false)
    })
})

describe('canAccessMonitoring', () => {
    it('returns true for superadmin', () => {
        expect(canAccessMonitoring({ role: 'superadmin' } as any)).toBe(true)
    })
    it('returns true if can_access_monitoring is true', () => {
        expect(canAccessMonitoring({
            role: 'teacher',
            permissions: { can_access_monitoring: true }
        } as any)).toBe(true)
    })
    it('returns false if teacher has no permissions', () => {
        expect(canAccessMonitoring({ role: 'teacher', permissions: {} } as any)).toBe(false)
    })
})
```

---

## Verification

1. Guru tanpa permission → Materi dan Monitoring di QuickActions/Sidebar disabled, tab Materi di laporan tidak muncul
2. Guru dengan `can_access_monitoring=true` → bisa akses `/monitoring`, tab Materi di `/laporan` muncul
3. Guru dengan `can_access_materials=true` → bisa akses `/materi` (READ), tidak otomatis dapat monitoring
4. Guru dengan `can_manage_materials=true` → bisa CRUD di `/materi` + otomatis dapat `can_access_materials`
5. Admin/superadmin → semua akses
6. Toggle di SettingsModal: `can_manage_materials` checked → `can_access_materials` checkbox terkunci di true (disabled)
7. `npm run test:run` → semua test pass
8. `npm run type-check` → bersih

---

## CLAUDE.md Check

- [x] Permission pattern baru? → `canAccessMaterials()` dan `canAccessMonitoring()` — perlu dokumentasi di `docs/claude/architecture-patterns.md` setelah implementasi
- [ ] Tabel database baru? → Tidak (permissions disimpan di JSONB `profiles.permissions` yang sudah ada)
- [ ] Route baru? → Tidak
- [ ] Pattern/arsitektur baru lainnya? → Tidak

---

## Commit Message Template

```
feat(permissions): add canAccessMaterials and canAccessMonitoring teacher permissions

- Add can_access_materials and can_access_monitoring to UserProfile.permissions
- Gate /materi sidebar/quickaction with canAccessMaterials
- Gate /monitoring sidebar/quickaction with canAccessMonitoring
- Gate laporan materi tab with canAccessMonitoring
- Add toggles in guru SettingsModal

fixes #53
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
