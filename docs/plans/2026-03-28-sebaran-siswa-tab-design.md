# Design: Tab "Sebaran Siswa" di Halaman `/users/siswa`

**Date:** 2026-03-28
**Status:** Approved

---

## Overview

Menambahkan tab **"Sebaran Siswa"** di halaman `/users/siswa` untuk memungkinkan admin dan guru dengan scope lintas-kelompok memantau distribusi siswa per organisasi — untuk memantau kelengkapan data siswa dan mengetahui kelompok mana yang belum mengisi data siswa.

---

## Urutan Tab

```
[Daftar Siswa] [Sebaran Siswa] [Pending Transfer]
```

---

## Visibilitas Tab

Tab **ditampilkan** untuk:
- Superadmin
- Admin Daerah, Admin Desa
- Guru Daerah, Guru Desa
- Admin Kelompok dengan multi-kelompok (deteksi via `classes` array)
- Guru Kelompok dengan multi-kelompok (deteksi via `classes` array)

Tab **tidak ditampilkan** untuk:
- Teacher biasa (classroom teacher — tidak punya org scope)

**Khusus Admin/Guru Kelompok single-kelompok**: Tab tetap ditampilkan tapi langsung menampilkan breakdown kelas (tanpa level kelompok di atas).

### Deteksi Multi-Kelompok (Admin/Guru Kelompok)

```typescript
const uniqueKelompoks = new Set(profile.classes?.map(c => c.kelompok_id))
const isMultiKelompok = uniqueKelompoks.size > 1
```

---

## Hierarki Drill-down per Role

| Role | Level 1 | Level 2 | Level 3 | Level 4 |
|------|---------|---------|---------|---------|
| Superadmin | Daerah | Desa | Kelompok | Kelas |
| Admin Daerah / Guru Daerah | Desa | Kelompok | Kelas | — |
| Admin Desa / Guru Desa | Kelompok | Kelas | — | — |
| Admin/Guru Kelompok (multi-kelompok) | Kelompok | Kelas | — | — |
| Admin/Guru Kelompok (single-kelompok) | Kelas | — | — | — |

---

## Layout

### Stats Bar

Ditampilkan di atas daftar, menyesuaikan scope user:

```
[Total: 8 Desa] [Total: 24 Kelompok] [Total: 124 Siswa] [⚠️ 3 Kelompok Kosong]
```

- Superadmin/Admin Daerah/Guru Daerah: tampil Desa + Kelompok + Siswa + Kelompok Kosong
- Admin Desa/Guru Desa: tampil Kelompok + Siswa + Kelompok Kosong
- Admin/Guru Kelompok multi: tampil Kelompok + Siswa + Kelompok Kosong
- Admin/Guru Kelompok single: tampil Kelas + Siswa

### Daftar Expand/Collapse

**Superadmin — Level Daerah:**
```
▶ Daerah Jakarta          124 siswa  |  3 desa
▶ ⚠️ Daerah Bekasi          0 siswa  |  2 desa
```

**Expand Daerah → Level Desa:**
```
▼ Daerah Jakarta          124 siswa  |  3 desa
   ▶ Desa Sukamaju         45 siswa  |  3 kelompok
   ▶ ⚠️ Desa Cibogo          0 siswa  |  2 kelompok
```

**Expand Desa → Level Kelompok:**
```
▼ Desa Sukamaju            45 siswa  |  3 kelompok
   ▶ Kelompok Nambo        15 siswa  |  3 kelas
   ▶ Kelompok Maji          8 siswa  |  2 kelas
   ▶ ⚠️ Kelompok Ciawi       0 siswa  |  1 kelas
```

**Expand Kelompok → Level Kelas (leaf node):**
```
▼ Kelompok Nambo           15 siswa  |  3 kelas
   └─ Pra Nikah             8 siswa
   └─ Remaja                5 siswa
   └─ Pengajar              2 siswa
```

---

## Penanda "Kosong"

- **Definisi kosong**: Kelompok dengan total 0 siswa aktif (`status = 'active' AND deleted_at IS NULL`)
- **Visual**: Ikon ⚠️ di depan nama + highlight warna kuning/oranye pada baris
- Daerah/Desa juga diberi ⚠️ jika **semua** kelompok di dalamnya kosong

---

## Data Requirements

### Query yang Dibutuhkan

Server action baru: `getSebaranSiswa(profile)` yang mengembalikan data hierarkis sesuai scope user.

Data yang dibutuhkan per node:
- `id`, `name`
- `total_students` (count aktif)
- `children` (array level di bawahnya)

Sumber data:
- `daerah`, `desa`, `kelompok` tables (org hierarchy)
- `students` table (`status = 'active' AND deleted_at IS NULL`, filter by org scope)
- `classes` table (untuk level kelas)
- `student_classes` junction (untuk count siswa per kelas)

### Filter Scope (mengikuti pola `getDataFilter` yang sudah ada)

- Superadmin: semua data
- Admin/Guru Daerah: filter by `daerah_id`
- Admin/Guru Desa: filter by `desa_id`
- Admin/Guru Kelompok: filter by `kelompok_id` (atau multiple via `classes`)

---

## Komponen Baru

```
src/app/(admin)/users/siswa/
  components/
    SebaranSiswa/
      SebaranSiswaTab.tsx        # Container utama tab
      SebaranSiswaStats.tsx      # Stats bar
      SebaranSiswaTree.tsx       # Daftar expand/collapse
      SebaranSiswaNode.tsx       # Satu baris node (reusable untuk semua level)
  actions/
    sebaranSiswa.ts              # Server action getSebaranSiswa()
  hooks/
    useSebaranSiswa.ts           # SWR hook
```

---

## Keputusan Desain

- **Read-only**: Tidak ada aksi dari tab ini. Admin menghubungi admin kelompok secara manual.
- **Kelompok kosong = 0 siswa**: Kelas kosong dalam kelompok yang sudah punya siswa tidak ditandai.
- **Expand/collapse**: State disimpan di local component state (tidak perlu persist ke store).
- **Tidak ada pagination**: Maksimal puluhan kelompok per desa, cukup dengan scroll.
