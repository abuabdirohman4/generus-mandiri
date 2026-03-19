# Design: Cascading Org Selector untuk Form Manajemen Siswa

**Tanggal:** 2026-03-18
**Status:** Approved

## Latar Belakang

Di halaman `/users/siswa`, form tambah/edit/batch/assign hanya menampilkan dropdown kelas tanpa konteks organisasi. Untuk role yang punya akses luas (superadmin, admin daerah, admin desa, guru daerah, guru desa), daftar kelas sangat panjang dan tidak jelas milik kelompok/desa/daerah mana. Ini membuat input dan edit siswa membingungkan.

## Solusi

Tambahkan cascading selector Daerah → Desa → Kelompok di atas selector Kelas pada 4 form siswa:
1. **StudentModal** (tambah & edit)
2. **Step1Config** (batch import)
3. **AssignStudentsModal** (assign ke kelas)

Selector tampil/tersembunyi sesuai scope role masing-masing, dan kelas yang muncul difilter berdasarkan kelompok yang dipilih.

## Role Matrix

| Role | Daerah | Desa | Kelompok | Kelas |
|------|--------|------|----------|-------|
| Superadmin | selectable | selectable | selectable | filtered |
| Admin Daerah | auto-filled | selectable | selectable | filtered |
| Admin Desa | auto-filled | auto-filled | selectable | filtered |
| Admin Kelompok | hidden | hidden | hidden | semua kelas kelompok |
| Guru Daerah | auto-filled | selectable | selectable | filtered |
| Guru Desa | auto-filled | auto-filled | selectable | filtered |
| Guru Kelompok | hidden | hidden | hidden | kelas assigned saja |

## Arsitektur

### Komponen Reused

**`DataFilter`** (`src/components/shared/DataFilter.tsx`) — komponen filter yang sudah ada, digunakan dengan config:
```
variant="modal", cascadeFilters={true}, hideAllOption={true}, compact={true}, showKelas={false}
```

**`getAutoFilledOrgValues(profile)`** — mengisi nilai awal filter state dari profile user.

### Helper Functions Baru

Di `src/lib/accessControl.ts`, tambah 2 fungsi khusus modal (tidak ubah fungsi existing):

```typescript
modalShouldShowDesaFilter(profile)    // true untuk: superadmin, adminDaerah, teacherDaerah
modalShouldShowKelompokFilter(profile) // true untuk: superadmin, adminDaerah, adminDesa, teacherDaerah, teacherDesa
```

Fungsi baru (bukan override) agar tidak ada regresi pada halaman absensi dan organisasi yang menggunakan `shouldShowKelompokFilter` existing.

### Data Flow

```
UserProfile → getAutoFilledOrgValues() → filters state (daerah/desa/kelompok)
filters state → DataFilter (cascading UI)
filters.kelompok → filteredClasses (kelas dropdown)
filteredClasses → form submission
```

### Cascade Reset

Dihandle oleh `cascadeFilters={true}` di DataFilter:
- Ganti daerah → reset desa, kelompok, kelas
- Ganti desa → reset kelompok, kelas
- Ganti kelompok → reset kelas (dan reset selectedClassId di batch import store)

## Perubahan per File

### 1. `src/lib/accessControl.ts`
- Tambah `modalShouldShowDesaFilter()` dan `modalShouldShowKelompokFilter()`
- Export dari `src/lib/userUtils.ts`

### 2. `StudentModal.tsx`
- Hapus `isAdminDesaUser` inline check
- Ganti dengan DataFilter unified yang muncul untuk semua role (kecuali admin kelompok & guru kelompok)
- Auto-fill `filters` state dari `getAutoFilledOrgValues` saat modal buka
- Update `filteredClasses` useMemo (universal, bukan khusus admin desa)
- Fix form submission — append `kelompok_id` jika ada (tidak conditional ke role)
- Hapus static daerah/desa display boxes

### 3. `BatchImportModal.tsx`
- Tambah `useDaerah()`, `useDesa()`, `useKelompok()` hooks
- Pass ke `Step1Config` sebagai props

### 4. `Step1Config.tsx`
- Extend props: tambah `daerah`, `desa`, `kelompok`
- Tambah local `filters` state dengan auto-fill
- Recompute `availableClasses` berdasarkan `filters.kelompok`
- Tambah DataFilter di atas selector kelas
- Disable "Selanjutnya" jika kelompok belum dipilih (jika diperlukan)

### 5. `AssignStudentsModal.tsx`
- Tambah `useDaerah()`, `useDesa()`, `useKelompok()` secara internal
- Tambah `orgFilters` state dengan auto-fill
- Tambah DataFilter di atas "Pilih Kelas Tujuan"
- Filter kelas berdasarkan `orgFilters.kelompok`
- Hapus `showKelompokInLabel` logic (redundant)

## Edge Cases

1. **Single kelompok scope**: DataFilter menyembunyikan selector jika hanya 1 opsi. `getAutoFilledOrgValues` dan `requiredFields` memastikan kelas tetap tersaring dengan benar.
2. **Teacher daerah/desa class access**: Server action `getAllClasses()` sudah scope-aware via RLS — tidak ada perubahan server side.
3. **Edit mode**: `filters` diinisialisasi dari data student yang sedang diedit, fallback ke auto-fill dari profile.

## Testing

**Unit tests:** `modalShouldShowDesaFilter` dan `modalShouldShowKelompokFilter` per semua role.

**E2E:** Test setiap role di setiap form — verifikasi selector yang tampil sesuai matrix, kelas terfilter setelah pilih kelompok, cascade reset berjalan benar.
