# sm-mu7y — Sync materi local→prod + hapus academic_year_id dari material_monthly_targets

## Context

**Masalah = pengelolaan, bukan egress.** Kolom `academic_year_id` di `material_monthly_targets` memaksa materi diduplikasi tiap tahun ajaran. Update materi jadi ribet, data numpuk. Materi konten sama tiap tahun → kolom itu proteksi fleksibilitas (materi beda month antar tahun) yang **tak pernah dipakai** di data nyata (verifikasi prod: buang year → 670 tuple unik = tak ada perbedaan antar tahun).

**Data materi SUDAH FINAL di local (sesi lain)** — local = source of truth: hapus dummy 2025/2026 (1340→672), swap Az Zalzalah/Al Adiyat kelas 2, tambah "Tata krama menguap" kelas 1&2 bln 5, merge dup "Menulis Angka Arab", hapus 29 orphan (konten dipindah dulu), rename Surat/Doa ke format spasi.

**Perbandingan local vs prod (terverifikasi):**

| Tabel | Local | Prod | Aksi |
|---|---|---|---|
| material_categories | 7 | 7 | identik, skip |
| material_types | 11 | 11 | identik, skip |
| material_items | 153 | 182 | replace (29 prod-only, 0 progress nyangkut → aman hapus) |
| material_monthly_targets | 672 | 1340 | replace |
| material_item_classes | 366 | 366 | replace (jumlah sama, isi beda) |
| student_material_progress | dummy | 57 dummy | kosongkan (fitur belum rilis) |

**Urutan: SYNC DATA (Fase 1, USER via skill DB) → MIGRASI STRUKTUR + KODE (Fase 2, Antigravity + user DB).**

**Kunci asimetris:** drop `academic_year_id` HANYA di `material_monthly_targets`. `student_material_progress` kolomnya TETAP (nilai per-tahun).

---

## FASE 1 — Sync data materi local→prod (USER, skill access-db-vm — BUKAN Antigravity)

Replace total 3 tabel materi (perubahan local kompleks, diff manual rawan miss). `class_masters` UUID identik local↔prod.

1. Backup prod → CSV: material_items, material_monthly_targets, material_item_classes, student_material_progress → `/tmp/*_2026-07-24.csv`.
2. Dump 3 tabel materi dari local (data-only) → transfer VM.
3. Prod, 1 transaksi (urut FK):
   - `DELETE FROM student_material_progress;`
   - `DELETE FROM material_monthly_targets;`
   - `DELETE FROM material_item_classes;`
   - `DELETE FROM material_items WHERE id NOT IN (<local ids>);`
   - INSERT: material_items (153) → material_item_classes (366) → material_monthly_targets (672)
   - `academic_year_id` masih ada di fase ini → set active year prod (2026/2027).
   - Verifikasi 153/672/366 sebelum COMMIT.

Verifikasi: `/materi` prod = local. Kode belum berubah → tetap jalan.

---

## FASE 2 — Migrasi struktur + kode (Antigravity untuk kode; user untuk DB)

Local dev (5417) dulu, verifikasi, baru prod. SQL identik.

### 2a. Migrasi DB (user, skill DB)
```sql
BEGIN;
DROP INDEX material_monthly_targets_no_month_key;
DROP INDEX material_monthly_targets_with_month_key;
ALTER TABLE material_monthly_targets DROP CONSTRAINT material_monthly_targets_academic_year_id_fkey;
ALTER TABLE material_monthly_targets DROP COLUMN academic_year_id;
CREATE UNIQUE INDEX material_monthly_targets_no_month_key ON material_monthly_targets (class_master_id, semester, material_item_id) WHERE month IS NULL;
CREATE UNIQUE INDEX material_monthly_targets_with_month_key ON material_monthly_targets (class_master_id, semester, month, material_item_id) WHERE month IS NOT NULL;
COMMIT;
```

### 2b. Kode — ~40 titik, 6 file + import script (asimetris: targets buang year, progress simpan)

- **`src/types/material.ts`** — hapus `academic_year_id` dari `MonthlyTarget` (L151) & `MonthlyTargetInput` (L166).
- **`src/app/(admin)/materi/actions/monthly-targets/queries.ts`** — hapus param + `.eq('academic_year_id',...)` di semua fungsi (L8–165): fetchMonthlyTargets, fetchMonthlyTargetItemIds ×2, fetchMonthlyTargetsByItemId, deleteMonthlyTargetsByItem, deleteMonthlyTargetsByItemIds, fetchMonthlyTargetsByItemIds.
- **`src/app/(admin)/materi/actions/monthly-targets/actions.ts`** — hapus `getActiveAcademicYear()` + `academic_year_id: activeYear.id` di syncItemMonthlyTargets (L204–220), syncItemMonthlyTargetsBulk (L264–284), getter (L162/183/327). Buang `academic_year_id` dari `onConflict` string bulkUpsert.
- **`src/app/(admin)/laporan/actions/reports/materiQueries.ts`** — hapus `.eq('academic_year_id',...)` **HANYA** pada query `.from('material_monthly_targets')` (L100,249,312,330,392,492). **PERTAHANKAN** pada student_material_progress / student_enrollments / rapot_data. CEK nama tabel tiap baris sebelum edit.
- **`src/app/(admin)/dashboard/actions/materiMonitoring.ts`** — hapus pada targets (L141,201). Progress tetap.
- **`src/app/(admin)/users/siswa/[studentId]/actions/materi.ts`** — hapus pada targets (L77). Enrollment/progress tetap.
- **`scripts/import-materi.mjs`** — hapus fetch active year (`ayRes`) + `academic_year_id` dari targetRow + onConflict string.

---

## Verifikasi (E2E WAJIB — PostgREST select tak ter-typecheck)

1. `npm run type-check` — nol referensi `academic_year_id` yatim di type materi.
2. Local setelah migrasi: `/materi` assign/edit/hapus target → baris berubah benar (tanpa year).
3. `/laporan` materi 1 kelas → angka completion tampil (progress kosong = 0%, wajar).
4. `/dashboard` monitoring materi + detail siswa → tanpa error.
5. `scripts/import-materi.mjs` local → upsert 672 (bukan 1340), idempotent.

## Roles
Claude Code = plan + review · Antigravity = kode Fase 2b (TDD) · User = DB Fase 1 + 2a + git.

## Out of scope (issue terpisah)
Import materi SMP 1-3, SMA 1-3, Pra Nikah 1-4 (CSV di `docs/materi/csv/flat/`).
