# Investigation & Fix: sm-9fj — Stale Org Data After Login (No Manual Refresh)

## Problem Statement

After login, users with scoped roles (admin daerah, admin desa, guru daerah, guru desa) see empty or incorrect org selectors (desa, kelompok) in forms until they manually refresh the page. Specifically observed in `/users/siswa` modal forms (StudentModal, Step1Config, AssignStudentsModal).

**Steps to reproduce:**
1. Login as admin desa → open Tambah Siswa modal → kelompok tidak muncul
2. Refresh halaman → kelompok muncul
3. Login as admin daerah → open Tambah Siswa modal → desa tidak muncul
4. Refresh → desa muncul

---

## Root Cause (Suspected — Needs Confirmation)

### Timing Race Condition

```
User clicks Login
  → loginAction() runs (server action)
  → clearUserCache() dipanggil → SWR cache dihapus
  → Zustand stores direset (siswaStore, dll)
  → Redirect ke /home

Page loads (/home atau /users/siswa)
  → AdminLayoutProvider.fetchUserData() mulai (async)
  → Zustand userProfileStore baca dari localStorage (sync, stale value)
  → Komponen render dengan profile lama ATAU null
  → useState di modal pakai getAutoFilledOrgValues(null) → semua []
  → useDaerah/useDesa/useKelompok mulai SWR fetch (async)

[beberapa ms kemudian]
  → fetchUserData() selesai → userProfileStore.setProfile(newProfile)
  → SWR data tiba → daerah/desa/kelompok terisi

Tapi: useState sudah terinit dengan [] → TIDAK re-init
Modal menampilkan selector kosong/disabled
```

### Kenapa refresh menyelesaikan masalah?
Setelah refresh, `fetchUserData()` sudah selesai sebelum komponen modal di-mount pertama kali, jadi `getAutoFilledOrgValues(profile)` dipanggil dengan profile yang sudah benar.

---

## Files to Investigate

### 1. AdminLayoutProvider / fetchUserData timing
```
src/app/(admin)/AdminLayoutProvider.tsx  (atau nama serupa)
```
Cek:
- Kapan `fetchUserData()` dipanggil?
- Apakah ada loading state yang di-expose ke consumer?
- Apakah komponen anak bisa mengetahui bahwa profile sudah "ready"?

### 2. userProfileStore — Zustand rehydration
```
src/stores/userProfileStore.ts
```
Cek:
- Apakah store pakai `persist`? Kalau iya, apa yang di-persist?
- Apakah ada `_hasHydrated` flag?
- Apakah profile dari localStorage sama dengan profile dari server?

### 3. useState initialization di modal forms
```
src/app/(admin)/users/siswa/components/StudentModal.tsx          (line ~57-76)
src/app/(admin)/users/siswa/components/batch-import/Step1Config.tsx  (line ~44-56)
src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx    (line ~63-69)
```
Semua tiga pakai pola:
```typescript
const autoFilled = userProfile ? getAutoFilledOrgValues(userProfile) : {}
const [filters, setFilters] = useState<DataFilters>({
  daerah: autoFilled.daerah_id ? [autoFilled.daerah_id] : [],
  ...
})
```
`useState` init hanya run sekali saat mount. Kalau `userProfile` null saat mount → filters selalu `[]`.

**StudentModal sudah punya workaround partial:** useEffect di line ~77-141 yang re-init filters saat `isOpen` berubah. Tapi ini juga bisa gagal kalau profile masih null saat modal dibuka pertama kali.

### 4. useDaerah / useDesa / useKelompok hooks
```
src/hooks/useDaerah.ts
src/hooks/useDesa.ts
src/hooks/useKelompok.ts
```
Cek apakah ada `revalidateOnMount` atau apakah SWR config yang menyebabkan data tidak langsung tersedia.

---

## Proposed Fix Options

### Option A: Re-init filters saat userProfile berubah dari null → value (Recommended)

Tambah useEffect di masing-masing modal yang watch `userProfile`:

```typescript
// Di StudentModal, Step1Config, AssignStudentsModal
useEffect(() => {
  if (!userProfile) return
  // Hanya re-init jika semua filter masih kosong (belum ada pilihan user)
  const isUntouched = filters.daerah.length === 0 && filters.desa.length === 0 && filters.kelompok.length === 0
  if (!isUntouched) return

  const autoFilled = getAutoFilledOrgValues(userProfile)
  setFilters(prev => ({
    ...prev,
    daerah: autoFilled.daerah_id ? [autoFilled.daerah_id] : prev.daerah,
    desa: autoFilled.desa_id ? [autoFilled.desa_id] : prev.desa,
    kelompok: autoFilled.kelompok_id ? [autoFilled.kelompok_id] : prev.kelompok,
  }))
}, [userProfile]) // eslint-disable-line react-hooks/exhaustive-deps
```

**Pro:** Targeted fix, tidak perlu ubah global store atau provider.
**Con:** Perlu ditambah di 3 file modal. Tapi `isUntouched` guard mencegah override pilihan user.

### Option B: Expose `profileReady` flag dari AdminLayoutProvider

Tambahkan context value `profileReady: boolean` yang bernilai `true` setelah `fetchUserData()` selesai. Modal forms bisa `await` flag ini sebelum render konten.

**Pro:** Fix global, semua komponen bisa pakai.
**Con:** Perubahan lebih besar, perlu modifikasi context.

### Option C: Gunakan `profileLoading` dari userProfileStore

Kalau store sudah expose `isLoading`, modal bisa delay init sampai loading selesai:
```typescript
const { userProfile, isLoading: profileLoading } = useUserProfileStore()
// Jangan render DataFilter sampai !profileLoading
```

**Pro:** Bersih, tidak ada race condition.
**Con:** Perlu verifikasi bahwa `isLoading` memang di-set false setelah fetch selesai (bukan hanya setelah localStorage hydration).

---

## Recommended Investigation Steps

1. **Buka `AdminLayoutProvider.tsx`** — periksa kapan `fetchUserData()` dipanggil dan apakah ada loading state
2. **Buka `userProfileStore.ts`** — periksa apakah ada `_hasHydrated` atau `isLoading` flag
3. **Console.log test:** Tambah log sementara di `getAutoFilledOrgValues` untuk lihat kapan dipanggil dan dengan value apa
4. **Timeline test:** Tambah `console.time('profile-ready')` di `fetchUserData()` start/end, dan lihat kapan modal pertama kali mount vs kapan profile tiba
5. **Pilih option fix** berdasarkan temuan, lalu implementasi dengan TDD

---

## Fix Scope

Setelah root cause dikonfirmasi, perkiraan file yang dimodifikasi:

**Option A (re-init on profile change):**
- `src/app/(admin)/users/siswa/components/StudentModal.tsx`
- `src/app/(admin)/users/siswa/components/batch-import/Step1Config.tsx`
- `src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx`

**Option B (profileReady context):**
- `src/app/(admin)/AdminLayoutProvider.tsx` (atau equivalent)
- `src/app/(admin)/users/siswa/components/StudentModal.tsx`
- `src/app/(admin)/users/siswa/components/batch-import/Step1Config.tsx`
- `src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx`

**Option C (profileLoading flag):**
- `src/stores/userProfileStore.ts` (kalau belum ada flag)
- 3 modal files di atas

---

## Related Issues

- **sm-9fj** — parent issue untuk ini (Eliminate manual refresh after login)
- **sm-4u0** — fix sebelumnya untuk stale filter saat logout
- **sm-s2u** — fitur org selector yang meng-expose masalah ini lebih jelas

---

## Session Prompt untuk Claude

Gunakan prompt ini di session baru:

```
Saya ingin fix bug sm-9fj: setelah login sebagai admin desa/daerah atau guru desa/daerah,
form tambah/edit/batch/assign siswa di halaman /users/siswa menampilkan selector
organisasi (desa, kelompok) yang kosong dan disabled. Perlu refresh manual untuk
muncul.

Dokumen investigasi ada di: docs/plans/2026-03-28-sm9fj-refresh-bug-investigation.md

Langkah:
1. Baca dokumen investigasi tersebut
2. Investigasi file-file yang disebutkan di bagian "Files to Investigate"
3. Konfirmasi root cause
4. Pilih option fix yang paling tepat dan implementasikan dengan TDD
5. Verifikasi fix dengan npm run type-check dan npm run test:run

Issue beads: sm-9fj
```
