# Prompt Antigravity — sm-wcj2: Optimasi egress Materi (trim nested select + lazy content)

**Issue:** sm-wcj2 (P1) · **Mode:** TDD (jalur A) · **Rilis:** semester depan, frekuensi guru tinggi
**Konteks egress:** `docs/claude/egress-audit-phase2.md` + `docs/claude/egress-cost-optimization.md` + register #wcj2.

## Tujuan

Potong bytes/fetch halaman Materi tanpa mengubah UX. Biang: query list materi bawa kolom **`content`** (HTML materi, paling fat) + triple-nested `material_types(*)` → `material_categories(*)` (butuh cuma `id,name`) padahal **grid (`MateriTable`) cuma render `name` + `description`**. `content` cuma dipakai di `ContentViewModal` (on-click view) + editor `ItemModal`.

## Fakta terverifikasi (JANGAN diubah asumsinya)

- `MateriTable.tsx` render: `item.name`, `item.description`. **TIDAK render `item.content`.** (baris ~92-119)
- `content` dirender di `ContentViewModal.tsx` + `MateriContentView.tsx` (on-click detail) dan diedit di `ItemModal.tsx`.
- Tabel: `material_items` = 182 rows, `material_types` = 11, `material_categories` = 7. `.range(0,9999)` tarik semua 182 (bukan 10000 nyata, tapi tetap bawa `content` tiap row).
- Konsumen query fat (di `actions/items/actions.ts`):
  - `getAllMaterialItems` → `fetchAllItems` (master data view)
  - `getMaterialItemsWithClassMappings` → `fetchAllItemsWithTypes` (`.range(0,9999)`)
  - `getMaterialItemsByClass` → `fetchItemsForClass`
  - `getMaterialItem(id)` → `fetchItemById` (DETAIL — **keep `content`**, ini yang isi ContentViewModal)
- Type `MaterialItem` di `src/types/` dipakai lintas materi + rapot. Trim list = **butuh type list-shape terpisah**, JANGAN buang `content` dari `MaterialItem` full.

## RED → GREEN → REFACTOR

### 1. Type (centralized, `src/types/material*.ts`)
- Tambah `MaterialItemListRow` (list-shape): `id, name, description, material_type_id, material_type?: {id, name, category?: {id, name}}`. TANPA `content`.
- `MaterialItem` (full) TETAP punya `content` — dipakai detail/editor.
- **JANGAN** redefine inline; ikuti Base→Extended→Full (baca `src/types/README.md`).

### 2. Queries (`materi/actions/items/queries.ts`)
Trim **HANYA query yang mengisi grid/list**, keep detail utuh:
- `fetchAllItems`, `fetchAllItemsWithTypes`, `fetchItemsForClass`: ganti `material_items *` → eksplisit `id, name, description, material_type_id, created_at, updated_at` (BUANG `content`). Nested `material_types(*)` → `material_types(id, name, display_order)`; `material_categories(*)` → `material_categories(id, name)`.
- `fetchItemById`, `insertItem`, `updateItemById` (return): **KEEP `*`/`content`** — ini detail/editor path.
- `fetchItemsForClassAndType`: trim sama seperti list (cek konsumen `getMaterialItemsByClassAndType` — kalau cuma buat pilih kelas, aman).

### 3. Actions
- Pastikan `getMaterialItem(id)` (detail) tetap fetch `content` (lazy — sudah on-click). Modal view sudah panggil ini? Kalau grid simpan `content` di memori dari list, ubah jadi fetch on-open.
- Return type list actions → `MaterialItemListRow[]`.

### 4. Views
- `MateriTable`/`MateriCardMobile`: pastikan tak ada akses `item.content` (grid tak render itu — verifikasi tak ada dead-access).
- `ContentViewModal`: saat dibuka, fetch `getMaterialItem(id)` utk dapat `content` (kalau belum). Loading state singkat.

## Test (WAJIB, RED dulu)
- Unit: `fetchAllItems`/`fetchAllItemsWithTypes` select string TIDAK mengandung `content`, mengandung `name`+`description`. (PostgREST select string tak ter-typecheck — WAJIB test string, lihat memory `postgrest-select-not-typechecked`.)
- Unit: `fetchItemById` select TETAP mengandung `content`.
- E2E/smoke: buka `/materi` → grid tampil nama+deskripsi; klik row → ContentViewModal tampil `content` lengkap; edit item → content ter-load di editor; simpan → persist.

## Acceptance
- [ ] Grid materi tak lagi fetch `content` (verify via Network tab: response `/material_items` list tanpa field content).
- [ ] ContentViewModal + editor tetap tampil `content` lengkap (lazy-fetch on-open).
- [ ] Rapot yang pakai material hierarchy tak regresi.
- [ ] `npm run test:run` + `type-check` hijau.

## JANGAN
- Jangan buang `content` dari type `MaterialItem` full / `fetchItemById`.
- Jangan ubah `.range(0,9999)` jadi paginasi tanpa cek UX grid (182 row masih muat; fokus trim kolom dulu, paginasi opsional fase lanjut).
- Jangan sentuh monitoring (issue terpisah sm-t433).
