# sm-vxna — PWA Offline Shell Page (Tier 1)

## Context

App sudah PWA (installable, custom service worker `public/sw.js`, manifest lengkap), tapi buka app **tanpa internet = blank / halaman 503 polos**. Penyebab: `sw.js` sengaja **network-only untuk HTML** (blok `isHTMLPage`) supaya tidak cache HTML lintas-deploy (stale chunk → 404 → crash → logout). Efek samping: saat offline, `fetch` HTML gagal → hanya dapat string inline `<html><body><h1>Offline</h1>...`.

**Tujuan Tier 1:** offline → tampil **halaman offline bermerk** (logo + pesan + tombol "Coba lagi"), bukan HTML polos. Aman: cache hanya **satu** halaman statis `/offline`, BUKAN halaman app dinamis (tetap hindari stale-chunk).

Ini fondasi — Tier 2 (read) & Tier 3 (presensi) depend issue ini.

## Files

- `src/app/offline/page.tsx` (BARU) — halaman statis, di luar `(admin)` (tak butuh auth/data).
- `public/sw.js` (EDIT) — precache `/offline` + fallback ke situ saat HTML fetch gagal + bump `BUILD_VERSION`.

## Task 1 — Buat halaman `/offline`

Buat `src/app/offline/page.tsx`. Halaman statis, tanpa data/auth. Pakai komponen/ikon existing bila ada (ikon dari `src/lib/icons.tsx` per konvensi — JANGAN raw SVG). Logo pakai `/images/logo/logo.svg` (sudah di-precache SW existing).

Konten minimal:
- Logo (img `/images/logo/logo.svg`)
- Judul: "Anda sedang offline"
- Pesan: "Periksa koneksi internet Anda, lalu coba lagi."
- Tombol "Coba lagi" → `onClick={() => window.location.reload()}`. Karena butuh `onClick`, halaman jadi client component (`'use client'`) ATAU pisah tombol ke komponen kecil client. Pilih `'use client'` di page (paling simpel, halaman statis kecil).

Contoh:

```tsx
'use client'

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <img src="/images/logo/logo.svg" alt="Generus Mandiri" className="h-16 w-auto" />
      <h1 className="text-xl font-semibold">Anda sedang offline</h1>
      <p className="text-gray-500">Periksa koneksi internet Anda, lalu coba lagi.</p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-brand-500 px-4 py-2 text-white"
      >
        Coba lagi
      </button>
    </div>
  )
}
```

> Cek dulu apakah ada komponen `Button` yang cocok di `components/ui/button/` — kalau ada & ringan dipakai tanpa dependency berat, gunakan. Kalau raw button di halaman offline statis ini lebih aman (dependency minimal saat offline), boleh raw — tapi konfirmasi konsistensi styling.

## Task 2 — Edit `public/sw.js`

### 2a. Bump BUILD_VERSION
Baris `const BUILD_VERSION = '2026-06-12';` → ganti ke `'2026-08-03';` (WAJIB tiap ubah sw.js — konvensi file, purge cache lama).

### 2b. Precache `/offline`
Di array `STATIC_ASSETS`, tambah `'/offline'`:

```js
const STATIC_ASSETS = [
  '/manifest.json',
  '/images/logo/logo-icon.svg',
  '/images/logo/logo.svg',
  '/offline'
];
```

### 2c. Fallback ke `/offline` saat HTML fetch gagal
Di `handleRequest`, blok `catch` yang saat ini return string 503 inline untuk `isHTMLPage`. Ganti jadi return cached `/offline`:

```js
  } catch (error) {
    console.error('❌ Fetch failed:', error);
    // Offline fallback: serve precached branded /offline page for HTML requests
    if (isHTMLPage(url)) {
      const offline = await caches.match('/offline');
      if (offline) return offline;
      return new Response(
        '<html><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>',
        { headers: { 'Content-Type': 'text/html' }, status: 503 }
      );
    }
    throw error;
  }
```

> Catat: `caches.match('/offline')` cocok bila `/offline` ke-cache dgn key path `/offline`. Next.js serve route sebagai `/offline` (App Router). Verifikasi saat testing — kalau match gagal, cek URL aktual yang ke-cache (mungkin butuh trailing slash atau `/offline.html` tergantung output). Sesuaikan key precache + match agar konsisten.

## ponytail

Hanya cache 1 halaman statis `/offline`. JANGAN cache HTML app dinamis — alasan stale-chunk sudah didokumentasikan di komentar `sw.js` existing. Cukup; naik ke strategi HTML-cache penuh hanya kalau butuh cold-boot offline (di luar scope, arsitektur Server Component).

## Verifikasi

1. `npm run build && npm start`
2. Buka app di browser, biarkan SW register (cek DevTools > Application > Service Workers, versi `warlob-school-2026-08-03`).
3. DevTools > Network > set **Offline**.
4. Reload / navigasi ke rute app → muncul halaman `/offline` bermerk (logo + tombol), BUKAN blank / `<h1>Offline</h1>` polos.
5. Tombol "Coba lagi" → set Network back Online → reload → app normal.

## CLAUDE.md Check
- [ ] Route baru `/offline` — perlu tambah ke App Router Structure di CLAUDE.md? (halaman utilitas, di luar `(admin)`, TIDAK butuh 3-tempat-navigasi karena bukan menu). Cukup 1 baris catatan bila dianggap perlu.
- [ ] Pattern PWA offline-shell baru → pertimbangkan 1 pointer di CLAUDE.md/docs.

## Commit (user yang eksekusi)
```
feat(pwa): add branded offline fallback page

Precache static /offline page in service worker and serve it when HTML
fetch fails offline, replacing bare 503 inline page. Bump BUILD_VERSION.

fixes #<GH-number>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
