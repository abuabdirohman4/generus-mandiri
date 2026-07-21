# sm-dcb3 — fix: null role guard presensi

**Issue**: sm-dcb3 | **Priority**: P3 | **Type**: bug
**Blocked by**: sm-iywv (butuh sourcemap untuk menentukan lokasi persis)
**Sentry**: [GENERUS-MANDIRI-S](https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-S)
(3 events, 2 users) + GENERUS-MANDIRI-1D (2 events, 2 users, ignored as dup)

## Context

```
TypeError: Cannot read properties of null (reading 'role')
```
Route `/presensi`, Chrome Mobile Android, `handled: yes`.
Dampak paling kecil dari semua issue Sentry — dikerjakan terakhir.

## Root Cause (belum dapat dipastikan — butuh sourcemap)

Stacktrace:
```
chunks/2404-cdb9b2621aede3c5.js:1:26396  (ei)      <- komponen pelaku
<anonymous> (Array.map)
chunks/2404-cdb9b2621aede3c5.js:1:26786
<anonymous> (Array.map)                            <- map bersarang
chunks/2404-cdb9b2621aede3c5.js:1:30772
chunks/2404-cdb9b2621aede3c5.js:1:29046
chunks/app/(admin)/layout-a817fb1150a54b7f.js:1:1008 (r)
```

Bentuknya: admin layout → komponen → `.map()` → `.map()` bersarang →
komponen `ei` mengakses `.role` pada nilai `null`.

Yang sudah diperiksa dan **sudah aman** (semua sudah punya guard):
- `src/components/layouts/AppSidebar.tsx:458` — `profile?.role` ✓
- `src/components/layouts/NotificationBadge.tsx:20` — `if (!profile || ...)` ✓
- `src/app/(admin)/presensi/components/CreateMeetingModal.tsx:124,131` —
  `if (!userProfile) return false` sebelum akses `.role` ✓

Jadi pelakunya bukan salah satu dari itu. Tanpa sourcemap, chunk `2404-*.js`
tidak bisa dipetakan ke file sumber.

**Dua kemungkinan bentuk bug** (tentukan setelah sourcemap ada):
1. **Profile belum termuat** — komponen render sebelum `useUserProfile()`
   selesai, `profile` masih `null`, diakses tanpa guard.
2. **Elemen null di dalam array** — `.map()` melewati array yang mengandung
   `null` (mis. siswa/user yang sudah dihapus tapi id-nya masih tereferensi),
   lalu `.role` diakses pada elemen itu.

Bentuk (2) lebih cocok dengan stacktrace karena error terjadi **di dalam**
map bersarang, bukan di render awal komponen.

## Tasks

### Task 0 — PRASYARAT: pastikan sm-iywv selesai

```bash
bd show sm-iywv
```
**Expected**: status `closed`. Kalau belum, **STOP**.

Konfirmasi: buka GENERUS-MANDIRI-S di Sentry, frame harus menampilkan path asli.

### Task 1 — Identifikasi lokasi persis

Dari stacktrace yang sudah ter-resolve, catat:
- File + baris komponen `ei`
- Array apa yang di-`map` (dua level)
- Ekspresi persis yang mengakses `.role`

```bash
bd update sm-dcb3 --notes "Lokasi: <path>:<baris>, akses .role pada <ekspresi>"
```

### Task 2 — Tentukan bentuk bug mana

Buka replay:
https://generus-mandiri.sentry.io/explore/replays/79ac43a7cffe408d91af6fddb46a5718/

Cek juga tag distribution di Sentry (tab **Tags** → `url`, `user`).

Pertanyaan yang harus terjawab:
- Apakah error terjadi saat halaman pertama load (→ bentuk 1: profile null)?
- Atau setelah data list termuat (→ bentuk 2: elemen null di array)?

**Expected**: satu bentuk terpilih dengan bukti. Perbaikannya berbeda —
jangan tebak.

### Task 3 — TDD (RED)

**Kalau bentuk 1 (profile belum termuat)** — test render saat profile null:
```tsx
import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/stores/userProfileStore', () => ({
  useUserProfile: () => ({ profile: null, isInitialized: false }),
}))

describe('<Component> with unloaded profile', () => {
  it('renders without throwing when profile is null', () => {
    expect(() => render(<Component {...props} />)).not.toThrow()
  })
})
```

**Kalau bentuk 2 (elemen null di array)** — test data yang mengandung null:
```tsx
import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

describe('<Component> with sparse data', () => {
  it('renders without throwing when the list contains null entries', () => {
    const items = [
      { id: '1', role: 'teacher' },
      null,                          // user terhapus, referensi tertinggal
      { id: '3', role: 'admin' },
    ]

    expect(() => render(<Component items={items} />)).not.toThrow()
  })

  it('skips null entries instead of rendering empty rows', () => {
    const items = [{ id: '1', role: 'teacher' }, null]
    const { container } = render(<Component items={items} />)

    expect(container.querySelectorAll('[data-testid="row"]')).toHaveLength(1)
  })
})
```

```bash
npm run test:run -- <path-test-baru>
```
**Expected**: FAIL dengan `Cannot read properties of null (reading 'role')` —
error yang sama persis seperti di production. Kalau pesannya beda, hipotesis
salah, kembali ke Task 2.

### Task 4 — Perbaiki (GREEN)

**Bentuk 1** — guard sebelum akses:
```tsx
// SALAH
const isAdmin = profile.role === 'admin'

// BENAR
const isAdmin = profile?.role === 'admin'
```

**Bentuk 2** — saring null sebelum map, jangan sekadar optional chaining:
```tsx
// SALAH — baris kosong tetap ter-render
{items.map(item => <Row key={item?.id} role={item?.role} />)}

// BENAR — entri null dibuang lebih dulu
{items.filter((item): item is Item => item != null)
      .map(item => <Row key={item.id} role={item.role} />)}
```

> Pilih `filter` daripada `?.` kalau elemen null seharusnya **tidak ada**.
> Optional chaining menyembunyikan data rusak dan tetap merender baris kosong;
> `filter` membuangnya secara eksplisit.

Kalau ternyata bentuk 2, pertimbangkan juga: **kenapa ada null di array itu?**
Kalau sumbernya query yang men-join user terhapus, akar masalahnya di query —
catat sebagai issue follow-up.

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

### Task 6 — Verifikasi di production

Frekuensi sangat rendah (3 events dalam 11 hari), jadi butuh jendela panjang.
Pantau **14 hari**:
https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-S

**Expected**: tidak ada event baru.

Karena jarang, jangan tutup issue terlalu cepat — tidak adanya event selama
beberapa hari saja bukan bukti perbaikan berhasil.

## Commit Message

```
fix(presensi): drop null entries before reading role

A nested map over <array> could contain null entries (<why>), and the inner
component read `.role` straight off each one. Rare in practice — 3 events,
2 users over 11 days — but it broke the whole subtree when it hit.

Filters nulls out before mapping rather than reaching for optional chaining,
so genuinely broken data is dropped instead of rendering as empty rows.

fixes #<GH-NUMBER>
```

## CLAUDE.md Check
- [ ] Pattern baru? → Kemungkinan tidak. Kalau ternyata sumber null-nya
      adalah pola query yang berulang, dokumentasikan pola guard-nya.
- [ ] Tabel DB baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
