# Plan: User Self-Service Password Change

## Context

Saat ini hanya admin yang bisa reset password user lain (via `ResetPasswordModal` di halaman guru). User biasa tidak bisa mengubah password mereka sendiri. Halaman Settings sudah punya placeholder "Keamanan Akun" yang di-comment out (coming soon). Fitur ini mengaktifkan placeholder tersebut dengan implementasi penuh.

## Approach

Halaman baru `/settings/security` dengan form inline (bukan modal). User harus memasukkan password saat ini untuk verifikasi sebelum bisa mengubah ke password baru. TDD: test ditulis dulu (RED), baru implementasi (GREEN), lalu refactor.

## Files to Create

```
src/app/(admin)/settings/security/
├── __tests__/
│   ├── logic.test.ts          ← Unit tests untuk validasi (RED dulu)
│   └── actions.test.ts        ← Integration tests untuk server action (RED dulu)
├── logic.ts                   ← Pure validation functions
├── actions.ts                 ← Server action changePassword()
├── components/
│   └── ChangePasswordForm.tsx ← Client form component
└── page.tsx                   ← Server Component page shell
```

## Files to Modify

- `src/app/(admin)/settings/page.tsx` — Uncomment "Keamanan Akun" section, set `available: true`

## Implementation Steps

### Step 1 (RED): `logic.test.ts`

Test cases untuk `validatePasswordChangeInput(input)`:
- Valid input → tidak throw
- `currentPassword` kosong → throw "Password saat ini harus diisi"
- `newPassword` < 8 karakter → throw "Password baru minimal 8 karakter"
- `confirmPassword` ≠ `newPassword` → throw "Konfirmasi password tidak cocok"
- `newPassword === currentPassword` → throw "Password baru tidak boleh sama dengan password saat ini"

### Step 2 (RED): `actions.test.ts`

Mocks: `@/lib/supabase/server`, `next/cache`, `../logic`, `@/lib/errorUtils`

Test cases untuk `changePassword(currentPassword, newPassword, confirmPassword)`:
- Memanggil `validatePasswordChangeInput` dengan ketiga input
- Return error jika user tidak authenticated (`getUser` null)
- Memanggil `signInWithPassword` dengan email user + `currentPassword`
- Return `{ error: "Password saat ini salah" }` jika `signInWithPassword` gagal
- Memanggil `auth.updateUser({ password: newPassword })` jika re-auth sukses
- Return `{ success: true }` pada happy path
- Memanggil `revalidatePath('/settings/security')` saat sukses
- Return error message jika `auth.updateUser` gagal

### Step 3 (GREEN): `logic.ts`

```typescript
export interface PasswordChangeInput {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function validatePasswordChangeInput(input: PasswordChangeInput): void {
  if (!input.currentPassword?.trim())
    throw new Error('Password saat ini harus diisi')
  if (!input.newPassword || input.newPassword.length < 8)
    throw new Error('Password baru minimal 8 karakter')
  if (input.newPassword !== input.confirmPassword)
    throw new Error('Konfirmasi password tidak cocok')
  if (input.newPassword === input.currentPassword)
    throw new Error('Password baru tidak boleh sama dengan password saat ini')
}
```

### Step 4 (GREEN): `actions.ts`

```typescript
'use server'
// Flow:
// 1. validatePasswordChangeInput (throws on invalid)
// 2. supabase.auth.getUser() → ambil email user
// 3. supabase.auth.signInWithPassword({ email, password: currentPassword })
//    → jika error: return { error: 'Password saat ini salah' }
// 4. supabase.auth.updateUser({ password: newPassword })
//    → jika error: return { error: updateError.message }
// 5. revalidatePath('/settings/security')
// 6. return { success: true }

export interface ChangePasswordResult {
  success?: boolean
  error?: string
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ChangePasswordResult>
```

Catatan penting:
- Gunakan `createClient()` (bukan `createAdminClient()`) — hanya beroperasi pada user yang login
- Gunakan `supabase.auth.updateUser()` (bukan `admin.updateUserById()`)
- Return `{ success } | { error }`, tidak pernah throw ke client

### Step 5 (GREEN): `ChangePasswordForm.tsx`

`'use client'` component dengan state:
- `formData`: `{ currentPassword, newPassword, confirmPassword }`
- `isLoading`: boolean
- `fieldErrors`: per-field error messages
- `serverError`: error dari server action
- `success`: boolean (tampilkan success banner)

Submit flow:
1. Client-side validation via `validatePasswordChangeInput` dari `../logic` → tampilkan field errors inline
2. Jika valid: panggil server action `changePassword(...)`
3. Sukses: tampilkan success banner, reset form
4. Error: tampilkan `serverError`

Komponen yang dipakai: `PasswordInput`, `Label`, `Button` (dengan `loading` dan `loadingText="Menyimpan..."`)

### Step 6 (GREEN): `page.tsx`

Server Component minimal:
```typescript
export const metadata = { title: 'Keamanan Akun | Generus Mandiri' }
// Render card container + heading + <ChangePasswordForm />
```

### Step 7 (REFACTOR): Update `settings/page.tsx`

Uncomment blok "Keamanan Akun" dan ubah `available: false` → `available: true`.

## Validation Rules

| Rule | Error Message |
|---|---|
| `currentPassword` kosong | "Password saat ini harus diisi" |
| `newPassword` < 8 chars | "Password baru minimal 8 karakter" |
| `confirmPassword` ≠ `newPassword` | "Konfirmasi password tidak cocok" |
| `newPassword === currentPassword` | "Password baru tidak boleh sama dengan password saat ini" |
| Wrong current password (server) | "Password saat ini salah" |
| Not authenticated | "Sesi tidak ditemukan. Silakan login kembali." |

## Reference Patterns

- Test mock pattern: `src/app/(admin)/users/guru/actions/teachers/__tests__/actions.test.ts`
- Logic pattern: `src/app/(admin)/users/guru/actions/teachers/logic.ts`
- Settings action pattern: `src/app/(admin)/settings/profile/actions/userProfileActions.ts`
- UI pattern: `src/app/(admin)/users/guru/components/ResetPasswordModal.tsx`

## Verification

```bash
# 1. Run unit tests
npm run test:run -- settings/security

# 2. Type check
npm run type-check

# 3. Manual test
# - Login sebagai any user
# - Buka /settings → klik "Keamanan Akun"
# - Test: password lama salah → error "Password saat ini salah"
# - Test: password baru < 8 char → error validasi
# - Test: confirm tidak cocok → error validasi
# - Test: happy path → success banner, form reset
```
