# sm-d7zd — fix: hooks order violation naik-kelas

**Issue**: sm-d7zd | **Priority**: P2 | **Type**: bug
**Blocked by**: sm-iywv (butuh sourcemap untuk menentukan lokasi persis)
**Sentry**: [GENERUS-MANDIRI-13](https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-13)
(5 events, 4 users) + [GENERUS-MANDIRI-12](https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-12)
(7 events, 4 users)

## Context

Dua error yang tampak terpisah, sebenarnya **satu rantai sebab**:

```
Error: Rendered more hooks than during the previous render.        (GENERUS-MANDIRI-13)
NotFoundError: Failed to execute 'removeChild' on 'Node':
  The node to be removed is not a child of this node.              (GENERUS-MANDIRI-12)
```

Bukti keduanya satu kejadian:
- **Replay ID identik**: `f8dd1d67427741ebaad3115688c2752f`
- User sama (identitas ada di Sentry — sengaja tidak disalin ke sini)
- Release sama: `579896b656347c6692ed06afbb160afea085bc09`
- Timestamp berdekatan: 12:27:22 dan 12:27:19
- URL sama: `/naik-kelas`

Urutannya: pelanggaran urutan hooks (#13) merusak internal state React →
React gagal melakukan commit DOM secara konsisten → `removeChild` pada node
yang sudah tidak ada (#12).

**Konsekuensi: perbaiki #13 saja, #12 kemungkinan besar hilang sendiri.**
Jangan buat perbaikan terpisah untuk #12 sebelum #13 selesai diverifikasi.

## Root Cause (belum dapat dipastikan — butuh sourcemap)

Stacktrace #13 menunjuk ke:
```
chunks/2432-998322e90f987335.js:9:44733  (k)          <- komponen pelaku
chunks/2432-998322e90f987335.js:14:107478 (t.useMemo)
react-dom-client.production.js:4475 (throw Error(formatProdErrorMessage(310)))
```

`2432-*.js` adalah **shared chunk**, bukan chunk halaman. Komponen pelaku
(`k`) ada di kode yang dipakai bersama, bukan di `PromotionClient.tsx`.

Yang sudah diperiksa dan **bersih**:
- `src/app/(admin)/naik-kelas/PromotionClient.tsx` — semua hooks
  (baris 42-55 useState, 65/71 useMemo, 77 useEffect, 92/93/96/216 useMemo)
  dipanggil tanpa syarat di level atas, tidak ada early return di antaranya.

Kandidat yang belum diperiksa (hooks bersama yang dipakai PromotionClient,
semuanya kemungkinan besar masuk shared chunk):
- `useUserProfile` (`src/stores/userProfileStore.ts`)
- `useDaerah`, `useDesa`, `useKelompok`, `useClasses`
- `useNotifications`

Tanpa sourcemap, menebak di antara kandidat ini adalah buang waktu.

## Tasks

### Task 0 — PRASYARAT: pastikan sm-iywv selesai

```bash
bd show sm-iywv
```
**Expected**: status `closed`. Kalau belum, **STOP** — kerjakan sm-iywv dulu.

Konfirmasi sourcemap benar-benar aktif: buka issue GENERUS-MANDIRI-13 di Sentry.
**Expected**: frame menampilkan path file asli, bukan `chunks/2432-*.js`.

### Task 1 — Identifikasi komponen pelaku

Dari stacktrace yang sudah ter-resolve, catat:
- File dan baris komponen `k`
- Baris `useMemo` yang memicu error

Tulis temuan itu ke issue:
```bash
bd update sm-d7zd --notes "Komponen pelaku: <path>:<baris>, useMemo di <baris>"
```

### Task 2 — Reproduksi

```bash
npm run dev
```
Buka `/naik-kelas` sebagai user dengan role yang sama seperti di Sentry
(PJ Generus / admin kelompok — identitas user ada di issue Sentry).

Tonton replay untuk urutan aksi persisnya:
https://generus-mandiri.sentry.io/explore/replays/f8dd1d67427741ebaad3115688c2752f/

**Expected**: error muncul di console dengan pesan React #310.
Kalau tidak bisa direproduksi, catat itu di issue dan lanjut ke Task 3 —
perbaikan tetap bisa diverifikasi lewat test.

### Task 3 — TDD: test yang menangkap pelanggaran urutan hooks (RED)

Setelah komponen pelaku diketahui, tulis test yang me-render komponen itu
dua kali dengan props/state yang memicu cabang berbeda.

Lokasi: sebelah file komponen, ikuti pola `__tests__/` yang sudah ada di repo.

Kerangka (isi `<Component>` dan props sesuai temuan Task 1):
```tsx
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

describe('<Component> hook order', () => {
  it('calls the same number of hooks across re-renders with different data', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    // render pertama: kondisi yang membuat cabang "sedikit hooks"
    const { rerender } = render(<Component {...propsKondisiA} />)

    // render kedua: kondisi yang sebelumnya menambah hooks
    rerender(<Component {...propsKondisiB} />)

    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('Rendered more hooks')
    )
    errorSpy.mockRestore()
  })
})
```

```bash
npm run test:run -- <path-test-baru>
```
**Expected**: FAIL dengan pesan tentang jumlah hooks.

### Task 4 — Perbaiki (GREEN)

Prinsip perbaikan — **Rules of Hooks**: setiap hook harus dipanggil tanpa syarat,
di level atas komponen, dengan urutan yang sama di setiap render.

Pola pelanggaran yang biasa dan perbaikannya:

| Pelanggaran | Perbaikan |
|---|---|
| `if (!data) return null` sebelum hook | Pindahkan semua hook ke atas early return |
| `if (x) { useMemo(...) }` | Panggil `useMemo` tanpa syarat, taruh kondisinya di dalam callback |
| Hook di dalam `.map()` / loop | Pecah jadi komponen anak, satu hook per komponen |
| Hook setelah `try`/`catch` bercabang | Pindah ke atas blok |

Contoh perbaikan pola paling umum:
```tsx
// SALAH — jumlah hooks berubah antar render
if (!profile) return null
const filtered = useMemo(() => compute(profile), [profile])

// BENAR — hooks selalu dipanggil, kondisi masuk ke dalam
const filtered = useMemo(() => (profile ? compute(profile) : []), [profile])
if (!profile) return null
```

```bash
npm run test:run -- <path-test-baru>
```
**Expected**: PASS.

### Task 5 — Verifikasi

```bash
npm run test:run
npm run type-check
```
**Expected**: keduanya bersih.

Cek juga apakah linter menangkap pelanggaran ini (harusnya iya —
`react-hooks/rules-of-hooks`):
```bash
npx eslint <path-komponen-pelaku>
```
Kalau eslint **tidak** menangkapnya padahal jelas melanggar, berarti rule-nya
mati/tidak terkonfigurasi. Buat issue follow-up untuk mengaktifkannya —
itu mencegah kelas bug ini terulang.

### Task 6 — Verifikasi di production

Pantau **kedua** issue selama 7 hari (frekuensinya rendah: 5 dan 7 events):
- https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-13
- https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-12

**Expected**: tidak ada event baru di keduanya.

Kalau #13 bersih tapi #12 masih muncul → hipotesis rantai sebab salah,
`removeChild` punya penyebab independen. Buat issue terpisah untuk #12.

## Commit Message

```
fix(naik-kelas): call hooks unconditionally in <Component>

<Component> took a different number of hooks depending on <condition>, so a
re-render tripped React's hook-order invariant (#310). The corrupted fiber
state then made React commit a DOM removal for a node it no longer owned,
surfacing as a second, separate-looking NotFoundError from removeChild —
same user, same replay, three seconds apart.

Hoists the conditional hook to the top level and moves the condition inside
the callback, which fixes both symptoms.

fixes #<GH-NUMBER>
```

## CLAUDE.md Check
- [ ] Pattern baru? → Mungkin. Kalau ternyata `react-hooks/rules-of-hooks`
      mati, catat aturan lint yang wajib aktif di `CLAUDE.md`.
- [ ] Tabel DB baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
