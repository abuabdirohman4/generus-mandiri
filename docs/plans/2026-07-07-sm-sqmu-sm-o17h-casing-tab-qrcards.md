# sm-sqmu + sm-o17h: Casing nama/kelompok + Restructure Cetak Kartu QR jadi tab

## Context
Lanjutan fitur kartu ID QR (sm-vckd/sm-bt6y/sm-k31t, sm-k8dz sudah closed). Gabungan 2 issue dikerjakan sekaligus per keputusan user (1 Antigravity run).

---

## PART A — sm-sqmu: Dropdown casing nama/kelompok per-template

### Requirement
3 opsi casing: `original` (apa adanya dari DB, default), `uppercase`, `titlecase`. Terpisah untuk nama siswa dan nama kelompok. Diterapkan di compose PDF (WYSIWYG, tersimpan per-template).

### Design

**DB migration** — tambah 2 kolom ke `id_card_templates`:
- `name_casing text NOT NULL DEFAULT 'original'` — CHECK `IN ('original','uppercase','titlecase')`
- `kelompok_casing text NOT NULL DEFAULT 'original'` — sama

**Types** (`src/types/idCardTemplate.ts`) — tambah field ke `IdCardTemplate` dan `TemplatePositions`:
```ts
name_casing: 'original' | 'uppercase' | 'titlecase'
kelompok_casing: 'original' | 'uppercase' | 'titlecase'
```

**Pure function (TDD wajib)** — `src/lib/idCard/textCasing.ts`:
```ts
export type TextCasing = 'original' | 'uppercase' | 'titlecase'
export function applyCasing(text: string, casing: TextCasing): string
```
- `original` → as-is. `uppercase` → `.toUpperCase()`. `titlecase` → tiap kata huruf awal besar sisanya kecil.
- Test file `src/lib/idCard/textCasing.test.ts` — RED dulu: string kosong, sudah uppercase, mixed case, multi-word, single word, whitespace ganda/leading-trailing.

**`composeCard.client.ts`** — import `applyCasing`, transform `studentName`/`studentKelompok` sebelum `ctx.fillText`.

**`TemplateClient.tsx`** — state `nameCasing`/`kelompokCasing` (default `'original'`), load dari `template.name_casing`/`kelompok_casing`, masukkan ke `positions` saat save. UI: dropdown pakai `InputFilter` existing (BUKAN raw `<select>`), taruh di section styling Nama & Kelompok masing-masing. Label opsi: "Apa adanya" / "HURUF BESAR" / "Awal Kata Besar".

**`logic.ts`** (`validateTemplatePositions`) — tambah validasi whitelist value casing.

### Files
1. Migration SQL (baru)
2. `src/types/idCardTemplate.ts`
3. `src/lib/idCard/textCasing.ts` (baru)
4. `src/lib/idCard/textCasing.test.ts` (baru)
5. `src/lib/idCard/composeCard.client.ts`
6. `TemplateClient.tsx`
7. `logic.ts`

---

## PART B — sm-o17h: Restructure "Cetak Kartu QR" jadi tab + reuse DataTable + loading spinner

### B1. Pindah "Cetak Kartu QR" dari tombol → tab

**Current**: `src/app/(admin)/users/siswa/page.tsx` punya tombol "Cetak Kartu QR" (baris ~314 area admin, ~342 area non-admin) yang `router.push('/users/siswa/qr-cards')`. Halaman qr-cards adalah `src/app/(admin)/users/siswa/qr-cards/page.tsx` (standalone route, self-contained: own hooks `useStudents`/`useClasses`/`useDaerah`/`useDesa`/`useKelompok`, own filter state, own generate-PDF handler).

**Target**:
- Ekstrak isi `qr-cards/page.tsx` (semua JSX + logic di bawah header "Cetak Kartu QR" — SKIP header h1/p sendiri, karena tab udah punya context "Siswa") jadi komponen baru `src/app/(admin)/users/siswa/components/QrCardsTab.tsx`.
- Tambah tab baru di `page.tsx` siswa: value `'qr-cards'`, label "Cetak Kartu QR", disisipkan di antara "Sebaran Siswa" dan (kalau ada) "Permintaan Transfer" — ikuti pola `handleTabChange('qr-cards')` + conditional render `{activeTab === 'qr-cards' && <QrCardsTab .../>}`.
- **Tab ini SEBAIKNYA hanya muncul untuk user yang `canManageIdCardTemplate(userProfile)`** (sama syarat kayak tombol "Kelola Template" existing) — cek constraint akses ini konsisten, jangan sampai tab keliatan tapi kontennya "unauthorized" render kosong.
- Hapus tombol "Cetak Kartu QR" dari header (baik varian admin `<>` maupun varian non-admin `else` block) di `page.tsx`.
- **Hapus rute lama**: `src/app/(admin)/users/siswa/qr-cards/page.tsx` dan `layout.tsx` DIHAPUS (fitur pindah total ke tab, tidak ada 2 entry point). Sub-route `qr-cards/template/*` (Kelola Template) TETAP ADA sebagai halaman terpisah (tidak diminta pindah, `router.push` ke situ tetap jalan dari dalam tab `QrCardsTab`).
- Update 3 tempat navigasi WAJIB per CLAUDE.md kalau ada referensi ke rute `/users/siswa/qr-cards` sebagai halaman (sidebar/quick-actions/pageTitle) — CEK dulu apakah rute ini pernah didaftarkan di `AppSidebar.tsx`/`QuickActions.tsx`/`AppHeader.tsx` `getPageTitle()`. Kalau ada, hapus juga entrinya (rute sudah tidak eksis sebagai halaman mandiri).

### B2. Reuse `DataTable` di `QrCardsTab`

**Current**: qr-cards pakai raw `<table>` manual (checkbox select-all + per-row, kolom Nama/Kelompok/Kelas, pagination manual sendiri `Pagination` component + `itemsPerPage` state sendiri).

**Target**: ganti pakai `DataTable` (`@/components/table/Table`, generic, dipakai juga di `StudentsTable.tsx` sehingga tampilan konsisten) — `columns` didefinisikan (checkbox col custom via `renderCell`, Nama, Kelompok, Kelas), `data={paginatedStudents}` atau serahkan pagination ke `DataTable` built-in (`pagination`, `itemsPerPageOptions`, `searchable`) daripada reinvent manual — SESUAIKAN, cek API `DataTable` (`src/components/table/Table.tsx`) dulu apakah `pagination`/`searchable` built-in bisa gantikan state manual (`currentPage`,`itemsPerPage`,`Pagination` import) yang sekarang ada, biar tidak duplikasi logic pagination.

Checkbox select-all header + per-row: pakai `renderCell` untuk kolom checkbox (key khusus, misal `'select'`), `getRowId` untuk map row ke student.id, state `selectedIds` (Set) tetap dikelola di `QrCardsTab` (DataTable tidak perlu tau soal selection, cuma render UI checkbox via renderCell + onChange callback closure ke handler existing `handleSelectRow`).

**Preserve semua existing logic**: filter (`DataFilter`), pilih template (`InputFilter`), tombol generate PDF, progress indicator saat generating — HANYA tabel container-nya yang diganti.

### B3. Loading spinner tombol navigasi ke halaman lain (delay terasa)

**Scope**: tombol yang trigger `router.push` ke halaman lain dengan delay terasa — minimal:
- Tombol "Kelola Template" di `QrCardsTab.tsx` (hasil ekstraksi B1) — `router.push('/users/siswa/qr-cards/template')`.
- Cek juga apakah ada tombol serupa lain di file terkait kartu ID (`TemplateManager.tsx`/`TemplateList.tsx` kalau ada navigasi serupa) — kalau ada pola sama (button + router.push + delay), terapkan pola yang sama untuk konsistensi.

**Pattern**: tambah state lokal `const [navigating, setNavigating] = useState(false)`, di onClick: `setNavigating(true); router.push(...)`. Tombol pakai prop `loading={navigating}` dari komponen `Button` (`components/ui/button/Button`) — CEK dulu apakah `Button` sudah punya prop `loading` (sudah dipakai di `TemplateClient.tsx` `handleSave` submit button, contoh: `<Button loading={submitting}>`), reuse pola yang sama, JANGAN reinvent spinner manual.

### Files (Part B)
1. `src/app/(admin)/users/siswa/components/QrCardsTab.tsx` (baru, dari isi `qr-cards/page.tsx`)
2. `src/app/(admin)/users/siswa/page.tsx` (tab baru + hapus tombol lama)
3. Hapus: `src/app/(admin)/users/siswa/qr-cards/page.tsx`, `qr-cards/layout.tsx`
4. Cek/update: `AppSidebar.tsx`, `QuickActions.tsx`, `AppHeader.tsx` (kalau ada referensi rute lama)

---

## Acceptance Criteria
- [ ] Migration applied, `name_casing`/`kelompok_casing` kolom ada default `'original'`
- [ ] `applyCasing()` pure function + test pass (RED→GREEN)
- [ ] Dropdown casing muncul & tersimpan di editor template
- [ ] PDF hasil generate reflect casing yang dipilih
- [ ] Tab "Cetak Kartu QR" muncul di halaman Siswa (setelah "Sebaran Siswa"), tombol lama di header dihapus
- [ ] Rute `/users/siswa/qr-cards` (standalone) sudah tidak ada; `/users/siswa/qr-cards/template` tetap jalan
- [ ] Tabel di tab Cetak Kartu QR pakai `DataTable`, tampilan konsisten dgn tabel Siswa
- [ ] Tombol "Kelola Template" (dan sejenis) tampilkan loading spinner saat diklik sebelum halaman berpindah
- [ ] `npm run type-check` 0 error
- [ ] `npm run test:run` scope idCard + qr-cards pass
