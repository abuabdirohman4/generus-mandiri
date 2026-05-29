# Plan: Simplifikasi Class Masters (27 → 19 Master Standar)

**Issue**: sm-TBD (fill after bd create)
**GitHub**: GH-#TBD (fill after gh issue create)
**Date**: 2026-05-29

---

## Context

Class masters saat ini ada 27 entry, banyak yang redundan atau sudah tidak relevan:
- "Orang Tua" dipecah jadi 2 berdasarkan umur (<35 dan >35) — harusnya 1 master, umur pakai field `tanggal_lahir`
- Ada "Pra Remaja", "Remaja" yang duplikat konsep dengan "SMP 1", "SMA 1"
- "Pra Nikah" lama (sort_order 16) duplikat dengan "Pra Nikah 1" (sort_order 17)
- "Lansia" → masuk Orang Tua
- "Pengajar", "KBM" → masuk Pengurus
- "Aghniya" → 0 usage, hapus
- "SMP x" / "SMA x" → rename ke "Kelas SMP x" / "Kelas SMA x"

Target: 19 master standar bersih, data siswa existing ter-remap dengan benar.

---

## Target 19 Class Masters (Final State)

| sort_order | Nama | ID saat ini |
|---|---|---|
| 1 | Kelas Paud | 2db07133 (keep, no change) |
| 2 | Kelas 1 | dada3c83 (keep) |
| 3 | Kelas 2 | 2aeb510f (keep) |
| 4 | Kelas 3 | d3e74025 (keep) |
| 5 | Kelas 4 | 07828e36 (keep) |
| 6 | Kelas 5 | e2b48385 (keep) |
| 7 | Kelas 6 | 52f0cb47 (keep) |
| 8 | Kelas SMP 1 | 78ec0517 (rename dari "SMP 1") |
| 9 | Kelas SMP 2 | c1fcb301 (rename dari "SMP 2") |
| 10 | Kelas SMP 3 | 2d3d2079 (rename dari "SMP 3") |
| 11 | Kelas SMA 1 | c4842b02 (rename dari "SMA 1") |
| 12 | Kelas SMA 2 | 59df8b05 (rename dari "SMA 2") |
| 13 | Kelas SMA 3 | 3274de13 (rename dari "SMA 3") |
| 14 | Pra Nikah 1 | 0b79d8ad (keep, sort_order fix) |
| 15 | Pra Nikah 2 | 1451f6fd (keep, sort_order fix) |
| 16 | Pra Nikah 3 | d26c60d9 (keep, sort_order fix) |
| 17 | Pra Nikah 4 | 9be24edf (keep, sort_order fix) |
| 18 | Orang Tua | d0672e7b (rename dari "Orang Tua (<35)") |
| 19 | Pengurus | b26231dd (keep, sort_order fix) |

---

## Mapping Master Lama → Baru (untuk class_master_mappings)

| Master Lama | ID | Siswa | → Master Baru | Target ID |
|---|---|---|---|---|
| Pra Remaja | d71c8319 | 29 | Kelas SMP 1 | 78ec0517 |
| Remaja | 96008547 | 89 | Kelas SMA 1 | c4842b02 |
| Pra Nikah (lama) | 57caa3c7 | 95 | Pra Nikah 1 | 0b79d8ad |
| Orang Tua (>35) | 95a85fe3 | 98 | Orang Tua | d0672e7b |
| Lansia | bfee4232 | 30 | Orang Tua | d0672e7b |
| Pengajar | 5d2ce793 | 13 | Pengurus | b26231dd |
| KBM | 5041d02f | 31 | Pengurus | b26231dd |
| Aghniya | c951a185 | 0 | DELETE (no remap needed) | — |

---

## Tanggal Lahir Placeholder

Siswa di kelas Orang Tua belum ada `tanggal_lahir`. Isi estimasi berdasarkan nama master lama (hanya siswa dengan `tanggal_lahir IS NULL`):

| Dari Master | Estimasi Umur | Placeholder tanggal_lahir |
|---|---|---|
| Orang Tua (<35) | ~30 thn | 1995-01-01 |
| Orang Tua (>35) | ~45 thn | 1980-01-01 |
| Lansia | ~60 thn | 1965-01-01 |

---

## Implementasi (Semua via MCP SQL — tidak ada perubahan kode)

### Task 1: Rename SMP/SMA masters

```sql
UPDATE class_masters SET name = 'Kelas SMP 1', sort_order = 8 WHERE id = '78ec0517-0be6-4ab3-968f-21731e0e8669';
UPDATE class_masters SET name = 'Kelas SMP 2', sort_order = 9 WHERE id = 'c1fcb301-16ea-46b7-8c2e-a9f102b7a546';
UPDATE class_masters SET name = 'Kelas SMP 3', sort_order = 10 WHERE id = '2d3d2079-a885-4b4b-847f-6ff59b802cdf';
UPDATE class_masters SET name = 'Kelas SMA 1', sort_order = 11 WHERE id = 'c4842b02-7de6-4a07-b40a-af7a5100f2ea';
UPDATE class_masters SET name = 'Kelas SMA 2', sort_order = 12 WHERE id = '59df8b05-dc9c-411f-8662-917c60df3a2c';
UPDATE class_masters SET name = 'Kelas SMA 3', sort_order = 13 WHERE id = '3274de13-182e-415a-8ef9-fc1760a5b87d';
```

### Task 2: Rename "Orang Tua (<35)" → "Orang Tua"

```sql
UPDATE class_masters SET name = 'Orang Tua', sort_order = 18 WHERE id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12';
```

### Task 3: Fix sort_order Pra Nikah 1-4 dan Pengurus

```sql
UPDATE class_masters SET sort_order = 14 WHERE id = '0b79d8ad-f717-4cd9-aa5a-13205f1d6869'; -- Pra Nikah 1
UPDATE class_masters SET sort_order = 15 WHERE id = '1451f6fd-720c-4e8a-a6e8-a6d673005bf5'; -- Pra Nikah 2
UPDATE class_masters SET sort_order = 16 WHERE id = 'd26c60d9-3d8c-4b14-9bc3-2b0c9e4fce3b'; -- Pra Nikah 3
UPDATE class_masters SET sort_order = 17 WHERE id = '9be24edf-da84-469e-af2c-4da513c38858'; -- Pra Nikah 4
UPDATE class_masters SET sort_order = 19 WHERE id = 'b26231dd-afb0-4056-8387-3d6bd765d347'; -- Pengurus
```

### Task 4: Remap class_master_mappings (dengan dedup handling)

Untuk setiap remap, ada risiko duplicate (kelas yang sudah punya mapping ke target baru). Strategi: DELETE duplicate dulu, baru UPDATE.

**4a. Pra Remaja → Kelas SMP 1**
```sql
-- Delete jika sudah ada mapping ke Kelas SMP 1 di kelas yang sama
DELETE FROM class_master_mappings
WHERE class_master_id = 'd71c8319-6c85-439d-9e40-be68f3ebc59a'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = '78ec0517-0be6-4ab3-968f-21731e0e8669'
  );
-- Remap sisanya
UPDATE class_master_mappings SET class_master_id = '78ec0517-0be6-4ab3-968f-21731e0e8669'
WHERE class_master_id = 'd71c8319-6c85-439d-9e40-be68f3ebc59a';
```

**4b. Remaja → Kelas SMA 1**
```sql
DELETE FROM class_master_mappings
WHERE class_master_id = '96008547-ca22-43cd-b5ea-45185421597c'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = 'c4842b02-7de6-4a07-b40a-af7a5100f2ea'
  );
UPDATE class_master_mappings SET class_master_id = 'c4842b02-7de6-4a07-b40a-af7a5100f2ea'
WHERE class_master_id = '96008547-ca22-43cd-b5ea-45185421597c';
```

**4c. Pra Nikah (lama) → Pra Nikah 1**
```sql
DELETE FROM class_master_mappings
WHERE class_master_id = '57caa3c7-bcf0-4dab-8d4b-e2627312a918'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = '0b79d8ad-f717-4cd9-aa5a-13205f1d6869'
  );
UPDATE class_master_mappings SET class_master_id = '0b79d8ad-f717-4cd9-aa5a-13205f1d6869'
WHERE class_master_id = '57caa3c7-bcf0-4dab-8d4b-e2627312a918';
```

**4d. Orang Tua (>35) → Orang Tua**
```sql
DELETE FROM class_master_mappings
WHERE class_master_id = '95a85fe3-246d-4351-8ff8-b2752af77ba9'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12'
  );
UPDATE class_master_mappings SET class_master_id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12'
WHERE class_master_id = '95a85fe3-246d-4351-8ff8-b2752af77ba9';
```

**4e. Lansia → Orang Tua**
```sql
DELETE FROM class_master_mappings
WHERE class_master_id = 'bfee4232-8793-4b25-bda4-5a1da17dc05b'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12'
  );
UPDATE class_master_mappings SET class_master_id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12'
WHERE class_master_id = 'bfee4232-8793-4b25-bda4-5a1da17dc05b';
```

**4f. Pengajar → Pengurus**
```sql
DELETE FROM class_master_mappings
WHERE class_master_id = '5d2ce793-46d4-4255-ab42-ee3b2b7056eb'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = 'b26231dd-afb0-4056-8387-3d6bd765d347'
  );
UPDATE class_master_mappings SET class_master_id = 'b26231dd-afb0-4056-8387-3d6bd765d347'
WHERE class_master_id = '5d2ce793-46d4-4255-ab42-ee3b2b7056eb';
```

**4g. KBM → Pengurus**
```sql
DELETE FROM class_master_mappings
WHERE class_master_id = '5041d02f-391e-4f93-bc15-dff4353e2ea5'
  AND class_id IN (
    SELECT class_id FROM class_master_mappings WHERE class_master_id = 'b26231dd-afb0-4056-8387-3d6bd765d347'
  );
UPDATE class_master_mappings SET class_master_id = 'b26231dd-afb0-4056-8387-3d6bd765d347'
WHERE class_master_id = '5041d02f-391e-4f93-bc15-dff4353e2ea5';
```

### Task 5: Isi tanggal_lahir placeholder untuk siswa Orang Tua

**5a. Siswa dari Orang Tua (<35) — placeholder 1995-01-01**
```sql
UPDATE students SET tanggal_lahir = '1995-01-01'
WHERE tanggal_lahir IS NULL
  AND id IN (
    SELECT DISTINCT sc.student_id
    FROM student_classes sc
    JOIN classes c ON c.id = sc.class_id
    JOIN class_master_mappings cmm ON cmm.class_id = c.id
    WHERE cmm.class_master_id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12'
  );
```

> Note: Jalankan ini SEBELUM Task 4d (remap Orang Tua >35), agar siswa dari master lama masih bisa diidentifikasi.

**5b. Siswa dari Orang Tua (>35) — placeholder 1980-01-01**
```sql
UPDATE students SET tanggal_lahir = '1980-01-01'
WHERE tanggal_lahir IS NULL
  AND id IN (
    SELECT DISTINCT sc.student_id
    FROM student_classes sc
    JOIN classes c ON c.id = sc.class_id
    JOIN class_master_mappings cmm ON cmm.class_id = c.id
    WHERE cmm.class_master_id = '95a85fe3-246d-4351-8ff8-b2752af77ba9'
  );
```

**5c. Siswa dari Lansia — placeholder 1965-01-01**
```sql
UPDATE students SET tanggal_lahir = '1965-01-01'
WHERE tanggal_lahir IS NULL
  AND id IN (
    SELECT DISTINCT sc.student_id
    FROM student_classes sc
    JOIN classes c ON c.id = sc.class_id
    JOIN class_master_mappings cmm ON cmm.class_id = c.id
    WHERE cmm.class_master_id = 'bfee4232-8793-4b25-bda4-5a1da17dc05b'
  );
```

### Task 6: Delete master yang sudah di-remap + Aghniya

```sql
DELETE FROM class_masters WHERE id IN (
  'd71c8319-6c85-439d-9e40-be68f3ebc59a', -- Pra Remaja
  '96008547-ca22-43cd-b5ea-45185421597c', -- Remaja
  '57caa3c7-bcf0-4dab-8d4b-e2627312a918', -- Pra Nikah (lama)
  '95a85fe3-246d-4351-8ff8-b2752af77ba9', -- Orang Tua (>35)
  'bfee4232-8793-4b25-bda4-5a1da17dc05b', -- Lansia
  '5d2ce793-46d4-4255-ab42-ee3b2b7056eb', -- Pengajar
  '5041d02f-391e-4f93-bc15-dff4353e2ea5', -- KBM
  'c951a185-10d2-43af-89f9-ca162d10723a'  -- Aghniya
);
```

### Urutan eksekusi yang benar:
1. Task 5a (isi tanggal_lahir siswa Orang Tua <35, sebelum rename)
2. Task 5b (isi tanggal_lahir siswa Orang Tua >35, sebelum remap)
3. Task 5c (isi tanggal_lahir siswa Lansia, sebelum remap)
4. Task 1 (rename SMP/SMA)
5. Task 2 (rename Orang Tua)
6. Task 3 (fix sort_order)
7. Task 4a–4g (remap mappings)
8. Task 6 (delete masters lama)

---

## Verification Queries

```sql
-- 1. Pastikan tepat 19 masters
SELECT COUNT(*) as total FROM class_masters;
-- Expected: 19

-- 2. List semua masters final
SELECT name, sort_order FROM class_masters ORDER BY sort_order;

-- 3. Tidak ada orphan mappings
SELECT COUNT(*) FROM class_master_mappings cmm
LEFT JOIN class_masters cm ON cm.id = cmm.class_master_id
WHERE cm.id IS NULL;
-- Expected: 0

-- 4. Distribusi siswa per master baru
SELECT cm.name, cm.sort_order, COUNT(DISTINCT sc.student_id) as siswa
FROM class_masters cm
LEFT JOIN class_master_mappings cmm ON cmm.class_master_id = cm.id
LEFT JOIN student_classes sc ON sc.class_id = cmm.class_id
GROUP BY cm.id, cm.name, cm.sort_order
ORDER BY cm.sort_order;

-- 5. Siswa Orang Tua yang sudah punya tanggal_lahir
SELECT COUNT(*) FROM students s
JOIN student_classes sc ON sc.student_id = s.id
JOIN classes c ON c.id = sc.class_id
JOIN class_master_mappings cmm ON cmm.class_id = c.id
WHERE cmm.class_master_id = 'd0672e7b-6c3a-4c3e-8792-ec8510db2e12'
  AND s.tanggal_lahir IS NOT NULL;
```

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? — Tidak
- [ ] Apakah ada tabel database baru? — Tidak
- [ ] Apakah ada route/page baru? — Tidak
- [ ] Apakah ada permission pattern baru? — Tidak
- [ ] Update docs jika ada yang perlu diupdate setelah implementasi
