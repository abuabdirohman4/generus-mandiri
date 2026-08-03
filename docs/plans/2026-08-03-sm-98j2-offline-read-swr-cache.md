# sm-98j2 — Offline Read via SWR Cache (Tier 2)

## Context

**Depends on sm-vxna** (offline shell dulu).

SWR cache SUDAH persist ke `localStorage['swr-cache']` (`src/components/common/SWRProvider.tsx`, hydrate saat load). Config sudah `revalidateOnReconnect: true` + `keepPreviousData: true` (`src/lib/swr.ts`). Yang kurang: (a) tak ada indikator staleness saat offline, (b) deteksi `navigator.onLine` tersebar ad-hoc (`components/PWA/index.tsx`, `presensi/page.tsx`, `hooks/useClasses.ts`, `presensi/hooks/useMeetings.ts`).

**Tujuan Tier 2:** saat sesi app **sudah terbuka lalu sinyal putus**, user client-nav antar halaman → data cache tetap tampil + banner "mode offline, data mungkin usang". Online balik → banner hilang, SWR auto-revalidate.

**Batasan (jujur):** cold-boot offline ke rute dinamis dalam TETAP kena network-only (arsitektur Server Component + server actions). Read-offline ini berlaku untuk "app kebuka lalu sinyal ilang", BUKAN "buka app fresh tanpa sinyal". Ini cukup untuk skenario nyata user.

## Files

- `src/hooks/useOnline.ts` (BARU) — centralize online status.
- `src/components/shared/OfflineDataBanner.tsx` (BARU) — banner offline.
- Layout `(admin)` — pasang banner sekali (mis. `src/app/(admin)/layout.tsx` atau `AppHeader`). Cek dulu di mana `NotificationBanner` existing dipasang (`src/app/(admin)/layout.tsx` per docs) → pasang berdampingan.
- (Opsional refactor) ganti `navigator.onLine` ad-hoc di file existing pakai `useOnline` — boleh, tapi tidak wajib di issue ini (bisa follow-up). Prioritas: hook + banner.

## Task 1 — Hook `useOnline`

Buat `src/hooks/useOnline.ts`:

```ts
'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true // assume online during SSR
}

/** Returns true when browser is online. Centralizes navigator.onLine + listeners. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
```

> `useSyncExternalStore` = React 19 idiom, hindari mismatch SSR/hydration + tak perlu useEffect+useState manual. Reuse pola listener yang sudah ada di `components/PWA/index.tsx` tapi terpusat.

### TDD Task 1
`useOnline` mostly binding ke browser API — test ringan cukup (mock `navigator.onLine` + dispatch `online`/`offline` event, assert nilai berubah). Vitest + jsdom.

## Task 2 — Komponen `OfflineDataBanner`

Buat `src/components/shared/OfflineDataBanner.tsx`. Pakai `useOnline()`. Saat offline tampil banner; online → null. Ikon dari `src/lib/icons.tsx` (JANGAN raw SVG). Cek pola `NotificationBanner.tsx` existing untuk styling konsisten (dismissable? di sini TIDAK perlu dismiss — hilang otomatis saat online).

```tsx
'use client'

import { useOnline } from '@/hooks/useOnline'
// import ikon offline dari '@/lib/icons'

export default function OfflineDataBanner() {
  const isOnline = useOnline()
  if (isOnline) return null
  return (
    <div className="bg-amber-100 text-amber-800 text-sm px-4 py-2 text-center">
      📴 Mode offline — data yang ditampilkan mungkin belum terbaru.
    </div>
  )
}
```

> Ganti emoji dengan ikon dari `src/lib/icons.tsx` bila ada yang cocok (mis. wifi-off). Kalau tak ada, emoji sementara + catat untuk tambah ikon.

## Task 3 — Pasang di layout `(admin)`

Import + render `<OfflineDataBanner />` di `src/app/(admin)/layout.tsx` (dekat `NotificationBanner` existing). Berlaku semua halaman admin, bukan per-page. JANGAN pasang per-halaman.

## Reuse (jangan bangun ulang)

- SWR localStorage persistence: `SWRProvider.tsx` — sudah jalan, Tier 2 nebeng.
- `revalidateOnReconnect: true` di `swrConfig` — sudah ada, tak perlu ubah.
- Deteksi online: `useOnline` gantikan `navigator.onLine` tersebar (boleh migrate bertahap).

## Verifikasi

1. `npm run build && npm start` (SW dari sm-vxna aktif).
2. Online, buka `/users/siswa` → data ke-load.
3. DevTools Network > Offline.
4. Client-nav (link SPA) ke halaman lain lalu balik ke `/users/siswa` → data siswa TETAP tampil (dari SWR cache localStorage) + banner offline muncul di atas.
5. Network > Online → banner hilang, data revalidate (cek network request jalan lagi).
6. `npm run test:run` (test useOnline hijau).

## CLAUDE.md Check
- [ ] Hook `useOnline` baru — pertimbangkan 1 baris di Key Utilities CLAUDE.md ("useOnline — centralized online status").
- [ ] Pattern offline-read (SWR cache + banner) → pointer bila dianggap perlu.

## Commit (user yang eksekusi)
```
feat(pwa): show offline banner and serve cached data when offline

Add centralized useOnline hook and OfflineDataBanner in admin layout.
SWR localStorage cache already persists reads; this surfaces staleness
during offline sessions. Auto-revalidates on reconnect.

fixes #<GH-number>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
