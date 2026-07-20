# Plan: Fix performa RLS `meetings` — tab Profil siswa timeout pasca-cutover

**Issue:** sm-\<TBD\> / GH-#\<TBD\> — terkait `sm-2bx` (RLS junction tables)
**Tanggal:** 2026-07-20
**Tipe:** bugfix (performa) — regresi terlihat setelah cutover self-host data plane
**Estimasi:** Fix A kecil (~1 file, kode saja). Fix B sedang (perlu uji di salinan DB lokal).

---

## Gejala

Setelah cutover data plane ke VM (2026-07-20 07:26 CST), buka halaman detail siswa
tab **Profil** → error **"Gagal memuat data overview"**.

Server log:

```
code: '57014'
message: 'canceling statement due to statement timeout'
  at getStudentAttendanceHistory (users/siswa/actions/students/actions.ts:1584)
  at getStudentOverview      (users/siswa/actions/overview.ts:47)
```

Tab **Biodata** normal dan cepat. Halaman **Presensi** juga normal dan cepat.

---

## Akar masalah (terukur, bukan dugaan)

Biaya evaluasi **policy RLS tabel `meetings`**.

| Query pada `meetings` (3.475 baris) | Waktu |
|---|---|
| Tanpa RLS (superuser) | **1,99 ms** |
| `count(*)` sebagai role `authenticated` | **>120 detik** (tak selesai) |

Tabelnya sendiri sehat. Yang mahal adalah **predikat RLS-nya**, dan biayanya
**linear terhadap jumlah baris `meetings` yang harus dievaluasi**.

Penyebab predikat mahal — policy `meetings` memanggil helper berkali-kali per baris
di dalam `CASE` bersarang + subquery ke `classes`/`kelompok`/`desa` + `ANY(class_ids)`:

```
get_user_role(), get_user_kelompok_id(), get_user_desa_id(), get_user_daerah_id()
```

Keempatnya ditulis **PL/pgSQL** (`BEGIN ... RETURN (SELECT ...) ... END`). Postgres
**tidak bisa meng-inline** fungsi PL/pgSQL, jadi setiap panggilan = invokasi penuh +
query SPI ke `profiles`.

### Kenapa Presensi cepat tapi Profil lambat — ini kunci fix-nya

Bukan soal batching/chunking. Yang menentukan **berapa kali predikat RLS dievaluasi**:

| Tempat | Bentuk query | Evaluasi RLS |
|---|---|---|
| `presensi/actions/meetings/queries.ts:14` | `.from('meetings').eq('id', meetingId)` | PK index → **1 baris** → cepat |
| `presensi/actions/meetings/queries.ts:68` | `.from('meetings').order(...).limit(n)` | dibatasi `LIMIT` → terkendali |
| **`users/siswa/actions/students/queries.ts:484`** | `.from('attendance_logs')` + **`meetings!inner(...)`** | `meetings` jadi **embed** → predikat kena banyak baris → **15–18 detik** |

Query `attendance_logs` sendirian (filter `student_id` + rentang tanggal) = **23 ms**.
Baru setelah `meetings!inner` ikut, meledak.

### Kenapa dulu aman di Supabase Cloud

Policy-nya identik (dipindah apa adanya lewat dump). Hardware Cloud cukup kuat
sehingga tetap lolos di bawah `statement_timeout` 8 detik. VM (2 vCPU, 3,6GB) hanya
**menyingkap cacat yang sudah lama ada** — bukan menciptakannya.

---

## Mitigasi yang SUDAH terpasang (sementara)

| Perubahan | Status | Catatan |
|---|---|---|
| `alter role authenticated set statement_timeout = '30s'` (dari 8s) | aktif | Plester — halaman terbuka tapi lambat ~15–18 dtk. **Turunkan balik ke 8s setelah fix.** |
| 4 helper `VOLATILE` → `STABLE` | aktif | Benar secara semantik (fungsinya murni baca), tapi **tidak cukup sendirian** — PL/pgSQL tetap tak bisa di-inline. Biarkan. |

---

## Fix A — pecah embed jadi dua query (**disarankan dikerjakan lebih dulu**)

Tiru pola yang sudah terbukti cepat di Presensi: jangan embed `meetings`, ambil
terpisah lewat primary key.

Target: `src/app/(admin)/users/siswa/actions/students/queries.ts:484`
(`fetchStudentAttendanceHistory`)

```
Sekarang:
  attendance_logs.select('..., meetings!inner(..., activity_types(...), classes(...))')
    .eq(student_id).gte(date).lte(date)

Jadi:
  1. attendance_logs.select('id,date,status,reason,meeting_id')
       .eq(student_id).gte(date).lte(date)          -> ~23 ms
  2. meetings.select('...').in('id', meetingIds)     -> PK index, sedikit baris
  3. gabungkan di JS (bentuk hasil akhir harus sama persis)
```

Catatan penting saat implementasi:

- Bentuk objek hasil **wajib identik** dengan sekarang. Pemanggil di `actions.ts:1546`
  membaca `log.meetings.class_id` dan `log.meetings.class_ids` — jangan sampai berubah.
- `meetings!inner` bersifat **INNER JOIN**: baris `attendance_logs` yang meeting-nya
  tak terlihat (kena RLS) **ikut terbuang**. Setelah dipecah, sifat itu harus
  dipertahankan — buang baris yang `meeting_id`-nya tidak ada di hasil query 2.
- Embed bertingkat `activity_types` dan `classes` ikut pindah ke query 2.

**Kelebihan:** nol sentuhan database, nol risiko lock, pola sudah terbukti di produksi,
deploy lewat CI seperti biasa.
**Keterbatasan:** hanya menyembuhkan halaman ini.

---

## Fix B — tulis ulang 4 helper jadi SQL `STABLE` (sistemik, uji dulu)

```sql
create or replace function public.get_user_role() returns text
  language sql stable security definer as $$
    select coalesce((select role from profiles where id = auth.uid()), 'guest') $$;
-- idem: get_user_daerah_id, get_user_desa_id, get_user_kelompok_id (returns uuid)
```

Fungsi **SQL** bisa di-inline planner → bisa diangkat keluar dari evaluasi per-baris.

**Kelebihan:** menyembuhkan **semua** halaman yang menyentuh `meetings` sekaligus —
Dashboard (overview + monitoring), Kegiatan, Users/Guru, Presensi.
**Risiko:** rendah (mengunci fungsi, bukan tabel) — tapi **wajib diukur dulu di salinan
DB lokal**, karena belum terbukti.

**Belum tervalidasi.** Percobaan mengukurnya di server gagal (lihat Guardrail di bawah).

### Kandidat cadangan

- `random_page_cost` 4 → 1.1 (default 4 itu untuk hard disk; VM ini SSD). Bisa diuji
  per-sesi tanpa mengubah apa pun.
- Menyederhanakan policy `meetings` — **risiko tinggi**, mengunci tabel. Pilihan terakhir.

---

## Urutan eksekusi

| Tahap | Aksi | Tempat |
|---|---|---|
| 0 | ✅ Stabilkan — `statement_timeout` 30s | sudah, di prod |
| 1 | **Fix A** — pecah embed, uji lokal, deploy lewat CI | laptop → CI |
| 2 | **Fix B** — ukur di salinan DB **lokal** (`selfhost/restore-local.sh`), sebelum/sesudah | laptop |
| 3 | Kalau Fix B terbukti → terapkan ke prod saat **jam sepi 02:00–05:00 WIB** | prod |
| 4 | Turunkan `statement_timeout` balik ke **8s**, verifikasi tidak ada `57014` | prod |

---

## Guardrail — pelajaran dari insiden saat investigasi (2026-07-20)

Dua kesalahan nyata terjadi saat mendiagnosis ini **langsung di produksi**:

1. **`ALTER POLICY` di prod saat jam kerja.** Statement-nya menunggu lock, lalu memegang
   `AccessExclusiveLock` pada `meetings` ~4 menit → **memblokir total** semua query ke
   tabel itu. Lebih parah daripada sekadar lambat.
   → **Jangan pernah DDL tabel di prod saat ada traffic.**

2. **Menjalankan beban benchmark di box prod.** Membuat DB uji + `count(*)` di mesin
   yang sama membuat load naik ke 3,0 di box **2 vCPU**; query user asli molor dari
   ~15 → 29 detik dan memicu 8× timeout `57014`.
   → **Uji di laptop, jangan di server produksi.** Repo sudah menyediakan
   `selfhost/restore-local.sh` persis untuk ini.

Keduanya sudah dibersihkan: sesi di-terminate, DB uji di-drop, policy `meetings`
terverifikasi utuh (5 policy, nama asli, 0 termodifikasi — DDL Postgres transaksional).

---

## Verifikasi setelah fix

- [ ] Tab **Profil** siswa terbuka < 2 detik (uji ID `690ae5b4-b2bc-4f41-88c8-61fadac07af1`)
- [ ] Isi tab Profil **sama persis** dengan sebelum fix (presensi bulanan + semester)
- [ ] Tab **Biodata** dan halaman **Presensi** tidak berubah perilakunya
- [ ] Filter per-kelas di riwayat kehadiran masih benar (`classId` opsional)
- [ ] Guru hanya melihat absensi kelasnya sendiri (RLS + filter role di `actions.ts:1544`)
- [ ] Nol `57014` di log setelah `statement_timeout` diturunkan balik ke 8s

---

## Rujukan

- Runbook operasional: `~/server/docs/selfhost-supabase-generus-mandiri.md` — Temuan #4
- Issue terkait: **`sm-2bx` / GH-#27** — RLS mati di `teacher_classes`, `student_classes`,
  `report_template_classes`. Beririsan: policy `meetings` ikut menyentuh `classes`.
- Query lambat: `src/app/(admin)/users/siswa/actions/students/queries.ts:484`
- Pola cepat sebagai contoh: `src/app/(admin)/presensi/actions/meetings/queries.ts:14`
