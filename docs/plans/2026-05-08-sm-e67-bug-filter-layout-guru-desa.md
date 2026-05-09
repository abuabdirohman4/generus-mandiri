# Plan: Bug Fix — Filter Layout 3 Kolom + Guru Desa Tidak Lihat Filter Kelompok

**Issue:** sm-e67  
**Priority:** P1  
**Type:** Bug

---

## Context

Dua bug di halaman presensi meeting (`/presensi/[meetingId]`):

1. **Bug Layout Filter:** Saat ada 3 filter aktif (Kelompok + Kelas + Jenis Kelamin) di akun desa, tampilan mobile tidak rapi — ketiga filter tampil vertikal satu-satu, bukan 2 di atas + 1 di bawah tengah.

2. **Bug Guru Desa:** Akun guru desa (hierarchical teacher dengan `desa_id`) tidak melihat filter Kelompok, padahal admin desa sudah bisa. Root cause: `shouldShowKelompokFilter()` di `accessControl.ts` hanya include admin roles, tidak include `isTeacherDesa`/`isTeacherDaerah`.

---

## Files yang Diubah

| File | Perubahan |
|------|-----------|
| `src/components/shared/DataFilter.tsx` | Fix grid layout untuk 3 filter di mobile |
| `src/lib/accessControl.ts` | Tambah `isTeacherDesa`/`isTeacherDaerah` ke `shouldShowKelompokFilter()` |

---

## Task 1 — Fix Layout Filter 3 Kolom

**File:** `src/components/shared/DataFilter.tsx`

**Lokasi:** Baris ~534 (grid container class) dan baris ~549 (getFilterClass helper)

**Masalah:**
- Grid pakai `grid-cols-2` di mobile untuk 2-4 filter
- Filter ke-3 diberi `col-span-2` → tampil full-width sendiri di bawah, tapi karena `grid-cols-2` ini membuat tampilan tidak simetris

**Fix — ubah `containerClass` untuk kasus 3 filter:**

```typescript
// BEFORE (baris 534):
variant === 'page' && filterCount >= 2 && filterCount <= 4 && "grid-cols-2 md:grid-cols-4",

// AFTER: pisahkan kasus 3 filter
variant === 'page' && filterCount === 2 && "grid-cols-2 md:grid-cols-4",
variant === 'page' && filterCount === 3 && "grid-cols-2 md:grid-cols-4",
variant === 'page' && filterCount === 4 && "grid-cols-2 md:grid-cols-4",
```

Dan **fix `getFilterClass`** untuk 3 filter — filter ke-3 di tengah bawah:

```typescript
// BEFORE (baris 549-551):
const getFilterClass = (index: number) => {
  if (variant === 'page' && filterCount === 3 && index === 2) {
    return "col-span-2 md:col-span-1" // Last filter full width on mobile
  }
  return ""
}

// AFTER: filter ke-3 tetap col-span-2 di mobile (full row), tapi dengan max-width agar tidak terlalu lebar
const getFilterClass = (index: number) => {
  if (variant === 'page' && filterCount === 3 && index === 2) {
    return "col-span-2 md:col-span-1 sm:max-w-xs"
  }
  return ""
}
```

Penjelasan: `col-span-2` pada grid 2 kolom = full width row. `sm:max-w-xs` membatasi lebar agar tidak meregang penuh. Ini menghasilkan tampilan: [filter 1] [filter 2] / [filter 3 ≤ max-w-xs].

**Verifikasi visual:** Buka halaman presensi dengan akun desa yang punya 2+ kelompok → filter Kelompok + Kelas + Gender tampil 2 atas 1 bawah (tidak terlalu lebar).

---

## Task 2 — Fix Guru Desa Tidak Lihat Filter Kelompok

**File:** `src/lib/accessControl.ts`

**Lokasi:** Fungsi `shouldShowKelompokFilter()` — cari dengan grep:
```bash
grep -n "shouldShowKelompokFilter" src/lib/accessControl.ts
```

**Masalah:**
```typescript
// SEKARANG — hanya admin:
export function shouldShowKelompokFilter(profile: UserProfile): boolean {
  return isSuperAdmin(profile) || isAdminDaerah(profile) || isAdminDesa(profile)
}
```

Guru desa (`isTeacherDesa`) dan guru daerah (`isTeacherDaerah`) tidak tercakup, padahal mereka adalah hierarchical teachers yang seharusnya bisa filter by kelompok.

**Fix:**
```typescript
// AFTER — include hierarchical teachers:
export function shouldShowKelompokFilter(profile: UserProfile): boolean {
  return isSuperAdmin(profile) || isAdminDaerah(profile) || isAdminDesa(profile)
    || isTeacherDaerah(profile) || isTeacherDesa(profile)
}
```

**Catatan:** `modalShouldShowKelompokFilter()` sudah include teacher roles (baris ~122). Ini fix agar `shouldShowKelompokFilter()` konsisten.

**Pastikan** `isTeacherDesa` dan `isTeacherDaerah` sudah di-export dari file ini, atau ada helper yang equivalent. Jika belum ada, tambahkan:
```typescript
export function isTeacherDesa(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.desa_id && !profile.kelompok_id
}
export function isTeacherDaerah(profile: UserProfile): boolean {
  return profile.role === 'teacher' && !!profile.daerah_id && !profile.desa_id
}
```

---

## Test Manual

1. Login akun **admin desa** dengan 2+ kelompok → buka meeting → cek 3 filter tampil rapi (2 atas, 1 bawah tengah)
2. Login akun **guru desa** (hierarchical, ada `desa_id`) → buka meeting dengan 2+ kelompok → filter Kelompok HARUS muncul
3. Login akun **guru kelompok** (regular teacher) → filter Kelompok TIDAK muncul (tidak regressed)

---

## CLAUDE.md Check

- [ ] Apakah ada pattern/arsitektur BARU? → Tidak, hanya bugfix
- [ ] Tabel database baru? → Tidak
- [ ] Route/page baru? → Tidak
- [ ] Permission pattern baru? → Ya, `shouldShowKelompokFilter` diperluas untuk teacher roles — cek apakah perlu update `docs/claude/architecture-patterns.md`
