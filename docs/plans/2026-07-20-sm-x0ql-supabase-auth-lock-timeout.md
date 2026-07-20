# sm-x0ql — fix: Supabase auth lock timeout

**Issue**: sm-x0ql | **Priority**: P1 | **Type**: bug
**Sentry**: [GENERUS-MANDIRI-Y](https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-Y)
(27 events, 18 users) + GENERUS-MANDIRI-8 (15 events, 10 users, ignored as dup)
**Impact**: 28 user — issue dengan dampak terluas di project

## Context

```
Error: Acquiring an exclusive Navigator LockManager lock
"lock:sb-eahntxowlefjaizjoqys-auth-token" timed out waiting 10000ms
```

Stacktrace:
```
@supabase/auth-js/dist/module/GoTrueClient.js:246  (this.initializePromise)
@supabase/auth-js/dist/module/GoTrueClient.js:1130 (_acquireLock)
@supabase/auth-js/dist/module/lib/locks.js:165     (NavigatorLockAcquireTimeoutError)
```

`handled: no`, `mechanism: auto.browser.global_handlers.onunhandledrejection`
→ unhandled promise rejection, user melihat app menggantung ~10 detik.

Semua kejadian: **Chrome Mobile / Android**. Terjadi di berbagai route
(`/users/siswa`, `/naik-kelas`) — bukan spesifik satu halaman.

## Root Cause (analysis)

`@supabase/auth-js` memakai Web Locks API (`navigator.locks`) untuk menyerialkan
akses ke auth token supaya beberapa tab tidak me-refresh token bersamaan.

Kondisi yang memicu timeout di Chrome Android:
1. **Multi-tab / PWA** — tab lain memegang lock, tidak melepasnya
2. **Tab di-background lalu di-resume** — Chrome Android membekukan timer di tab
   background; lock holder tidak pernah menyelesaikan pekerjaannya, tapi lock
   tetap tercatat. Saat user kembali, tab aktif menunggu lock yang tidak akan
   pernah dilepas → timeout 10 detik.
3. App ini adalah **PWA** (ada komponen PWA di `src/components/PWA/`), yang
   memperbesar kemungkinan multiple context memegang lock bersamaan.

Konfigurasi saat ini — `src/lib/supabase/client.ts:18-21`:
```ts
  authClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```
Tidak ada opsi `auth` sama sekali → pakai default `navigatorLock` dengan
timeout 10 detik.

> **Catatan**: root cause ini berbasis analisis stacktrace + pola device, belum
> direproduksi lokal. Task 1 wajib dikerjakan lebih dulu untuk konfirmasi.

## Tasks

### Task 1 — Konfirmasi hipotesis dari data Sentry

Sebelum mengubah kode, kuatkan bukti:

```bash
# lihat sebaran URL dan device untuk issue ini
```
Di Sentry, buka GENERUS-MANDIRI-Y → tab **Tags**, cek:
- `browser.name` — apakah 100% Chrome Mobile?
- `url` — apakah tersebar di banyak route (bukan satu halaman)?

Lalu buka **Session Replay** yang terlampir:
https://generus-mandiri.sentry.io/explore/replays/d77b8dd109cf4c54a46734569f0c6144/

**Yang dicari**: apakah error muncul tepat setelah user kembali ke tab
(app resume dari background)? Itu mengonfirmasi hipotesis #2.

**Expected**: pola terkonfirmasi → lanjut Task 2. Kalau ternyata terpusat di
satu route saja, hipotesis salah → stop, revisi plan.

### Task 2 — TDD: test konfigurasi auth client (RED)

Buat file: `src/lib/supabase/__tests__/client.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const createBrowserClientMock = vi.fn(() => ({ auth: {} }))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: (...args: unknown[]) => createBrowserClientMock(...args),
}))

describe('createAuthClient', () => {
  beforeEach(() => {
    vi.resetModules()
    createBrowserClientMock.mockClear()
  })

  it('configures a bounded lock acquire timeout', async () => {
    const { createAuthClient } = await import('../client')
    createAuthClient()

    const options = createBrowserClientMock.mock.calls[0]?.[2] as
      | { auth?: { lock?: unknown } }
      | undefined

    expect(options?.auth?.lock).toBeTypeOf('function')
  })

  it('reuses a single auth client instance', async () => {
    const { createAuthClient } = await import('../client')
    const a = createAuthClient()
    const b = createAuthClient()

    expect(a).toBe(b)
    expect(createBrowserClientMock).toHaveBeenCalledTimes(1)
  })
})
```

Jalankan:
```bash
npm run test:run -- src/lib/supabase/__tests__/client.test.ts
```
**Expected**: test pertama FAIL (`options?.auth?.lock` undefined),
test kedua PASS (singleton sudah benar di kode saat ini).

### Task 3 — Implementasi lock dengan timeout + fallback (GREEN)

File: `src/lib/supabase/client.ts`

1. Tambah import di atas (setelah baris 6):
```ts
import { navigatorLock } from '@supabase/auth-js'
```

> Verifikasi dulu bahwa `navigatorLock` di-export:
> ```bash
> grep -rn "navigatorLock" node_modules/@supabase/auth-js/dist/module/index.js
> ```
> Kalau tidak ter-export, import dari `@supabase/auth-js/dist/module/lib/locks.js`
> atau tulis ulang wrapper-nya manual (lihat catatan di bawah).

2. Tambahkan helper sebelum `createAuthClient` (setelah baris 9):
```ts
/**
 * Web Locks dengan fallback.
 *
 * Chrome Android membekukan timer di tab background, sehingga pemegang lock
 * auth-token bisa tidak pernah melepasnya. Tab yang aktif lalu menunggu
 * selama `acquireTimeout` penuh dan melempar NavigatorLockAcquireTimeoutError
 * sebagai unhandled rejection — app menggantung ~10 detik untuk user.
 *
 * Wrapper ini memperpendek waktu tunggu lalu tetap menjalankan operasi
 * ketika lock tidak bisa didapat. Risikonya kecil: paling buruk dua context
 * me-refresh token bersamaan, dan Supabase sudah idempoten untuk kasus itu —
 * jauh lebih baik daripada app yang macet.
 */
const LOCK_TIMEOUT_MS = 3000

async function resilientLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  try {
    return await navigatorLock(name, LOCK_TIMEOUT_MS, fn)
  } catch (err) {
    if (err instanceof Error && err.name === 'NavigatorLockAcquireTimeoutError') {
      // lock macet (tab background / PWA) — jalankan tanpa lock
      return await fn()
    }
    throw err
  }
}
```

3. Ganti baris 18-21 menjadi:
```ts
  authClient = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: resilientLock,
      },
    }
  )
```

Jalankan lagi:
```bash
npm run test:run -- src/lib/supabase/__tests__/client.test.ts
```
**Expected**: 2 tests PASS.

### Task 4 — Verifikasi

```bash
npm run test:run
npm run type-check
```
**Expected**: keduanya bersih.

### Task 5 — Manual smoke test (wajib, karena ini jalur auth)

```bash
npm run dev
```
1. Login normal → **Expected**: berhasil, dashboard muncul
2. Buka app di 2 tab bersamaan, reload keduanya cepat
   → **Expected**: keduanya load, tidak ada error lock di console
3. Buka DevTools → Application → Service Workers, simulasikan offline lalu online
   → **Expected**: session tetap valid
4. Logout → **Expected**: bersih, redirect ke `/signin`

### Task 6 — Verifikasi di production

Setelah deploy, pantau 48 jam:
```
https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-Y
```
**Expected**: tidak ada event baru. Kalau masih ada tapi jauh berkurang,
hipotesis benar tapi ada jalur lain — buat issue follow-up.

Kalau sudah bersih 48 jam:
```bash
bd close sm-x0ql
```
Lalu resolve issue di Sentry (status `resolved`), supaya kalau muncul lagi
Sentry menandainya sebagai **regression**.

## Rollback

Perubahan terbatas pada satu file dan bersifat aditif (opsi baru pada client).
Kalau auth bermasalah setelah deploy:
```bash
git revert <commit-sha>
```

## Commit Message

```
fix(auth): survive stuck Web Locks on mobile Chrome

Supabase auth-js serializes token access through navigator.locks. Chrome
Android freezes timers in backgrounded tabs, so a lock holder can stop
making progress without ever releasing — the foreground tab then waits the
full 10s acquire timeout and throws NavigatorLockAcquireTimeoutError as an
unhandled rejection, hanging the app. 28 users hit this across routes.

Wraps the lock with a shorter timeout and a fallback that proceeds without
it. Worst case two contexts refresh the token concurrently, which Supabase
already handles idempotently — strictly better than a hung app.

fixes #<GH-NUMBER>
```

## CLAUDE.md Check
- [ ] Pattern baru? → Ya: konfigurasi lock kustom pada auth client.
      Dokumentasikan di `CLAUDE.md` bagian Supabase client.
- [ ] Tabel DB baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
