# Plan: categories table → kolom di class_masters (sm-z0e)

**Tanggal:** 2026-06-06
**Issue:** sm-z0e (menggantikan sm-iqo + sm-7ax)
**Tipe:** Refactor DB + kode (DDL via MCP + TDD helper)
**Status:** 📝 Plan

## Context

Tabel `categories` (kategori KELAS — beda dari `material_categories`) terbukti redundan pasca migrasi kelas (sm-29y/sm-s98):
- Cuma 7 baris enum, sisa kolom: `code`, `name`, `group_name` (2 kolom dead sudah di-drop di sm-g34).
- Nama `categories` generik & bentrok konsep dengan `material_categories` (pernah hampir ketuker).
- Over-normalized: tabel + FK + join untuk 7 enum value.

**Tujuan:** pindah kategori jadi kolom eksplisit di `class_masters`, drop tabel `categories` + `category_id`. Eksplisit, 0 join.

**Keputusan kunci (user, jangan langgar):** JANGAN derive kategori dari `sort_order`. sort_order = posisi urut, bukan identitas kategori — geser order = rusak diam-diam. Kategori harus data eksplisit. (memory: class-category-via-sort-order-rejected)

## Mapping data existing (untuk seeding kolom)

| sort_order | class_master | category_code | category_group |
|---|---|---|---|
| 1 | Kelas Paud | PAUD | caberawit |
| 2-7 | Kelas 1-6 | CABERAWIT | caberawit |
| 8-10 | SMP 1-3 | PRA_REMAJA | muda_mudi |
| 11-13 | SMA 1-3 | REMAJA | muda_mudi |
| 14-17 | Pra Nikah 1-4 | PRA_NIKAH | muda_mudi |
| 18 | Orang Tua | ORANG_TUA | orang_tua |
| 19 | Pengurus | (null) | (null) |

> Seeding TIDAK pakai range sort_order hardcode — JOIN dari `categories` existing via `category_id` saat migrasi (sumber kebenaran saat ini). Range di atas cuma untuk verifikasi.

## Fase Eksekusi

### Fase 1: Tambah kolom + seed dari categories existing (DDL)
```sql
ALTER TABLE class_masters ADD COLUMN category_code text;
ALTER TABLE class_masters ADD COLUMN category_group text;
UPDATE class_masters cm SET
  category_code = cat.code,
  category_group = cat.group_name
FROM categories cat WHERE cat.id = cm.category_id;
-- Verifikasi: SELECT name, sort_order, category_code, category_group FROM class_masters ORDER BY sort_order;
-- Pastikan terisi benar (Pengurus null OK).
```

### Fase 2: TDD helper baca kolom (bukan sort_order, bukan join)
`src/lib/utils/classHelpers.ts`:
- `isCaberawitClass(classData)` → cek `class_master.category_group === 'caberawit'` (FIX bug latent: sebelumnya baca category.code yang null di payload useClasses).
- Helper baru `categoryGroupOf(classData)` jika perlu.
- RED test dulu: edge case category_group null (Pengurus), mapping kosong, array format Supabase.

> ⚠️ `isSambungDesaEligible` tetap whitelist via group: eligible = group muda_mudi/orang_tua (+ Pengurus dgn aturan owned-class di call site presensi). Konfirmasi ulang aturan Pengurus saat eksekusi.

### Fase 3: Audit semua select supply kolom kategori
Semua sumber yang feed helper / butuh kategori harus SELECT `category_code, category_group` dari class_masters:
- `users/siswa/actions/classes/queries.ts` (fetchClassMasterMappings) — ganti `.from('categories')` group_name → ambil dari kolom class_masters langsung.
- `AdminLayoutProvider.tsx` — ganti select `category:category_id(...)` → `category_code, category_group`.
- `presensi/actions/meetings/actions.ts:633` (teacherClassesData) — ganti category(code,name) → category_group.
- `monitoring/actions/classes.ts` — buang select category (dead).

### Fase 4: Refactor konsumen kategori
- `dashboard/actions/monitoring/queries.ts` `fetchClassIdsByGroupName` → `WHERE class_masters.category_group = $1` (no join categories).
- `DataFilter.tsx:228` group_name → tetap baca dari mapping (sumber kini kolom class_masters).
- Rapot display `[templateId]/page.tsx` + `create/page.tsx` `cm.categories.name` → `cm.category_code` (atau label dari category_group).
- rapot `resolution/queries.ts` + `templates/queries.ts` select categories → category_code/group.

### Fase 5: Refactor types
`src/types/class.ts`: hapus `category_id` + `category` object dari ClassMaster/ClassData, tambah `category_code?`, `category_group?`. Update ClassData helper type.

### Fase 6: type-check + test + smoke
- `npm run type-check`, `npm run test:run` (helper hijau).
- Smoke: /laporan filter kategori, /presensi Sambung Desa, /rapot template label.

### Fase 7: DROP tabel + kolom lama (TERAKHIR)
```sql
-- Verifikasi 0 konsumen categories/category_id tersisa di kode (grep) dulu
ALTER TABLE class_masters DROP COLUMN category_id;
DROP TABLE categories;
```

## Risiko & Mitigasi
| Risiko | Mitigasi |
|---|---|
| Lupa derive sort_order (langgar keputusan user) | Seed via JOIN categories, helper baca kolom — bukan range |
| Konsumen tertinggal → query rusak | Fase 3-4 audit grep menyeluruh sebelum drop |
| material_categories ke-refactor tak sengaja | Whitelist: hanya sentuh categories/category_id non-material |
| Bug latent isCaberawit | Fase 2 fix + TDD |

## Eksekusi
~10 file + DDL + TDD. ≥3 file & ≥100 line → Antigravity recommended. Prompt: docs/prompts/sm-z0e-*.md (setelah approve).

## CLAUDE.md Check
- [ ] Pattern baru? Ya — kategori sbg kolom eksplisit (dokumentasikan di architecture-patterns.md)
- [ ] Tabel baru? Tidak (drop tabel, tambah kolom)
