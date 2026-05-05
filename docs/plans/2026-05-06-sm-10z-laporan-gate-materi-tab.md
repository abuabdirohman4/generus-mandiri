# Plan: [sm-10z] Gate Tab Materi + Pindah Posisi Tab

## Context

Tab Presensi/Materi saat ini muncul di luar card filter dan tidak ada role gate — semua user bisa melihat tab Materi meskipun tidak punya akses materi. Perlu:
1. Sembunyikan tab Materi dari user tanpa `canManageMaterials` permission
2. Pindahkan tab ke posisi yang tidak membuat 2-level awkward (tab luar + Laporan Umum/Detail di dalam)

## Files yang Dimodifikasi

| File | Action |
|------|--------|
| `src/app/(admin)/laporan/page.tsx` | Tambah `hasMateriAccess`, kondisikan tab |
| `src/app/(admin)/laporan/components/LaporanTabHeader.tsx` | BARU — tab toggle underline style |

---

## TASK 1 — Tambah `hasMateriAccess` di laporan/page.tsx

### File: `src/app/(admin)/laporan/page.tsx`

**Step 1a**: Tambah import `canManageMaterials` (sudah ada di `@/lib/accessControl`):

```typescript
// Cari baris existing import dari accessControl atau lib:
import { useMyActivityTypes } from '@/hooks/useMyActivityTypes'
// Tambah di bawahnya:
import { canManageMaterials } from '@/lib/accessControl'
```

**Step 1b**: Di dalam component, setelah `const { activityTypes: myActivityTypes } = useMyActivityTypes()`, tambah:

```typescript
const hasMateriAccess = useMemo(() => {
    if (!userProfile) return false
    return canManageMaterials(userProfile)
}, [userProfile])

// Reset tab ke presensi jika tidak ada akses
useEffect(() => {
    if (!hasMateriAccess && laporanTab === 'materi') {
        setLaporanTab('presensi')
    }
}, [hasMateriAccess, laporanTab])
```

**Step 1c**: Hapus seluruh block tab selector yang ada saat ini:

```tsx
{/* HAPUS SELURUH BLOCK INI: */}
{/* Tab Selector */}
<div className="flex gap-1 mb-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
    <button
        onClick={() => setLaporanTab('presensi')}
        className={...}
    >
        Presensi
    </button>
    <button
        onClick={() => setLaporanTab('materi')}
        className={...}
    >
        Materi
    </button>
</div>
```

**Step 1d**: Ganti dengan render kondisional menggunakan `LaporanTabHeader`:

```tsx
{/* Tab header — hanya tampil jika user punya akses materi */}
{hasMateriAccess && (
    <LaporanTabHeader
        activeTab={laporanTab}
        onTabChange={setLaporanTab}
    />
)}
```

Tambah import di atas file:
```typescript
import LaporanTabHeader from './components/LaporanTabHeader'
```

---

## TASK 2 — Buat LaporanTabHeader Component

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

## Verification

1. Login sebagai **guru biasa** (tanpa `can_manage_materials`) → tidak ada tab toggle → langsung lihat laporan presensi
2. Login sebagai **guru dengan** `can_manage_materials=true` → tab "Presensi" dan "Materi" muncul, style underline
3. Login sebagai **admin/superadmin** → tab muncul
4. Klik tab Materi → konten materi tampil, klik Presensi → konten presensi tampil
5. Run `npm run type-check` → tidak ada error

---

## CLAUDE.md Check

- [ ] Pattern/arsitektur BARU? → `LaporanTabHeader` — pattern underline tab baru, tidak perlu dokumentasi global
- [ ] Tabel database baru? → Tidak
- [ ] Route/page baru? → Tidak
- [ ] Permission pattern baru? → `canManageMaterials()` sekarang juga dipakai untuk **show/hide UI section** (sebelumnya hanya untuk CRUD guard). Catat di `docs/claude/architecture-patterns.md` setelah implementasi.

---

## Commit Message Template

```
feat(laporan): gate materi tab behind canManageMaterials and use underline tab style

fixes #53
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
