# Plan: Migrasi Kelas Legacy → Kelas Standar (sm-s98)

## Context

Setelah sm-29y menyederhanakan **class_masters** (27→19), masih ada **kelas** (table `classes`) dengan nama legacy yang master-nya sudah benar tapi nama kelas-nya tidak standar. Idealnya kelas legacy dihapus dan siswanya dipindah ke kelas standar yang nama + master-nya sesuai, supaya struktur kelas bersih dan konsisten per kelompok.

**Tujuan:** Migrasi data dari kelas legacy ke kelas standar (existing atau baru dibuat), lalu hapus kelas legacy — tanpa kehilangan data attendance, enrollment, atau meeting history.

**Prinsip keamanan:** Semua migrasi dalam satu transaksi per kelompok, verifikasi sebelum delete, backup count sebelum/sesudah.

---

## Scope

### IN SCOPE (kelas legacy yang dimigrasi)

| Kelas Legacy | Target | Kelompok | Catatan |
|---|---|---|---|
| Pra Remaja | SMP 1 | Brangsong, Warlob 1/2, Cibaduyut, Barujati | target EXISTS |
| Remaja | SMA 1 | Brangsong, Warlob 1/2, Cibaduyut, Barujati | target EXISTS |
| Pra Nikah | Pra Nikah 1 | Brangsong, Barujati, Cibaduyut, Warlob 1/2 | target EXISTS |
| Orang Tua (<35) | Orang Tua | Brangsong, Warlob 1 | target **CREATE** |
| Orang Tua (>35) | Orang Tua | Brangsong, Warlob 1 | target **CREATE** |
| Lansia | Orang Tua | Brangsong, Warlob 1 | target **CREATE** |

### KELAS GABUNGAN BRANGSONG — Keputusan FINAL (Fase 8)

- **Pengurus Remaja** (`16ff47d1-3a98-45fd-a0ec-f0ffb6c2effc`, 19 siswa, master: SMP1+SMA1+PraNikah1) → **GANTI MASTER ke Pengurus**. Tidak migrate siswa, kelas tetap. Hanya betulkan class_master_mappings.
- **Remaja & Pra Nikah** (`22222222-2222-2222-2222-222222222223`, 70 siswa, master: SMA1+PraNikah1) → **MIGRATE semua siswa ke "SMA 1" Brangsong** (`4189c8c4-4635-49e1-bc68-8d7d2024d849`), lalu hapus kelas. Pola sama dgn Fase 3. Overlap dgn target=0, overlap dgn Remaja legacy=0.

### OUT OF SCOPE (handle terpisah/nanti)

- **KBM, Pengajar, Pengurus Kelompok** — master sudah benar (Pengurus), nama beda tapi user bilang sudah OK, skip
- **Kelas Paud Siang/Sore** (Brangsong) — variasi waktu valid, skip

### ANOMALI — Keputusan FINAL (sudah dikonfirmasi user)

| Kelas | ID | Kelompok | Siswa | Keputusan |
|---|---|---|---|---|
| [TEST] Kelas 1/2 + kelompok test | `dddddddd...` | [TEST] Kelompok Test | 8 | **BIARKAN** — dipakai untuk E2E testing, jangan sentuh |
| Caberawit | `21881454-9208-4b7a-99e1-76e632bc26f0` | Cibaduyut | 1 (SHABIRA LYZA QONITA) | **MIGRATE** siswa ke "Kelas 1" Cibaduyut (`61b3b180-50bc-4c96-8fe4-9253ec6c379b`), lalu hapus kelas |
| Kelompok | `57b1c15b-055f-4e8b-8792-b9bcf3c50ae3` (Cibaduyut), `db0e7c70-7745-4ab6-94ed-7194d08c4c1d` (Warlob 2) | - | 53+2 | **RENAME** jadi "Orang Tua" (master sudah benar, kedua kelompok belum punya kelas OT lain — aman rename tanpa migrate) |

> **Pra Remaja** ID `11111111-1111-1111-1111-111111111112` (Brangsong, 6 siswa) = kelas asli, masuk migrasi normal (bukan test).
> **Caberawit** master = NULL → tidak ada class_master_mappings, aman dihapus setelah migrate siswa.

---

## Data Terdampak (Volume)

| Tabel | Rows (legacy) | FK delete_rule | Aksi |
|---|---|---|---|
| `student_classes` | 280 | CASCADE | UPDATE class_id (0 overlap siswa) |
| `teacher_classes` | 15 | CASCADE | UPDATE + ON CONFLICT (6 overlap) |
| `student_enrollments` | 289 | NO ACTION | UPDATE class_id (0 konflik unique) |
| `meetings.class_id` | 205 | NO ACTION | UPDATE scalar |
| `meetings.class_ids[]` | 229 | - | array_replace + **DEDUP** |
| `students.class_id` (legacy) | 279 | NO ACTION | UPDATE |
| `student_reports` | 0 | NO ACTION | skip |
| `report_templates` | 0 | NO ACTION | skip |
| `attendance_logs` | - | - | **tidak ada kolom class — AMAN** |
| `meetings.student_snapshot` | - | - | hanya student IDs — **AMAN** |
| `class_master_mappings` | 21 | CASCADE | auto-delete saat class dihapus |

---

## Strategi Eksekusi (Murni SQL via MCP, 0 perubahan kode)

**Pendekatan:** Build mapping `legacy_id → target_id` sekali, lalu jalankan UPDATE per tabel dengan join ke mapping. Verifikasi count, baru DELETE kelas legacy.

### Fase 0: Pre-flight & Backup + Cleanup duplikat siswa

1. Snapshot count siswa per kelas legacy + target (untuk verifikasi akhir).
2. **Hapus duplikat "Abu Abdirohman" Brangsong** (`3e32dbe9-31ff-43ae-8a31-dc229556816d`):
   - Record ini duplikat dari yang asli di Warlob 1 (`9c70a8d0-f268-4ff5-ad3e-52e4b2f7717e`, active, 27 attendance).
   - Brangsong record: status=inactive, **0 attendance, 0 enrollment, 0 snapshot, 0 material/grades/reports**, hanya 2 student_classes (Lansia + Remaja & Pra Nikah) yang CASCADE.
   - Hapus PALING AWAL supaya tidak terbawa migrasi ke SMA 1/Orang Tua.
   ```sql
   DELETE FROM students WHERE id = '3e32dbe9-31ff-43ae-8a31-dc229556816d';
   -- student_classes ikut CASCADE. Verifikasi: SELECT COUNT(*) FROM students WHERE id='3e32dbe9...'; -- 0
   ```
3. Buat temp mapping table (atau CTE reusable) `legacy_id → target_id`.

### Fase 1: Buat kelas "Orang Tua" untuk Brangsong & Warlob 1

Kelas target "Orang Tua" belum ada di 2 kelompok ini. Buat dulu + mapping ke master "Orang Tua" (`d0672e7b-6c3a-4c3e-8792-ec8510db2e12`).

```sql
-- Brangsong (kelompok_id: cccccccc-cccc-cccc-cccc-cccccccccccc)
INSERT INTO classes (id, name, kelompok_id) VALUES (gen_random_uuid(), 'Orang Tua', 'cccccccc-cccc-cccc-cccc-cccccccccccc') RETURNING id;
-- Warlob 1 (ambil kelompok_id dari query)
INSERT INTO classes (id, name, kelompok_id) VALUES (gen_random_uuid(), 'Orang Tua', '<warlob1_kelompok_id>') RETURNING id;
-- Mapping ke master Orang Tua untuk kedua kelas baru
INSERT INTO class_master_mappings (class_id, class_master_id) VALUES (<new_class_id>, 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12');
```

> Verifikasi nama kolom `classes` dulu (id, name, kelompok_id) — confirmed dari schema.

### Fase 2: Build Mapping legacy→target

```sql
-- Mapping reusable (jalankan sebagai CTE di tiap UPDATE, atau buat temp table)
CREATE TEMP TABLE class_migration_map AS
SELECT c.id AS legacy_id, t.id AS target_id, c.name AS legacy_name, c.kelompok_id
FROM classes c
JOIN classes t ON t.kelompok_id = c.kelompok_id AND t.name = CASE c.name
  WHEN 'Pra Remaja' THEN 'SMP 1'
  WHEN 'Remaja' THEN 'SMA 1'
  WHEN 'Pra Nikah' THEN 'Pra Nikah 1'
  WHEN 'Lansia' THEN 'Orang Tua'
  WHEN 'Orang Tua (<35)' THEN 'Orang Tua'
  WHEN 'Orang Tua (>35)' THEN 'Orang Tua'
END
WHERE c.name IN ('Pra Remaja','Remaja','Pra Nikah','Lansia','Orang Tua (<35)','Orang Tua (>35)');
```

> **CRITICAL:** Jalankan Fase 2 SETELAH Fase 1 (kelas Orang Tua sudah ada), supaya Lansia/OT punya target. Cek `SELECT * FROM class_migration_map` → harus tidak ada target_id NULL. Jika ada NULL = kelas target belum dibuat.

### Fase 3: UPDATE tabel referensi (urutan bebas, kecuali teacher_classes dedup)

**3a. student_classes** (UNIQUE student_id+class_id, 0 overlap → aman)
```sql
UPDATE student_classes sc SET class_id = m.target_id
FROM class_migration_map m WHERE sc.class_id = m.legacy_id;
```

**3b. teacher_classes** (UNIQUE teacher_id+class_id, 6 overlap → hapus duplikat dulu)
```sql
-- Hapus baris legacy yang teacher-nya sudah ada di target
DELETE FROM teacher_classes tc USING class_migration_map m
WHERE tc.class_id = m.legacy_id
  AND EXISTS (SELECT 1 FROM teacher_classes t2 WHERE t2.class_id = m.target_id AND t2.teacher_id = tc.teacher_id);
-- Repoint sisanya
UPDATE teacher_classes tc SET class_id = m.target_id
FROM class_migration_map m WHERE tc.class_id = m.legacy_id;
```

**3c. student_enrollments** (UNIQUE student+year+semester, 0 konflik → aman)
```sql
UPDATE student_enrollments e SET class_id = m.target_id
FROM class_migration_map m WHERE e.class_id = m.legacy_id;
```

**3d. meetings.class_id** (scalar)
```sql
UPDATE meetings mt SET class_id = m.target_id
FROM class_migration_map m WHERE mt.class_id = m.legacy_id;
```

**3e. meetings.class_ids[]** (array — replace + DEDUP, ada kasus duplikat nyata)
```sql
-- Untuk tiap meeting yang punya legacy di array: replace lalu dedup
UPDATE meetings mt
SET class_ids = sub.new_ids
FROM (
  SELECT mt2.id,
    ARRAY(SELECT DISTINCT cid FROM (
      SELECT COALESCE(m.target_id::text, orig.cid) AS cid
      FROM unnest(mt2.class_ids) WITH ORDINALITY AS orig(cid, ord)
      LEFT JOIN class_migration_map m ON m.legacy_id::text = orig.cid
      ORDER BY orig.ord
    ) z) AS new_ids
  FROM meetings mt2
  WHERE mt2.class_ids && (SELECT array_agg(legacy_id::text) FROM class_migration_map)
) sub
WHERE mt.id = sub.id;
```
> DISTINCT menghilangkan duplikat (kasus `[Pra Remaja, SMP 1]` → `[SMP 1]`). Verifikasi tidak ada array dengan element NULL/kosong setelahnya.

**3f. students.class_id** (legacy field)
```sql
UPDATE students s SET class_id = m.target_id
FROM class_migration_map m WHERE s.class_id = m.legacy_id;
```

### Fase 4: Verifikasi sebelum DELETE

```sql
-- Tidak boleh ada lagi referensi ke legacy class di tabel NO ACTION
SELECT 'meetings.class_id' tbl, COUNT(*) FROM meetings WHERE class_id IN (SELECT legacy_id FROM class_migration_map)
UNION ALL SELECT 'meetings.class_ids', COUNT(*) FROM meetings WHERE class_ids && (SELECT array_agg(legacy_id::text) FROM class_migration_map)
UNION ALL SELECT 'student_enrollments', COUNT(*) FROM student_enrollments WHERE class_id IN (SELECT legacy_id FROM class_migration_map)
UNION ALL SELECT 'students.class_id', COUNT(*) FROM students WHERE class_id IN (SELECT legacy_id FROM class_migration_map);
-- SEMUA harus 0. Jika ada >0 → STOP, jangan delete.
```

### Fase 5: DELETE kelas legacy

```sql
-- class_master_mappings & student_classes & teacher_classes ikut CASCADE
DELETE FROM classes WHERE id IN (SELECT legacy_id FROM class_migration_map);
DROP TABLE class_migration_map;
```

### Fase 6: Verifikasi akhir

```sql
-- Total siswa per kelas target naik sesuai jumlah migrasi
-- Tidak ada kelas dengan nama legacy tersisa (kecuali yang skip)
SELECT name, COUNT(*) FROM classes
WHERE name IN ('Pra Remaja','Remaja','Pra Nikah','Lansia','Orang Tua (<35)','Orang Tua (>35)')
GROUP BY name;
-- Expected: 0 rows

-- Cek attendance tetap utuh (sampling salah satu meeting yang dimigrasi)
SELECT COUNT(*) FROM attendance_logs al
JOIN meetings m ON m.id = al.meeting_id
WHERE m.class_id IN (SELECT id FROM classes WHERE name IN ('SMP 1','SMA 1','Orang Tua'));
```

---

## Fase 7 — Anomali (eksekusi setelah migrasi utama)

### 7a. Rename "Kelompok" → "Orang Tua" (Cibaduyut + Warlob 2)
Master sudah benar, kedua kelompok belum punya kelas OT lain → cukup rename.
```sql
UPDATE classes SET name = 'Orang Tua'
WHERE id IN ('57b1c15b-055f-4e8b-8792-b9bcf3c50ae3','db0e7c70-7745-4ab6-94ed-7194d08c4c1d');
```

### 7b. Caberawit → migrate SHABIRA ke Kelas 1, hapus kelas
Target: "Kelas 1" Cibaduyut = `61b3b180-50bc-4c96-8fe4-9253ec6c379b`.
Caberawit = `21881454-9208-4b7a-99e1-76e632bc26f0` (no master, tidak ada class_master_mappings).

```sql
-- Repoint semua referensi Caberawit → Kelas 1 (gunakan pola sama dgn Fase 3, single mapping)
-- student_classes (cek dulu siswa belum di Kelas 1 — SHABIRA, kemungkinan belum)
DELETE FROM student_classes sc WHERE sc.class_id = '21881454-9208-4b7a-99e1-76e632bc26f0'
  AND EXISTS (SELECT 1 FROM student_classes t WHERE t.class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' AND t.student_id = sc.student_id);
UPDATE student_classes SET class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' WHERE class_id = '21881454-9208-4b7a-99e1-76e632bc26f0';
-- teacher_classes (jika ada)
DELETE FROM teacher_classes tc WHERE tc.class_id = '21881454-9208-4b7a-99e1-76e632bc26f0'
  AND EXISTS (SELECT 1 FROM teacher_classes t WHERE t.class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' AND t.teacher_id = tc.teacher_id);
UPDATE teacher_classes SET class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' WHERE class_id = '21881454-9208-4b7a-99e1-76e632bc26f0';
-- student_enrollments, meetings, students.class_id (sama pola)
UPDATE student_enrollments SET class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' WHERE class_id = '21881454-9208-4b7a-99e1-76e632bc26f0';
UPDATE meetings SET class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' WHERE class_id = '21881454-9208-4b7a-99e1-76e632bc26f0';
UPDATE students SET class_id = '61b3b180-50bc-4c96-8fe4-9253ec6c379b' WHERE class_id = '21881454-9208-4b7a-99e1-76e632bc26f0';
-- class_ids array (dedup) — jika Caberawit ada di array meeting
-- (jalankan varian Fase 3e dengan single legacy→target)
-- Verifikasi 0 referensi lalu hapus
DELETE FROM classes WHERE id = '21881454-9208-4b7a-99e1-76e632bc26f0';
```

### 7c. [TEST] Kelompok Test → BIARKAN
Tidak ada aksi. Dipakai untuk E2E testing.

### 7d. Merge duplikat siswa "Dinda" (Warlob 2)
Ada 2 record Dinda yang sebenarnya 1 orang:
- **KEEP** `97070e52-6632-4005-bfe6-6e9eda212024` ("Dinda", tgl lahir 1995-01-01) — kelas: Kelompok(→OT) + Pengajar(→Pengurus)
- **HAPUS** `de5942d0-15d8-4048-a419-63cefbf32f38` ("Dinda " trailing space, tgl null) — kelas: Remaja(→SMA 1)

**KELAS FINAL Dinda yang diinginkan = SMA 1 + Pengurus** (hapus dari Orang Tua).
> **Verified:** Dinda TIDAK punya attendance/meeting terkait kelas "Kelompok"/Orang Tua Warlob 2 (0 record) → aman hapus student_class ke OT tanpa kehilangan history.

Data de5942d0: 45 attendance_logs, 47 meetings di student_snapshot, 1 student_class (Remaja), enrollments.
**0 overlap meeting** antara keduanya → merge attendance aman (tidak ada double).

> **CRITICAL ORDER:** Jalankan 7d **SETELAH** migrasi utama (Fase 3-5) DAN Fase 7a (rename "Kelompok"→"Orang Tua"). Setelah itu: Dinda kedua "Remaja"→"SMA 1", Dinda1 "Kelompok"→"Orang Tua", "Pengajar"→"Pengurus".

```sql
-- 0. Hapus Dinda1 dari kelas Orang Tua (ex-"Kelompok" db0e7c70) — kelas final = SMA1+Pengurus saja
DELETE FROM student_classes
WHERE student_id = '97070e52-6632-4005-bfe6-6e9eda212024'
  AND class_id = 'db0e7c70-7745-4ab6-94ed-7194d08c4c1d';
```

```sql
-- 1. Repoint attendance_logs (0 overlap, aman langsung)
UPDATE attendance_logs SET student_id = '97070e52-6632-4005-bfe6-6e9eda212024'
WHERE student_id = 'de5942d0-15d8-4048-a419-63cefbf32f38';

-- 2. Repoint student_classes dengan dedup (jika Dinda1 sudah di kelas yg sama)
DELETE FROM student_classes sc WHERE sc.student_id = 'de5942d0-15d8-4048-a419-63cefbf32f38'
  AND EXISTS (SELECT 1 FROM student_classes t WHERE t.student_id = '97070e52-6632-4005-bfe6-6e9eda212024' AND t.class_id = sc.class_id);
UPDATE student_classes SET student_id = '97070e52-6632-4005-bfe6-6e9eda212024'
WHERE student_id = 'de5942d0-15d8-4048-a419-63cefbf32f38';

-- 3. student_enrollments dengan dedup (UNIQUE student+year+semester)
DELETE FROM student_enrollments e WHERE e.student_id = 'de5942d0-15d8-4048-a419-63cefbf32f38'
  AND EXISTS (SELECT 1 FROM student_enrollments t WHERE t.student_id = '97070e52-6632-4005-bfe6-6e9eda212024'
    AND t.academic_year_id = e.academic_year_id AND t.semester = e.semester);
UPDATE student_enrollments SET student_id = '97070e52-6632-4005-bfe6-6e9eda212024'
WHERE student_id = 'de5942d0-15d8-4048-a419-63cefbf32f38';

-- 4. student_snapshot di meetings (47 meetings) — replace + dedup
UPDATE meetings m
SET student_snapshot = (
  SELECT to_jsonb(ARRAY(SELECT DISTINCT
    CASE WHEN elem = 'de5942d0-15d8-4048-a419-63cefbf32f38'
      THEN '97070e52-6632-4005-bfe6-6e9eda212024' ELSE elem END
    FROM jsonb_array_elements_text(m.student_snapshot) elem))
)
WHERE m.student_snapshot @> '["de5942d0-15d8-4048-a419-63cefbf32f38"]'::jsonb;

-- 5. Cek tabel lain yang reference student_id (transfer, biodata, dll) — verifikasi dulu
-- (jika ada student_reports, transfer_requests, dll yang reference de5942d0)

-- 6. Hapus record Dinda duplikat
DELETE FROM students WHERE id = 'de5942d0-15d8-4048-a419-63cefbf32f38';
```

**Verifikasi 7d:**
```sql
-- Dinda final harus punya 2 kelas: SMA 1 + Pengurus (BUKAN Orang Tua)
SELECT c.name FROM student_classes sc JOIN classes c ON c.id = sc.class_id
WHERE sc.student_id = '97070e52-6632-4005-bfe6-6e9eda212024';
-- Expected: SMA 1, Pengurus
-- attendance total = 53+45 = 98
SELECT COUNT(*) FROM attendance_logs WHERE student_id = '97070e52-6632-4005-bfe6-6e9eda212024';
-- de5942d0 tidak ada lagi
SELECT COUNT(*) FROM students WHERE id = 'de5942d0-15d8-4048-a419-63cefbf32f38'; -- 0
```

> **Pre-check sebelum 7d — SUDAH DIVERIFIKASI:** Tabel dengan `student_id` FK = attendance_logs, student_classes, student_enrollments, student_material_progress, student_section_grades, student_reports.
> Untuk de5942d0: `student_material_progress=0`, `student_section_grades=0`, `student_reports=0`. Jadi hanya 4 tabel pertama yang perlu di-handle (sudah dicover di SQL 7d step 1-4). `transfer_history` ada sebagai kolom jsonb di `students` (record de5942d0 dihapus, jadi otomatis hilang).

---

## Fase 8 — Kelas Gabungan Brangsong

### 8a. Pengurus Remaja → ganti master jadi "Pengurus"
Kelas `16ff47d1-3a98-45fd-a0ec-f0ffb6c2effc` saat ini punya 3 master (SMP 1, SMA 1, Pra Nikah 1). Ganti jadi 1 master "Pengurus" (`b26231dd-afb0-4056-8387-3d6bd765d347`). Tidak migrate siswa.

```sql
-- Hapus 3 mapping lama
DELETE FROM class_master_mappings WHERE class_id = '16ff47d1-3a98-45fd-a0ec-f0ffb6c2effc';
-- Tambah 1 mapping ke Pengurus
INSERT INTO class_master_mappings (class_id, class_master_id)
VALUES ('16ff47d1-3a98-45fd-a0ec-f0ffb6c2effc', 'b26231dd-afb0-4056-8387-3d6bd765d347');
```
> Cek nama kelas: tetap "Pengurus Remaja" atau rename "Pengurus"? Default: biarkan nama, hanya master yang dibetulkan. Konfirmasi saat eksekusi jika mau rename.

### 8b. Remaja & Pra Nikah → migrate siswa ke SMA 1 Brangsong, hapus
Kelas `22222222-2222-2222-2222-222222222223` (70 siswa, master SMA1+PraNikah1) → migrate ke "SMA 1" Brangsong (`4189c8c4-4635-49e1-bc68-8d7d2024d849`). Overlap target=0, overlap Remaja legacy=0.

Pola sama dgn Fase 3 (single legacy→target). Repoint: student_classes (dedup), teacher_classes (dedup), student_enrollments, meetings.class_id, meetings.class_ids[] (dedup), students.class_id. Lalu verifikasi 0 referensi → DELETE kelas.

```sql
-- student_classes
DELETE FROM student_classes sc WHERE sc.class_id = '22222222-2222-2222-2222-222222222223'
  AND EXISTS (SELECT 1 FROM student_classes t WHERE t.class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' AND t.student_id = sc.student_id);
UPDATE student_classes SET class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' WHERE class_id = '22222222-2222-2222-2222-222222222223';
-- teacher_classes
DELETE FROM teacher_classes tc WHERE tc.class_id = '22222222-2222-2222-2222-222222222223'
  AND EXISTS (SELECT 1 FROM teacher_classes t WHERE t.class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' AND t.teacher_id = tc.teacher_id);
UPDATE teacher_classes SET class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' WHERE class_id = '22222222-2222-2222-2222-222222222223';
-- student_enrollments (dedup by year+semester)
DELETE FROM student_enrollments e WHERE e.class_id = '22222222-2222-2222-2222-222222222223'
  AND EXISTS (SELECT 1 FROM student_enrollments t WHERE t.class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849'
    AND t.student_id = e.student_id AND t.academic_year_id = e.academic_year_id AND t.semester = e.semester);
UPDATE student_enrollments SET class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' WHERE class_id = '22222222-2222-2222-2222-222222222223';
-- meetings scalar
UPDATE meetings SET class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' WHERE class_id = '22222222-2222-2222-2222-222222222223';
-- meetings.class_ids[] dedup
UPDATE meetings mt SET class_ids = sub.new_ids
FROM (
  SELECT mt2.id, ARRAY(SELECT DISTINCT
    CASE WHEN cid = '22222222-2222-2222-2222-222222222223' THEN '4189c8c4-4635-49e1-bc68-8d7d2024d849' ELSE cid END
    FROM unnest(mt2.class_ids) cid) AS new_ids
  FROM meetings mt2 WHERE '22222222-2222-2222-2222-222222222223' = ANY(mt2.class_ids)
) sub WHERE mt.id = sub.id;
-- students legacy field
UPDATE students SET class_id = '4189c8c4-4635-49e1-bc68-8d7d2024d849' WHERE class_id = '22222222-2222-2222-2222-222222222223';
-- Verifikasi 0 referensi NO ACTION lalu hapus
DELETE FROM classes WHERE id = '22222222-2222-2222-2222-222222222223';
```

> **CRITICAL ORDER untuk Dinda:** Dinda1 punya kelas "Pengajar" (→Pengurus). Pastikan Fase 3 (Pengajar→Pengurus untuk Warlob 2) sudah jalan sebelum verifikasi kelas final Dinda di 7d.

---

## Risiko & Mitigasi

| Risiko | Mitigasi |
|---|---|
| Duplikat dalam meetings.class_ids array | DISTINCT dedup di Fase 3e |
| Konflik UNIQUE teacher_classes | DELETE overlap dulu (Fase 3b) |
| Delete kelas masih ada referensi (FK NO ACTION) | Verifikasi Fase 4 = semua 0 sebelum delete |
| Kelas target Orang Tua belum ada → mapping NULL | Fase 1 sebelum Fase 2, cek no NULL target |
| Kehilangan attendance | attendance_logs tidak reference class — aman by design |
| Salah hapus kelas non-legacy | WHERE clause ketat by nama legacy + temp map |

---

## Verification End-to-End

1. **DB level:** Jalankan semua query Fase 4 & 6 → semua 0/expected.
2. **App level:** Login sebagai admin, buka `/kelas` → kelas legacy hilang, kelas standar muncul dengan jumlah siswa benar.
3. **Attendance:** Buka `/presensi` salah satu meeting Brangsong yang dimigrasi → attendance history tetap muncul.
4. **Laporan:** Buka `/laporan` filter kelompok Brangsong → angka konsisten, tidak ada kelas hilang.

---

## CLAUDE.md Check
- [ ] Pattern baru? Tidak (data migration)
- [ ] Tabel baru? Tidak
- [ ] Route/page baru? Tidak
- [ ] Permission baru? Tidak
