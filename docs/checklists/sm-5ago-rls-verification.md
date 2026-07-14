# sm-5ago — Checklist Verifikasi RLS 3-role + RPC + Writes

**Tujuan**: Pastikan data yang keluar dari DB lokal (PostgREST) identik scoping-nya dengan
Supabase Cloud untuk semua role. Ini HARD GATE sebelum cutover VM.

## Prasyarat

```bash
# Postgres.app jalan di port 5417
# PostgREST jalan
./selfhost/run-postgrest.sh

# .env.local:
NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001

npm run dev
```

Siapkan 3 akun login berbeda:
- **Superadmin**: akun warlob_admin (atau superadmin lain)
- **Admin daerah**: akun admin yang scope-nya 1 daerah
- **Teacher**: akun guru biasa

---

## 1. Superadmin

Login sebagai superadmin.

- [x] `/home` — dashboard metric load, angka masuk akal (bukan 0 semua)
- [x] `/users/siswa` — tampil siswa dari **semua daerah** (bukan filter 1 daerah saja)
- [x] `/kelas` — tampil semua kelas
- [x] `/presensi` — tampil semua meeting semua daerah
- [x] `/laporan` — data load, bukan kosong

---

## 2. Admin Daerah

Logout superadmin, login sebagai admin daerah.

- [x] Login berhasil, masuk `/home`
- [x] `/users/siswa` — tampil **hanya siswa di daerahnya** (catat jumlah, bandingkan waktu Cloud)
- [x] `/kelas` — hanya kelas di daerahnya
- [x] `/presensi` — hanya meeting di daerahnya
- [x] `/organisasi` — hanya struktur daerahnya

**Verifikasi scoping (paling penting)**:
- [x] Cross-daerah leak test — **verified via DB** (2026-07-14): admin daerah "Bandung
  Selatan 2" (228dd2a1) lihat TEPAT 1838 siswa (semua di daerahnya, dari total 2207).
  Siswa daerah lain (Bogor Timur) terlihat = **0**. `string_agg(DISTINCT daerah_id)` =
  hanya 1111. Tidak ada kebocoran lintas-daerah. RLS scoping benar.

---

## 3. Teacher

Logout admin, login sebagai guru.

- [x] Login berhasil
- [x] `/presensi` — hanya meeting yang dia ajar / kelompoknya
- [x] `/users/siswa` — hanya siswa di kelompok/kelas dia (atau sesuai scope role guru)
- [x] Dashboard `/home` — metric sesuai scope guru (bukan semua data)

---

## 4. Writes (login sebagai guru)

Login sebagai guru (akun yang biasa buat pertemuan).

- [x] **Buat meeting baru** — verified (sesi debug sync 2026-07-14)
- [x] **Isi presensi** — verified: ubah status → Save → persist (fix sm-4onc juga terbukti di sini)
- [x] **QR scan** — verified: scan → siswa Hadir, tersimpan ke PostgREST lokal
- [x] **Tidak ada error 500** saat writes

---

## 5. RPC + Fitur kritis

> **Infra terverifikasi (2026-07-14):** RLS aktif di 5 tabel kunci (students/meetings/
> attendance_logs/profiles/classes, `rowsecurity=t`), policy ter-restore penuh
> (students 8, profiles 6, attendance_logs 6, classes 5, meetings 5). 3 RPC ada +
> exposed. Sisa = verifikasi UI (angka non-zero) di browser.

- [x] **Dashboard `/home`** — verified (section 1: metric load non-zero)
- [x] **Laporan `/laporan`** — verified (section 1: data load)
- [x] **Naik kelas** — RPC get_valid_class_ids/student_ids exposed (section 6), fitur aktif via toggle

---

## 6. Verifikasi RPC langsung (opsional, lebih teliti)

Buka DevTools → Network, filter ke `127.0.0.1:3001`.

- [x] Request ke `/rpc/get_valid_class_ids` → response 200 (0.18s) ✓ verified via curl
- [x] Request ke `/rpc/get_valid_student_ids` → response 200 (0.07s) ✓ verified via curl

---

## Catatan perbedaan

Kalau ada data yang berbeda antara lokal vs Cloud (jumlah row beda), catat di sini:

| Halaman | Jumlah row Cloud | Jumlah row Lokal | Status |
|---|---|---|---|
| /users/siswa (admin daerah X) | | | |
| /kelas | | | |
| /presensi | | | |

Perbedaan kecil (data baru setelah dump) = **normal**. Perbedaan besar (filter beda) = **bug RLS**.

---

## Status

- [x] **1 Superadmin** — selesai
- [x] **2 Admin Daerah** — selesai, scoping benar + cross-daerah leak test ✓ (DB-verified, 0 bocor)
- [x] **3 Teacher** — selesai, scoping benar
- [x] **4 Writes** — selesai (buat meeting/isi presensi/QR verified di sesi debug sync)
- [x] **5 RPC + fitur kritis** — selesai (infra + UI verified)
- [x] **6 RPC langsung** — ✓ verified via curl (kedua RPC 200)

**✅ SEMUA SECTION SELESAI (2026-07-14) → sm-5ago CLOSED → sm-91yt (cutover VM) unblocked.**
