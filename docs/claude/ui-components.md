# UI Components — Claude Guidelines

Panduan komponen UI untuk konsistensi di seluruh project. Baca sebelum membuat komponen UI baru.

---

## Icon System

**Semua icon dikelola via `src/lib/icons.tsx`.** File ini re-export SVG dari `public/icons/` sebagai named exports React.

### Aturan

1. **Cek `src/lib/icons.tsx` dulu** sebelum buat inline SVG baru.
2. Kalau icon yang dibutuhkan sudah ada → import langsung.
3. Kalau belum ada → tambah import dari `public/icons/` ke `src/lib/icons.tsx`, lalu export. Jangan taruh SVG inline di komponen.
4. Semua SVG memakai `currentColor` → gunakan Tailwind `text-*` untuk warna.

### Import

```tsx
import { AlertIcon, CheckCircleIcon, InfoIcon, BellIcon } from '@/lib/icons'

// Penggunaan
<AlertIcon className="w-5 h-5 text-yellow-500" />
<CheckCircleIcon className="w-5 h-5 text-green-500" />
<InfoIcon className="w-5 h-5 text-blue-500" />
```

### Icon yang tersedia (non-exhaustive)

Cek langsung `src/lib/icons.tsx` untuk daftar lengkap. Beberapa yang umum:
- `AlertIcon` — warning/peringatan
- `CheckCircleIcon` — sukses/selesai
- `InfoIcon` — informasi/broadcast
- `BellIcon` — notifikasi
- `UserIcon`, `UsersIcon` — user/kelompok
- `ChevronDownIcon`, `ChevronRightIcon` — navigasi

---

## Form Components

**JANGAN raw HTML untuk form.** Wajib pakai komponen existing sebelum tulis `<input>`, `<select>`, `<button>`, `<input type=checkbox>`.

| Kebutuhan | Komponen |
|---|---|
| Dropdown/select | `InputFilter` dari `components/form/input/` |
| Checkbox tunggal | `Checkbox` dari `components/form/input/` |
| Multi-select checkbox | `MultiSelectCheckbox` dari `components/form/input/` |
| Button | `Button` dari `components/ui/button/` |

Raw HTML = inkonsisten styling + dark mode tidak jalan.

---

## Notification Banner (`NotificationBanner`)

**Hanya render di halaman home** — bukan di layout global.

- Desktop: di `src/app/(admin)/home/page.tsx` (bukan `layout.tsx`)
- Mobile: sudah ada di dalam `home/page.tsx`
- Type-specific icons: `success` → `CheckCircleIcon`, `warning` → `AlertIcon`, `broadcast`/`info` → `InfoIcon`
- Warna per type: success=green, warning=yellow, broadcast=blue

---

## Dropdown Items (`DropdownItem`)

Selalu gunakan `tag="a"` pada `<DropdownItem>` yang berisi teks navigasi:

```tsx
<DropdownItem tag="a" href="/path" className="w-full text-left">
  ...
</DropdownItem>
```

**Kenapa:** Default render sebagai `<button>` — browser beri `text-align:center` dan tidak ada `w-full`, menyebabkan teks center + overflow + scrollbar horizontal.
