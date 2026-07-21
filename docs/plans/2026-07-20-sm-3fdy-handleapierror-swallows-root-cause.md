# sm-3fdy — fix: handleApiError swallows root cause

**Issue**: sm-3fdy | **Priority**: P1 | **Type**: bug
**Sentry**: [GENERUS-MANDIRI-1F](https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-1F)
(29 events, 3 users, **escalating**) + GENERUS-MANDIRI-11 (22 events, ignored as dup)

## Context

```
Error: Gagal memuat riwayat kehadiran siswa
```
Server-side, `POST /users/siswa/[studentId]`, status **escalating** (frekuensi naik).

Pesan ini adalah pesan buatan sendiri, bukan error asli. Di Sentry tidak ada
informasi apa pun tentang penyebab sebenarnya — apakah query Supabase gagal,
RLS memblokir, timeout, atau network. **Tidak bisa didebug dengan data saat ini.**

## Root Cause (verified)

File: `src/app/(admin)/users/siswa/actions/students/actions.ts:1582-1585`

```ts
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')
        throw new Error(errorInfo.message)
    }
```

File: `src/lib/errorUtils.ts:41-66`

```ts
export const handleApiError = (error: unknown, context: ErrorContext, customMessage?: string): ErrorInfo => {
  const errorInfo: ErrorInfo = {
    context,
    timestamp: Date.now(),
    originalError: error,      // <-- disimpan di sini...
  };
  ...
  if (customMessage) {
    errorInfo.message = customMessage;   // <-- ...tapi message di-overwrite
  }
```

`handleApiError` menyimpan `originalError`, tapi call site hanya memakai
`errorInfo.message` lalu melempar `new Error(...)` **baru**. Error asli
(beserta stacktrace, kode error Postgres, detail RLS) dibuang total sebelum
Sentry sempat melihatnya.

Pola `throw new Error(errorInfo.message)` ini dipakai di banyak server action —
grep dulu untuk tahu sebarannya (Task 1).

## Approach

Pakai `cause` (ES2022, didukung Node 20) untuk merantai error asli, plus
lapor eksplisit ke Sentry dengan konteks. User tetap melihat pesan Indonesia
yang ramah; developer dapat root cause di Sentry.

## Tasks

### Task 1 — Ukur sebaran pola ini

```bash
grep -rn "throw new Error(errorInfo.message)" src/ --include=*.ts | wc -l
grep -rln "throw new Error(errorInfo.message)" src/ --include=*.ts
```
**Expected**: daftar file. Catat jumlahnya di deskripsi issue —
scope issue ini hanya memperbaiki **helper + call site yang error di Sentry**,
migrasi menyeluruh jadi follow-up issue.

### Task 2 — TDD: test bahwa cause terjaga (RED)

Buat/tambah file: `src/lib/__tests__/errorUtils.test.ts`
(jika sudah ada, tambahkan describe block ini)

```ts
import { describe, it, expect } from 'vitest'

import { handleApiError, toUserFacingError } from '../errorUtils'

describe('toUserFacingError', () => {
  it('keeps the friendly message for the user', () => {
    const original = new Error('permission denied for table attendance_logs')
    const wrapped = toUserFacingError(original, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')

    expect(wrapped.message).toBe('Gagal memuat riwayat kehadiran siswa')
  })

  it('preserves the original error as cause', () => {
    const original = new Error('permission denied for table attendance_logs')
    const wrapped = toUserFacingError(original, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')

    expect(wrapped.cause).toBe(original)
  })

  it('preserves non-Error causes too', () => {
    const original = { code: '42501', message: 'RLS violation' }
    const wrapped = toUserFacingError(original, 'memuat data', 'Gagal memuat')

    expect(wrapped.cause).toBe(original)
  })

  it('still returns errorInfo from handleApiError unchanged', () => {
    const original = new Error('boom')
    const info = handleApiError(original, 'memuat data', 'Pesan ramah')

    expect(info.message).toBe('Pesan ramah')
    expect(info.originalError).toBe(original)
  })
})
```

Jalankan:
```bash
npm run test:run -- src/lib/__tests__/errorUtils.test.ts
```
**Expected**: FAIL — `toUserFacingError` belum ada.

### Task 3 — Implementasi toUserFacingError (GREEN)

File: `src/lib/errorUtils.ts` — tambahkan di akhir file.

Import Sentry di bagian atas file (ikuti urutan import yang ada):
```ts
import * as Sentry from '@sentry/nextjs'
```

Lalu tambahkan:
```ts
/**
 * Bungkus error jadi pesan yang ramah untuk user TANPA membuang root cause.
 *
 * `throw new Error(errorInfo.message)` membuang error asli — Sentry hanya
 * menerima pesan generik dan issue jadi tidak bisa didebug. Fungsi ini
 * merantai error asli lewat `cause` dan melaporkannya ke Sentry dengan
 * konteks, sementara user tetap melihat pesan Indonesia yang ramah.
 */
export const toUserFacingError = (
  error: unknown,
  context: ErrorContext,
  userMessage: string
): Error => {
  const info = handleApiError(error, context, userMessage)

  Sentry.captureException(error, {
    tags: { errorContext: context },
    extra: { userMessage },
  })

  return new Error(info.message, { cause: error })
}
```

Jalankan lagi:
```bash
npm run test:run -- src/lib/__tests__/errorUtils.test.ts
```
**Expected**: PASS, 4 tests.

### Task 4 — Pakai di call site yang bermasalah

File: `src/app/(admin)/users/siswa/actions/students/actions.ts`

1. Tambah `toUserFacingError` ke import dari `@/lib/errorUtils` yang sudah ada.

2. Ganti baris 1582-1585:
```ts
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')
        throw new Error(errorInfo.message)
    }
```
menjadi:
```ts
    } catch (error) {
        throw toUserFacingError(error, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')
    }
```

3. Lakukan hal yang sama untuk `getMeetingDetail` di file yang sama
   (sekitar baris 1599-1601, pesan `'Gagal memuat detail pertemuan'`) —
   satu file, dua call site.

### Task 5 — Verifikasi

```bash
npm run test:run
```
**Expected**: semua PASS.

```bash
npm run type-check
```
**Expected**: exit 0. Jika error soal `cause`, cek `tsconfig.json` —
`target`/`lib` harus minimal `ES2022`.

### Task 6 — Verifikasi di production setelah deploy

Setelah deploy, tunggu error berikutnya masuk ke Sentry
(issue GENERUS-MANDIRI-1F sedang escalating, jadi tidak lama).

Buka issue di Sentry.
**Expected**: sekarang ada **dua** entri terkait — pesan ramah untuk user,
plus exception asli dengan stacktrace + detail Postgres/RLS.

Dari situ baru root cause sebenarnya bisa ditentukan → buat issue follow-up
untuk memperbaikinya. Issue ini hanya membuka visibilitas, **bukan** memperbaiki
kegagalan query itu sendiri.

## Scope Note

Issue ini sengaja TIDAK memperbaiki penyebab query gagal — penyebabnya belum
diketahui justru karena bug observability ini. Urutannya: buka visibilitas dulu
(issue ini), baru perbaiki akar masalahnya (issue follow-up setelah data masuk).

## Commit Message

```
fix(errors): preserve root cause when wrapping server action errors

handleApiError stored originalError but every call site threw
`new Error(errorInfo.message)`, discarding the real error before Sentry
could see it. Production issues arrived carrying only a generic Indonesian
string with no stacktrace, Postgres code, or RLS detail — undebuggable.

Adds toUserFacingError, which chains the original via `cause` and reports it
to Sentry with context while keeping the friendly message for the user.
Applies it to the two attendance-history call sites that are currently
escalating in production.

fixes #<GH-NUMBER>
```

## CLAUDE.md Check
- [ ] Pattern baru? → Ya: `toUserFacingError` menggantikan
      `throw new Error(errorInfo.message)` di server actions. Dokumentasikan
      di `CLAUDE.md` bagian error handling.
- [ ] Tabel DB baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
