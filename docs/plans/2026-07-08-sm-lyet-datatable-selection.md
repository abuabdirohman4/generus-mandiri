# Plan — sm-lyet — DataTable Selection Generic (opt-in)

**Issue:** sm-lyet · feature: DataTable tambah selection generic (checkbox + bulk actions) opt-in
**Type:** feature (P2)
**Date:** 2026-07-08

---

## 1. Context

`DataTable` (`src/components/table/Table.tsx`) dipakai **20 file** di seluruh app (siswa, guru, admin, kelas, organisasi, materi, tracking, laporan, dashboard, kegiatan). Belum ada row-selection built-in.

Satu-satunya preseden row-select yang sudah jalan: `QrCardsTab.tsx` (`src/app/(admin)/users/siswa/components/QrCardsTab.tsx:35,92-105,147,154-176`) — checkbox kolom di-inject manual ke `columns` array + `renderCell`, state `selectedIds: Set<string>` lokal di komponen. Cara ini **tidak reusable** — tiap tabel baru yang butuh bulk-select harus copy-paste pola yang sama.

Trigger: makin banyak fitur batch-create (kelas custom sm-o9no, kartu ID sm-vckd, dst) → makin sering butuh bulk edit/delete di banyak tabel berbeda.

**Keputusan user (dikonfirmasi 2026-07-07):** tambah sebagai **prop opt-in** di `DataTable` sendiri (bukan hook terpisah, bukan reimplement per-tabel). Default OFF — 20 consumer existing tidak berubah sama sekali kalau tidak pasang prop baru. Plan lama (`2026-07-06-sm-vckd-bulk-kartu-id-template.md`) sempat eksplisit **melarang** ubah `DataTable` generic karena takut regresi ke 20 consumer — opsi opt-in/default-off di plan ini yang menyelesaikan concern itu (tidak ada breaking change untuk yang tidak pasang prop).

## 2. Scope

**In scope:**
- Prop baru di `DataTable`: `selectable`, `selectedIds`, `onSelectionChange`, (opsional) `bulkActions` slot.
- Checkbox kolom auto-inject di posisi pertama saat `selectable=true` — header checkbox = select-all-in-page, row checkbox = toggle 1 row.
- Selection **terkontrol dari parent** (controlled component, bukan state internal) — supaya parent bisa baca `selectedIds` untuk bulk delete/edit action di luar tabel (toolbar, modal, dst).

**Out of scope (bukan syarat rilis issue ini):**
- Refactor `QrCardsTab.tsx` ke prop baru — opsional, boleh menyusul terpisah.
- Implementasi bulk-edit/bulk-delete UI di tabel manapun (mis. `StudentsTable`) — itu kerja consumer masing-masing setelah prop ini ada, bukan bagian plan ini.
- Selection lintas-halaman pagination (select all N total, bukan cuma page ini) — v1 cukup select-all **di halaman aktif** (`currentPageData`), sesuai pola `QrCardsTab` (`filteredStudents`, bukan lintas-pagination karena tabel itu `pagination={false}`... **cek ulang saat implementasi**: kalau `DataTable` pagination aktif, select-all harus jelas scope-nya "halaman ini" vs "semua hasil filter" — pilih **"semua hasil filter" (`sortedData`)** karena itu ekspektasi user yang lebih intuitif (klik "select all" harusnya pilih semua yang match search, bukan cuma 10 yang kebetulan kelihatan).

## 3. Reuse / Context (terverifikasi)

- `DataTable` props existing (`Table.tsx:23-71`): sudah ada `getRowId` (dipakai expandable + loading row match) — reuse persis buat key selection, jangan bikin identifier baru.
- `Column` interface (`Table.tsx:8-19`): kolom auto-inject checkbox harus construct object `Column` yang valid (key khusus, mis. `__select__`, `sortable: false`, `width` kecil tetap) — taruh di `visibleColumns` paling depan, **jangan** masuk `hideableColumns`/`ColumnToggle` (checkbox kolom tidak boleh bisa disembunyikan).
- Body render loop `Table.tsx` (~line 340-410): tempat inject `<td>` checkbox pertama, sejajar existing `visibleColumns.map`.
- Header render loop `Table.tsx` (~line 265-310): tempat inject `<th>` checkbox + trigger select-all.
- `Checkbox` component: `@/components/form/input/Checkbox` (dipakai `QrCardsTab`) — reuse langsung, jangan bikin checkbox baru.
- Referensi pola lengkap select-all + row toggle + isAllSelected: `QrCardsTab.tsx:92-105,147,154-176` — logic-nya dipindah jadi built-in `DataTable`, bukan didesain ulang dari nol.

## 4. Design — Props Baru

```ts
interface DataTableProps {
  // ...existing props tidak berubah...

  /** Opt-in row selection. Default false — 0 impact ke consumer existing. */
  selectable?: boolean
  /** Controlled selection state (id dari getRowId). Wajib kalau selectable=true. */
  selectedIds?: Set<string | number>
  /** Dipanggil saat user toggle 1 row atau select-all/none. */
  onSelectionChange?: (next: Set<string | number>) => void
  /** Slot render custom di toolbar saat ada selection (mis. tombol "Hapus 3 item"). */
  renderBulkActions?: (selectedIds: Set<string | number>, clearSelection: () => void) => ReactNode
}
```

**Kenapa controlled (bukan internal state):** parent butuh baca `selectedIds` buat trigger bulk delete/edit di luar tabel (toolbar terpisah, confirm modal). Kalau state internal di `DataTable`, parent harus lift-state lewat callback tiap render — controlled lebih simple & konsisten sama pola React modern (mirip `<input value=/onChange=>`).

**Kenapa bukan hook terpisah (`useTableSelection`):** user eksplisit minta "props, bisa dipasang atau tidak" — hook terpisah tetap butuh consumer pasang checkbox column manual tiap tabel (styling/posisi bisa beda-beda). Prop built-in = satu styling konsisten otomatis di semua tabel yang opt-in.

## 5. Implementation Steps

1. **Column injection** — saat `selectable=true`, construct kolom checkbox synthetic dan `unshift` ke `visibleColumns` (bukan ke `columns` prop asli, supaya tidak kena search/sort/ColumnToggle logic yang jalan di `columns`).
2. **Header checkbox** — render `Checkbox` dengan `checked = isAllSelected`, `indeterminate` kalau sebagian (cek apakah `Checkbox` component support prop `indeterminate`; kalau tidak, tambahkan atau skip visual indeterminate untuk v1). `onChange` → toggle semua id di `sortedData` (scope "semua hasil filter", lihat §2).
3. **Row checkbox** — tiap row, `checked = selectedIds.has(getRowId(item, index))`, `onChange` → `onSelectionChange(toggle logic)`.
4. **Bulk actions toolbar** — kalau `renderBulkActions` diberikan dan `selectedIds.size > 0`, render di atas tabel (dekat toolbar search/pagination existing) dengan slot `clearSelection` helper.
5. **`onRowClick` interaction** — pastikan klik checkbox tidak trigger `onRowClick`/`expandable` toggle di baris yang sama (stopPropagation di checkbox `<td>`).

## 6. TDD (WAJIB — business logic: selection state transitions)

Per CLAUDE.md, logic non-trivial → test dulu:
- Toggle 1 row: belum ke-select → ke-select; sudah ke-select → ke-unselect.
- Select-all saat belum semua ke-select → semua `sortedData` masuk `selectedIds`.
- Select-all saat semua sudah ke-select (klik lagi) → semua keluar (unselect all), konsisten sama toggle pattern yang baru dipasang di `BatchStandardKelasModal` (`toggleSelectAllKelompok`, sm-lyet punya sesi kerja yang sama harinya).
- Search/filter berubah → `selectedIds` yang di luar hasil filter baru **tetap dipertahankan** (tidak hilang diam-diam) — tapi checkbox select-all cuma refleksikan state utk hasil filter saat ini (`isAllSelected` dihitung dari `sortedData`, bukan `selectedIds.size === data.length` total).
- `getRowId` custom (bukan default `item.id`) → selection tetap match benar.

Test file: `src/components/table/__tests__/Table.selection.test.tsx` (baru).

## 7. Verification (end-to-end manual, karena UI)

1. Pasang `selectable` di 1 tabel percobaan (bisa `QrCardsTab` sementara buat smoke test, revert setelah — atau bikin halaman dev/test terpisah). Pastikan 20 consumer LAIN yang tidak pasang prop baru **tampil identik** (regression check visual, minimal StudentsTable + GuruTable + AdminTable).
2. Cek search + selection: pilih beberapa row, ketik di search box, pastikan selection tidak hilang, select-all cuma pengaruhi hasil filter saat ini.
3. Cek pagination + selection: pilih row di halaman 1, pindah ke halaman 2, balik ke halaman 1 — checkbox row halaman 1 masih ke-centang.
4. `npm run type-check`, `npm run test:run`.

## 8. Files

- `src/components/table/Table.tsx` — prop baru + render logic (utama).
- `src/components/table/__tests__/Table.selection.test.tsx` — baru, TDD.
- (opsional, tidak wajib rilis ini) `src/app/(admin)/users/siswa/components/QrCardsTab.tsx` — refactor pakai prop baru, hapus kolom `select` manual.

## 9. Non-goals / Follow-up terpisah

- Bulk delete/edit action per-entity (siswa, kelas, dll) — issue baru per tabel setelah prop ini ada, bukan bagian sm-lyet.
- Cross-page select-all (select all N total across pages) — v2 kalau ada kebutuhan nyata.
