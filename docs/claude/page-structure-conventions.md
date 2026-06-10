# Page Structure Conventions

Pola wrapper halaman `(admin)` untuk konsistensi layout dan spacing.

---

## Pola Standar (mayoritas halaman)

```tsx
export default function MyPage() {
  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        {/* konten halaman */}
      </div>
    </div>
  )
}
```

- `pb-28` untuk mobile (nav bar bawah)
- `md:pb-0` reset di desktop
- `md:px-6 lg:px-8` side padding di desktop
- `px-0` di mobile (full width, padding dari nav)

**Halaman yang pakai pola ini:** `kelas`, `settings`, `tahun-ajaran`, `presensi`, `laporan`, `notifikasi`

---

## Pengecualian yang Valid

| Halaman | Wrapper | Alasan |
|---|---|---|
| `home` | `bg-gray-50 dark:bg-gray-900` > inner dengan `px-3 sm:px-6 lg:px-8 py-6 md:py-8` | Home punya layout khusus (grid cards, banner) |
| `monitoring` | `flex h-[calc(100vh-8rem)] relative` | Full-height realtime view |
| `presensi` | Pola standar tapi dengan state management kompleks | Konsisten outer div |

---

## Halaman Baru: Checklist

Saat membuat halaman baru di `(admin)/`:

1. ✅ Pakai pola standar outer div di atas
2. ✅ Update `AppSidebar.tsx` → `allNavItems[]`
3. ✅ Update `home/components/QuickActions.tsx` → `quickActions[]`
4. ✅ Update `AppHeader.tsx` → `getPageTitle()` switch
5. ✅ Buat `layout.tsx` di folder halaman untuk metadata (title, description)

```tsx
// src/app/(admin)/my-page/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nama Halaman | Generus Mandiri',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
```

---

## Layout.tsx untuk Metadata

Halaman yang sudah punya `layout.tsx`: `home`, `presensi`, `laporan`, dll.

**Wajib tambah** saat buat halaman baru. Format title: `"[Nama Halaman] | Generus Mandiri"`.
