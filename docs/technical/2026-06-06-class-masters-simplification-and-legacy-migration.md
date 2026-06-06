# Class Masters Simplification & Legacy Class Migration

**Tanggal:** 2026-06-06
**Issues:** sm-29y (simplifikasi masters), sm-s98 (migrasi kelas legacy), sm-54i (closed, superseded)
**Tipe:** Data migration (murni SQL via MCP Supabase, 0 perubahan kode aplikasi)
**Status:** ✅ Selesai

---

## Ringkasan

Dua pekerjaan berurutan untuk membersihkan struktur kelas yang berantakan:

1. **sm-29y** — Sederhanakan `class_masters` dari 27 → 19 master standar.
2. **sm-s98** — Migrasi kelas (`classes`) bernama legacy ke kelas standar, lalu hapus kelas legacy.

Tujuan akhir: struktur kelas bersih & konsisten per kelompok, sebagai fondasi onboarding kelompok baru yang lebih mulus.

---

## Bagian 1 — Simplifikasi Class Masters (sm-29y)

### Sebelum: 27 masters (banyak redundan)

Masalah:
- "Orang Tua" dipecah by umur: `Orang Tua (<35)`, `Orang Tua (>35)` — seharusnya 1, umur pakai `tanggal_lahir`.
- Duplikat konsep: `Pra Remaja` vs `SMP 1`, `Remaja` vs `SMA 1`.
- `Pra Nikah` (tanpa nomor) duplikat dengan `Pra Nikah 1`.
- `Aghniya` (0 usage), `KBM`, `Pengajar`, `Lansia` tidak relevan / bisa digabung.

### Sesudah: 19 masters standar

| sort_order | Nama |
|---|---|
| 1 | Kelas Paud |
| 2-7 | Kelas 1 … Kelas 6 |
| 8-10 | SMP 1, SMP 2, SMP 3 |
| 11-13 | SMA 1, SMA 2, SMA 3 |
| 14-17 | Pra Nikah 1 … Pra Nikah 4 |
| 18 | Orang Tua |
| 19 | Pengurus |

### Remapping master lama → baru (di `class_master_mappings`)

| Master Lama | → Master Baru |
|---|---|
| Pra Remaja | SMP 1 |
| Remaja | SMA 1 |
| Pra Nikah (tanpa nomor) | Pra Nikah 1 |
| Orang Tua (<35), Orang Tua (>35), Lansia | Orang Tua |
| Pengajar, KBM | Pengurus |
| Aghniya (0 usage) | DELETE |

### Placeholder `tanggal_lahir` (siswa Orang Tua)

Siswa di kelas Orang Tua belum punya `tanggal_lahir`. Diisi estimasi (hanya yang NULL):
- ex-Orang Tua (<35) → `1995-01-01` (160 siswa)
- ex-Orang Tua (>35) → `1980-01-01` (96 siswa)
- ex-Lansia → `1965-01-01` (28 siswa)

> Catatan: keputusan desain — konsep "kelas Orang Tua by umur" diganti pakai field `tanggal_lahir` real. Kelas Orang Tua tetap ada sebagai 1 master.

---

## Bagian 2 — Migrasi Kelas Legacy (sm-s98)

Setelah masters bersih, tabel `classes` masih punya kelas bernama legacy (master-nya sudah benar, tapi nama kelas tidak standar). Kelas legacy dimigrasi ke kelas standar lalu dihapus.

### Tabel terdampak & FK behavior

| Tabel | FK delete_rule | Aksi |
|---|---|---|
| `student_classes` | CASCADE | repoint `class_id` |
| `teacher_classes` | CASCADE | repoint + dedup |
| `student_enrollments` | NO ACTION | repoint |
| `meetings.class_id` | NO ACTION | repoint scalar |
| `meetings.class_ids[]` (text[]) | - | array replace + DISTINCT dedup |
| `students.class_id` (legacy) | NO ACTION | repoint |
| `class_master_mappings` | CASCADE | auto-delete saat class dihapus |
| `attendance_logs` | - | **tidak ada kolom class — tidak disentuh** |
| `meetings.student_snapshot` (jsonb) | - | hanya student IDs — tidak disentuh (kecuali merge siswa) |

### Mapping kelas legacy → target

| Kelas Legacy | Target | Catatan |
|---|---|---|
| Pra Remaja | SMP 1 | target sudah ada per kelompok |
| Remaja | SMA 1 | target sudah ada |
| Pra Nikah | Pra Nikah 1 | target sudah ada |
| Orang Tua (<35) / (>35) / Lansia | Orang Tua | kelas "Orang Tua" DIBUAT baru di Brangsong & Warlob 1 |

### Hasil distribusi (setelah migrasi)

- Brangsong "Orang Tua" = 119 siswa (gabungan OT<35 + OT>35 + Lansia)
- Warlob 1 "Orang Tua" = 109 siswa
- SMP 1, SMA 1, Pra Nikah 1 terisi sesuai migrasi per kelompok

---

## Bagian 3 — Anomali & Edge Cases yang Ditangani

| Kasus | Penanganan |
|---|---|
| **[TEST] Kelompok Test** (8 siswa dummy E2E) | DIBIARKAN — dipakai untuk E2E testing |
| **Caberawit** (Cibaduyut, no master, 46 meetings) | Migrate ke "Kelas 1" Cibaduyut, hapus kelas |
| **"Kelompok"** (nama harfiah, master=Orang Tua) di Cibaduyut & Warlob 2 | RENAME jadi "Orang Tua" (kelompok belum punya OT lain) |
| **Pengurus Remaja** (Brangsong, 3 master) | Ganti master jadi 1 "Pengurus" (tidak migrate siswa) |
| **Remaja & Pra Nikah** (Brangsong, 70 siswa, 2 master) | Migrate semua ke "SMA 1" Brangsong, hapus |
| **Duplikat "Abu Abdirohman"** (Brangsong inactive, 0 data) | Hapus — yang asli di Warlob 1 (active, 27 attendance) dipertahankan |
| **Duplikat "Dinda"** (Warlob 2, 2 record 1 orang) | Merge → kelas final SMA 1 + Pengajar, 98 attendance (53+45, 0 double) |

---

## Bagian 4 — Pola Migrasi yang Dipakai (Reusable)

### Pola repoint dengan dedup (per junction table)

```sql
-- 1. Hapus baris legacy yang akan duplikat di target (unique constraint protection)
DELETE FROM <junction> j USING <mapping> m
WHERE j.class_id = m.legacy_id
  AND EXISTS (SELECT 1 FROM <junction> t WHERE t.class_id = m.target_id AND t.<key> = j.<key>);
-- 2. Repoint sisanya
UPDATE <junction> j SET class_id = m.target_id
FROM <mapping> m WHERE j.class_id = m.legacy_id;
```

### Edge case: banyak legacy → target sama (teacher_classes)

Saat 3 kelas legacy (OT<35, OT>35, Lansia) map ke target "Orang Tua" yang sama, guru yang mengajar di 3 kelas → 3 baris yang akan collide. Dedup vs existing TIDAK cukup — perlu dedup vs sesama legacy:

```sql
-- Keep hanya 1 per (teacher_id, target_id), hapus sisanya pakai ROW_NUMBER
DELETE FROM teacher_classes tc
USING (
  SELECT tc2.ctid, ROW_NUMBER() OVER (PARTITION BY tc2.teacher_id, m.target_id ORDER BY tc2.ctid) rn
  FROM teacher_classes tc2 JOIN <mapping> m ON tc2.class_id = m.legacy_id
) dup
WHERE tc.ctid = dup.ctid AND dup.rn > 1;
```

### Array dedup (meetings.class_ids text[])

Naive replace bisa bikin duplikat dalam array (`[Pra Remaja, SMP 1]` → `[SMP 1, SMP 1]`). Pakai `DISTINCT`:

```sql
UPDATE meetings mt SET class_ids = sub.new_ids
FROM (
  SELECT mt2.id, ARRAY(SELECT DISTINCT
    COALESCE(m.target_id::text, orig.cid)
    FROM unnest(mt2.class_ids) WITH ORDINALITY orig(cid, ord)
    LEFT JOIN <mapping> m ON m.legacy_id::text = orig.cid ORDER BY orig.ord
  ) AS new_ids
  FROM meetings mt2 WHERE mt2.class_ids && (SELECT array_agg(legacy_id::text) FROM <mapping>)
) sub WHERE mt.id = sub.id;
```

### Merge duplikat siswa

Tabel dengan `student_id` FK: `attendance_logs`, `student_classes`, `student_enrollments`, `student_material_progress`, `student_section_grades`, `student_reports`. Plus `meetings.student_snapshot` (jsonb array).

Repoint dari `duplicate_id` → `keep_id` dengan dedup pada constraint unik, lalu `DELETE FROM students WHERE id = duplicate_id`. Cek 0 overlap meeting dulu untuk pastikan attendance tidak double.

---

## Bagian 5 — Verifikasi Keamanan

Sebelum DELETE kelas (FK NO ACTION), wajib verifikasi 0 referensi tersisa:

```sql
SELECT 'meetings.class_id', COUNT(*) FROM meetings WHERE class_id IN (SELECT legacy_id FROM <mapping>)
UNION ALL SELECT 'meetings.class_ids', COUNT(*) FROM meetings WHERE class_ids && (SELECT array_agg(legacy_id::text) FROM <mapping>)
UNION ALL SELECT 'student_enrollments', COUNT(*) FROM student_enrollments WHERE class_id IN (SELECT legacy_id FROM <mapping>)
UNION ALL SELECT 'students.class_id', COUNT(*) FROM students WHERE class_id IN (SELECT legacy_id FROM <mapping>);
-- SEMUA harus 0
```

### Hasil verifikasi akhir
- ✅ 0 kelas legacy tersisa
- ✅ 0 orphan di `student_classes`, `student_enrollments`, `meetings.class_id`, `class_master_mappings`
- ✅ 0 orphan element di `meetings.class_ids` array
- ✅ Attendance utuh (Dinda 98 logs = 53+45)

---

## Catatan Penting (untuk migrasi serupa di masa depan)

1. **MCP `execute_sql` multi-statement = 1 transaksi.** Jika ada statement gagal di tengah, SEMUA rollback (tidak ada partial update). Aman untuk batch.
2. **Temp table tidak persist antar call MCP** (kemungkinan beda session). Pakai regular table (`CREATE TABLE class_migration_map`), `DROP` di akhir.
3. **Urutan kritis:** buat kelas target dulu → build mapping → repoint → verifikasi 0 ref → delete.
4. **Cleanup duplikat siswa SEBELUM migrasi** supaya record kosong tidak ikut terbawa ke kelas standar.
5. **attendance_logs aman by design** — tidak reference class, hanya meeting+student.

---

## Referensi

- Plan detail: [`docs/plans/2026-06-06-sm-s98-migrasi-kelas-legacy.md`](../plans/2026-06-06-sm-s98-migrasi-kelas-legacy.md)
- Issues: sm-29y, sm-s98 (closed), sm-54i (closed, superseded oleh sm-29y)
- Sisa pekerjaan: sm-7ax (refactor `isCaberawitClass()` pakai sort_order), sm-iqo (drop `category_id`)
