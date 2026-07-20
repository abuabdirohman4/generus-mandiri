# sm-vrnd — fix: localStorage SecurityError signin

**Issue**: sm-vrnd | **Priority**: P1 | **Type**: bug
**Sentry**: [GENERUS-MANDIRI-B](https://generus-mandiri.sentry.io/issues/GENERUS-MANDIRI-B)
(20 events, 11 users) + GENERUS-MANDIRI-14 (19 events, 8 users, ignored as dup)
**Impact**: 19 user gagal buka halaman login

## Context

```
SecurityError: Failed to read the 'localStorage' property from 'Window':
Access is denied for this document.
```
DOMException code 18. Terjadi di `/signin`, Chrome Mobile Android, `handled: yes`
tapi tetap merusak render form login.

## Root Cause (verified)

File: `src/components/auth/SignInForm.server.tsx:15-27`

```tsx
  const [username, setUsername] = useState(() => {
    if (initialUsername) return initialUsername
    if (typeof window !== 'undefined') {
      return localStorage.getItem('remembered_username') || ''
    }
    return ''
  });
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('remembered_username')
    }
    return false
  });
```

Guard `typeof window !== 'undefined'` hanya mengecek **apakah kode jalan di browser**,
bukan **apakah localStorage boleh diakses**. Browser bisa memblokir storage
(Brave Shields, mode private, third-party-cookie blocking, partitioned storage)
— `window` tetap ada, tapi `localStorage` melempar `SecurityError`.

Karena akses terjadi di dalam `useState` initializer, exception dilempar saat
render pertama → komponen gagal mount → form login tidak muncul.

Bug yang sama ada di handler submit, baris 32-34:
```tsx
    if (rememberMe) {
      localStorage.setItem('remembered_username', usernameValue)
    } else {
      localStorage.removeItem('remembered_username')
    }
```

Bandingkan dengan `src/components/common/SWRProvider.tsx:16-23` yang **sudah benar**
(pakai try/catch) — pola itu yang harus diikuti.

## Approach

Buat helper `safeStorage` yang membungkus semua akses localStorage dengan try/catch,
lalu pakai di SignInForm. Helper ini reusable untuk komponen lain yang punya
masalah sama (PWA components juga akses localStorage tanpa guard).

## Tasks

### Task 1 — TDD: tulis test untuk safeStorage (RED)

Buat file baru: `src/lib/__tests__/safeStorage.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'

import { safeGetItem, safeSetItem, safeRemoveItem } from '../safeStorage'

describe('safeStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns the stored value when localStorage works', () => {
    const store = new Map<string, string>([['k', 'v']])
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    })

    expect(safeGetItem('k')).toBe('v')
  })

  it('returns null instead of throwing when localStorage access is denied', () => {
    vi.stubGlobal('localStorage', {
      get getItem(): never {
        throw new DOMException('Access is denied for this document.', 'SecurityError')
      },
    })

    expect(() => safeGetItem('k')).not.toThrow()
    expect(safeGetItem('k')).toBeNull()
  })

  it('swallows SecurityError on setItem', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => {
        throw new DOMException('Access is denied for this document.', 'SecurityError')
      },
    })

    expect(() => safeSetItem('k', 'v')).not.toThrow()
  })

  it('swallows SecurityError on removeItem', () => {
    vi.stubGlobal('localStorage', {
      removeItem: () => {
        throw new DOMException('Access is denied for this document.', 'SecurityError')
      },
    })

    expect(() => safeRemoveItem('k')).not.toThrow()
  })
})
```

Jalankan:
```bash
npm run test:run -- src/lib/__tests__/safeStorage.test.ts
```
**Expected**: FAIL — `Cannot find module '../safeStorage'`.

### Task 2 — Implementasi safeStorage (GREEN)

Buat file baru: `src/lib/safeStorage.ts`

```ts
/**
 * localStorage yang aman dari SecurityError.
 *
 * `typeof window !== 'undefined'` TIDAK cukup: browser bisa memblokir storage
 * (Brave Shields, private mode, partitioned storage) sehingga `window` ada
 * tapi akses `localStorage` melempar SecurityError (DOMException code 18).
 *
 * Semua akses localStorage di client component HARUS lewat helper ini.
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, value)
  } catch {
    // storage diblokir — abaikan, fitur ini best-effort
  }
}

export function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(key)
  } catch {
    // storage diblokir — abaikan
  }
}
```

Jalankan lagi:
```bash
npm run test:run -- src/lib/__tests__/safeStorage.test.ts
```
**Expected**: PASS, 4 tests.

### Task 3 — Pakai safeStorage di SignInForm

File: `src/components/auth/SignInForm.server.tsx`

1. Tambah import (setelah baris 10, ikuti urutan import yang ada):
```tsx
import { safeGetItem, safeSetItem, safeRemoveItem } from "@/lib/safeStorage";
```

2. Ganti baris 15-27 menjadi:
```tsx
  const [username, setUsername] = useState(() => {
    if (initialUsername) return initialUsername
    return safeGetItem('remembered_username') || ''
  });
  const [rememberMe, setRememberMe] = useState(() => {
    return !!safeGetItem('remembered_username')
  });
```

3. Ganti baris 31-35 (di dalam `handleSubmit`) menjadi:
```tsx
    if (rememberMe) {
      safeSetItem('remembered_username', usernameValue)
    } else {
      safeRemoveItem('remembered_username')
    }
```

### Task 4 — Verifikasi

```bash
npm run test:run
```
**Expected**: semua test PASS, tidak ada regresi.

```bash
npm run type-check
```
**Expected**: exit 0.

### Task 5 — Manual smoke test

```bash
npm run dev
```
1. Buka http://localhost:3000/signin di Chrome
2. DevTools → Application → Storage → centang **Block all cookies and site data**
   (atau buka di Brave dengan Shields up)
3. Reload halaman

**Expected**: form login tetap muncul dan bisa diisi. Username tidak ter-remember
(wajar — storage diblokir), tapi **tidak ada error** dan halaman tidak blank.

Sebelum fix: halaman blank / form tidak render.

## Follow-up (di luar scope issue ini)

`src/components/PWA/PWAInstallCard.tsx`, `PWADebug.tsx`, `PWASettingsSection.tsx`
juga akses `localStorage` langsung tanpa try/catch. Belum muncul di Sentry, tapi
rawan bug yang sama. Buat issue terpisah untuk migrasi ke `safeStorage`.

## Commit Message

```
fix(auth): guard localStorage access on signin form

localStorage was read inside two useState initializers guarded only by
`typeof window !== 'undefined'`. That check confirms the code runs in a
browser, not that storage is permitted — Brave Shields, private mode and
partitioned storage all leave `window` intact while localStorage throws
SecurityError. The throw happened during first render, so the login form
never mounted for affected users.

Adds a safeStorage helper (try/catch around get/set/remove) and routes the
signin form through it. Storage stays best-effort: remember-me silently
degrades instead of blocking login.

fixes #<GH-NUMBER>
```

## CLAUDE.md Check
- [ ] Pattern baru? → Ya: `safeStorage` wajib dipakai untuk semua akses
      localStorage di client component. Dokumentasikan di `CLAUDE.md`.
- [ ] Tabel DB baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
