CONTEXT:
Fitur kartu ID QR (project generus-mandiri/school-management). Issue gabungan: sm-sqmu + sm-o17h / GH-#123. Plan lengkap: `docs/plans/2026-07-07-sm-sqmu-sm-o17h-casing-tab-qrcards.md` — BACA DULU sebelum mulai, semua detail ada di sana.

CRITICAL: Baca `CLAUDE.md` dulu untuk semua coding rules (TDD wajib untuk pure function, types di `src/types/`, jangan raw HTML form/table kalau ada komponen existing, 3 tempat navigasi wajib update untuk halaman baru/dihapus, server action response format, dll).

TASK: 2 bagian dikerjakan sekaligus (1 batch, sesuai keputusan user).

---

## PART A — Dropdown casing nama/kelompok (sm-sqmu)

3 opsi casing: `original` (default, apa adanya), `uppercase`, `titlecase`. Terpisah untuk nama siswa & kelompok, per-template.

1. **Migration SQL**: tambah kolom `name_casing text NOT NULL DEFAULT 'original'` dan `kelompok_casing text NOT NULL DEFAULT 'original'` ke tabel `id_card_templates`, CHECK constraint value harus salah satu dari `'original','uppercase','titlecase'`.
2. **Types** (`src/types/idCardTemplate.ts`): tambah field union type ke `IdCardTemplate` dan `TemplatePositions`.
3. **Pure function baru** `src/lib/idCard/textCasing.ts` — TDD WAJIB:
   ```ts
   export type TextCasing = 'original' | 'uppercase' | 'titlecase'
   export function applyCasing(text: string, casing: TextCasing): string
   ```
   Test dulu (RED) di `src/lib/idCard/textCasing.test.ts`: string kosong, sudah uppercase, mixed case, multi-word, single word, whitespace ganda/leading-trailing.
4. **`src/lib/idCard/composeCard.client.ts`**: transform `studentName`/`studentKelompok` pakai `applyCasing` + `positions.name_casing`/`kelompok_casing` SEBELUM `ctx.fillText`.
5. **`TemplateClient.tsx`**: state `nameCasing`/`kelompokCasing` (default `'original'`), load dari template existing, masuk ke `positions` saat save. Dropdown pakai `InputFilter` (BUKAN raw `<select>`), taruh di section styling Nama & Kelompok masing-masing. Label: "Apa adanya" / "HURUF BESAR" / "Awal Kata Besar".
6. **`logic.ts`** (`validateTemplatePositions`): tambah validasi whitelist value casing.

Placeholder teks preview (`[NAMA SISWA]`) TIDAK perlu ikut casing (statis, bukan data asli). JANGAN ubah logic font-size (`containerWidthPx`/ResizeObserver, sudah fixed sesi lalu) — di luar scope.

---

## PART B — Restructure "Cetak Kartu QR" jadi tab (sm-o17h)

### B1. Tombol → Tab
- `src/app/(admin)/users/siswa/page.tsx` punya tombol "Cetak Kartu QR" (2 tempat: block admin & block non-admin di header) yang `router.push('/users/siswa/qr-cards')`. HAPUS kedua tombol ini.
- Ekstrak SELURUH isi `src/app/(admin)/users/siswa/qr-cards/page.tsx` (skip bagian header h1 "Cetak Kartu QR" + p deskripsi sendiri — tab konteksnya sudah "Siswa") jadi komponen baru `src/app/(admin)/users/siswa/components/QrCardsTab.tsx`. Semua state/hooks/handler (`useStudents`, `useClasses`, `useDaerah`, `useDesa`, `useKelompok`, filter, generate PDF, dll) ikut pindah apa adanya.
- Tambah tab baru di `page.tsx`: value `'qr-cards'`, label "Cetak Kartu QR", taruh di antara "Sebaran Siswa" dan "Permintaan Transfer" (kalau ada) di dalam `<nav>` yang sudah ada — ikuti pola `handleTabChange('qr-cards')` persis kayak tab lain. Render `{activeTab === 'qr-cards' && <QrCardsTab .../>}`.
- Tab ini HANYA muncul untuk user `canManageIdCardTemplate(userProfile)` (sama syarat kayak tombol "Kelola Template" existing) — jangan sampai tab keliatan tapi isinya unauthorized.
- **Hapus rute lama**: file `src/app/(admin)/users/siswa/qr-cards/page.tsx` dan `qr-cards/layout.tsx` DIHAPUS total. Sub-route `qr-cards/template/*` (Kelola Template) TETAP ADA (tidak diminta pindah).
- **WAJIB cek 3 tempat navigasi** (`AppSidebar.tsx` `allNavItems[]`, `QuickActions.tsx` `quickActions[]`, `AppHeader.tsx` `getPageTitle()`): kalau ada referensi ke rute `/users/siswa/qr-cards` sebagai halaman standalone, hapus entrinya juga (rute sudah tidak eksis).

### B2. Reuse `DataTable`
- `QrCardsTab.tsx` sekarang pakai raw `<table>` manual + `Pagination` component + state `currentPage`/`itemsPerPage` sendiri. GANTI pakai `DataTable` generic (`@/components/table/Table`, sama yang dipakai `StudentsTable.tsx` — biar tampilan konsisten dengan tabel Siswa).
- **Baca dulu API `DataTable`** (`src/components/table/Table.tsx`) — cek apakah prop `pagination`/`searchable`/`itemsPerPageOptions` built-in bisa GANTIKAN state manual pagination yang sekarang ada di `QrCardsTab` (jangan duplikasi logic — kalau `DataTable` udah handle pagination sendiri, hapus state `currentPage`/`itemsPerPage`/import `Pagination` yang lama).
- Kolom: checkbox select-all (header) + per-row (body) via `renderCell` custom (key khusus misal `'select'`), Nama, Kelompok, Kelas — definisikan via `columns` prop. State `selectedIds` (Set) TETAP dikelola di `QrCardsTab` (DataTable gak perlu tau soal selection — cuma render checkbox UI di `renderCell`, `onChange` callback ke handler existing `handleSelectRow`/`handleSelectAll`).
- Preserve semua logic lain apa adanya (filter `DataFilter`, pilih template `InputFilter`, tombol generate PDF, progress indicator) — HANYA container tabel yang diganti.

### B3. Loading spinner tombol navigasi
- Tombol "Kelola Template" di `QrCardsTab.tsx` (`router.push('/users/siswa/qr-cards/template')`) — delay terasa saat pindah halaman, user bisa kira itu bug. Tambah state lokal `navigating` (boolean), `onClick`: `setNavigating(true)` lalu `router.push(...)`.
- Pakai prop `loading` yang SUDAH ADA di komponen `Button` (`components/ui/button/Button`) — contoh pola sudah dipakai di `TemplateClient.tsx` (`<Button loading={submitting}>`). JANGAN reinvent spinner manual.
- Cek juga `TemplateManager.tsx`/`TemplateList.tsx` kalau ada tombol navigasi serupa dengan pola sama — terapkan pola loading yang sama untuk konsistensi kalau relevan.

---

VERIFIKASI SEBELUM LAPOR SELESAI:
1. `npm run type-check` — 0 error.
2. `npm run test:run` scope idCard: `npx vitest run src/lib/idCard` — semua pass termasuk test baru `textCasing.test.ts`.
3. Manual check: halaman Siswa — tab "Cetak Kartu QR" muncul & berfungsi (filter, pilih siswa, pilih template, generate PDF), tombol lama sudah hilang dari header, rute `/users/siswa/qr-cards` sudah tidak bisa diakses (404) tapi `/users/siswa/qr-cards/template` masih jalan.
4. JANGAN jalankan `git add/commit/push` — itu tugas user.
5. Kalau migration perlu dijalankan ke Supabase (MCP), cek dulu MCP connection via `mcp__generus-mandiri-v2__list_tables` sebelum apply — kalau gagal, informasikan ke user, JANGAN asumsi jalan.

Mulai dari Part A (TDD: test `textCasing.test.ts` dulu RED, baru `textCasing.ts` GREEN, sambungkan ke composeCard+TemplateClient+logic), baru lanjut Part B (ekstrak QrCardsTab, ganti DataTable, loading spinner).
