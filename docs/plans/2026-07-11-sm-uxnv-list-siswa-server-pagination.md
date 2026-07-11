# Server-side Pagination + Narrow SELECT — List Siswa (sm-uxnv)

**Tanggal:** 2026-07-11
**Beads:** sm-uxnv (P2)
**GH:** #TBD
**Status:** direncanakan

## Konteks — kenapa ini ada

List `/users/siswa` render dengan **`fetchAllStudents` narik ~2198 row** (batch loop 1000/page) tiap load, plus nested join `daerah/desa/kelompok/student_classes` per row. Egress = payload × frekuensi. List siswa 31-95 view/hari (lihat `egress-daily-users.md`) — bukan #1 tapi payload/view besar (2198 row × join). Fix: paginasi server-side + trim select + pindah filter ke server.

**Prioritas: P2.** Bukan biang utama (presensi lebih besar), tapi payload gemuk & mudah membengkak saat siswa nambah. Kerjakan setelah 3 fix utama (sm-5jzd/2fux/euox) — sudah shipped.

## Kondisi saat ini (hasil explore)

- **`fetchAllStudents`** (`students/queries.ts:29`) — batch loop, `STUDENT_SELECT` (queries.ts:11) bawa nested join `student_classes.classes`, `daerah`, `desa`, `kelompok` per row.
- **`getAllStudents`** (`students/actions.ts:150`) — server action pembungkus, return `{success,data,message}`.
- **`useStudents`** (`@/hooks/useStudents`) → **`useSiswaPage`** hook.
- **SEMUA filter client-side** di `useSiswaPage.filteredStudents` (useMemo): teacher-class, daerah, desa, kelompok, kelas, gender. Data full di memory, filter di JS.
- **`DataTable`** (`src/components/table/Table.tsx`) — pagination + search + sort **100% client-side** (slice memory). TIDAK ada server-mode props (`onPageChange`/`onSearch`/`totalCount`).
- **Konsumen lain `getAllStudents`/`fetchAllStudents`:** `QrCardsTab`, `AssignStudentsModal`, `TemplateClient`, `sidebar.ts`, `StudentsTable`. Beberapa BUTUH semua row (QR cards, assign, template) → jalur all-rows WAJIB dipertahankan.

## Risiko (kenapa plan, bukan direct)

**TINGGI.** Pindah pagination/search/filter ke server mengubah kontrak `useStudents` + `DataTable` + `useSiswaPage`. Bahaya:
- Filter parsial: kalau search cuma cari di halaman aktif (bukan seluruh DB) → user "kehilangan" siswa. WAJIB `.ilike` server-side.
- Teacher-class filter: teacher hanya boleh lihat siswa kelasnya — kalau filter itu pindah ke server harus benar per role, jangan bocor.
- Export/import/naik-kelas/QR/assign butuh SEMUA row → jalur all-rows tak boleh rusak.

## Keputusan arsitektur

**Pisahkan dua jalur, jangan paksa satu:**
1. **Jalur LIST (baru, paginated)** — `fetchStudentsPaginated(supabase, { page, pageSize, search, filters, role, teacherClassIds })` → `.range()` + `.ilike('name', ...)` + filter server-side + return `{ rows, totalCount }`. Trim select: buang nested join berat; resolve nama daerah/desa/kelompok/kelas dari reference list yang SUDAH di-cache client (`useClasses`/`useDaerah`/`useDesa`/`useKelompok`) via id → jangan join per row.
2. **Jalur ALL-ROWS (existing, dipertahankan)** — `fetchAllStudents` TETAP untuk export/import/naik-kelas/QR/assign/template. Jangan sentuh.

**DataTable:** tambah **server-mode opsional** (props `manualPagination`, `totalCount`, `onPageChange`, `onSearchChange`, `onSortChange`) — kalau tak diisi, perilaku client-side lama (backward compatible, komponen lain tak terpengaruh). List siswa pakai mode server; sisanya tetap client.

## Scope

### Task 1 — Query paginated + count
`fetchStudentsPaginated` di `queries.ts`. Return `{ data, count, error }` pakai `.select(NARROW_SELECT, { count: 'exact' })`. `NARROW_SELECT` = kolom yang dirender tabel saja (id, name, gender, class_id, kelompok_id, desa_id, daerah_id, status) — TANPA nested join. Filter server: `.ilike('name', %search%)`, `.in('daerah_id', ...)` dst, `.range(page*size, ...)`. Untuk kelas/teacher-class (many-to-many via student_classes): resolve student_ids via query `student_classes.in('class_id', ...)` lalu `.in('id', studentIds)` (pola sudah ada di `fetchAllStudents`).

### Task 2 — Server action
`getStudentsPaginated(params)` return `{success, data: {rows, totalCount}, message}`. Permission + role filter (teacher → inject teacherClassIds; admin → scope daerah/desa/kelompok dari profil). Nama daerah/desa/kelompok/kelas TIDAK di-join — dikirim id, client resolve dari reference cache.

### Task 3 — Hook + DataTable server-mode
- `useStudentsPaginated` (SWR key berisi page/pageSize/search/filters) — `revalidateOnFocus:false`, `keepPreviousData:true` (biar tak flicker saat ganti halaman).
- `DataTable`: tambah props server-mode opsional (default undefined = client-mode lama). Saat manualPagination true: search/page/sort panggil callback, jangan slice lokal; render `totalCount`.
- `useSiswaPage`: pindah state search/page/filter jadi input query (bukan useMemo client). Debounce search 300ms sebelum refetch.

### Task 4 — Resolve nama dari reference (client)
Kolom render tabel butuh nama daerah/desa/kelompok/kelas. Karena select tak lagi join, resolve di render dari `daerah`/`desa`/`kelompok`/`classes` (sudah di-fetch `useDaerah` dll) via `Map<id,name>`. Kalau list itu belum ke-load, fallback strip/skeleton.

### Task 5 — Tests (TDD wajib — filter/search/export)
- `queries.test`: `fetchStudentsPaginated` select TIDAK join berat, ada `count:'exact'`, `.range()` benar, `.ilike` saat search, `.in` saat filter. `fetchAllStudents` UTUH (regression — export tetap all-rows).
- `actions.test`: `getStudentsPaginated` teacher → hanya siswa kelasnya (tak bocor); admin → scope org; return shape `{rows,totalCount}`.
- Komponen/integration: search "budi" → server dipanggil dgn search=budi, hasil dari SELURUH DB bukan halaman aktif; ganti halaman → refetch; filter kombinasi (kelas+gender) benar.
- E2E smoke (opsional): buka list, search nama yang ada di halaman 5 → ketemu.

## Verifikasi
- List siswa render + paginasi + search + filter identik hasilnya (search cari seluruh DB, bukan halaman aktif).
- Teacher hanya lihat siswa kelasnya. Admin sesuai scope.
- Export/import/naik-kelas/QR/assign masih lihat SEMUA row.
- `mcp get_logs (api)`: query `students?...` list bawa `limit` kecil (pageSize) + tanpa join berat; count query terpisah ringan.
- Egress dashboard: MB per load `/users/siswa` turun (dari ~2198 row → pageSize baris).

## Risiko & mitigasi
- TINGGI (kontrak lintas komponen). Mitigasi: DataTable server-mode OPSIONAL (backward compatible), jalur all-rows dipisah & tak disentuh, TDD ketat filter/search/teacher-scope, `keepPreviousData` cegah flicker.

## CLAUDE.md Check
- [ ] Pattern baru? Ya — "server-side pagination + count untuk list besar; reference resolve client-side, bukan join per row". Tambah 1 baris ke `egress-cost-optimization.md`.
- [ ] Tabel DB baru? Tidak.
- [ ] Route/page baru? Tidak.
- [ ] Permission pattern baru? Tidak — reuse role filter existing, pindah ke server.

## Workflow / handoff
- Claude Code: plan + bd (sm-uxnv) + GH + prompt.
- Implementasi: **Antigravity** (≥5 file: queries, actions, hook, DataTable, useSiswaPage, tests — kandidat A).
- User: git + run tests.

## Terkait
- sm-kt2j (parent — bagian ini di-defer dari sana).
- `docs/claude/egress-register.md` (baris list siswa).
- `docs/claude/egress-cost-optimization.md`.
