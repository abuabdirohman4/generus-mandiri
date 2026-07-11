CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-11-sm-uxnv-list-siswa-server-pagination.md

ISSUE: sm-uxnv / GH-#137
BRANCH: perf/sm-uxnv-list-siswa-server-pagination

REQUIREMENTS:
1. Ikuti plan task-by-task (Task 1 query paginated → Task 5 tests)
2. TDD ketat: RED → GREEN → REFACTOR. Test filter/search/teacher-scope WAJIB (risiko tinggi).
3. Jalankan test setelah tiap task: npm run test:run. Jangan lanjut kalau FAIL.
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user.

PARITY MUTLAK:
- Search harus cari SELURUH DB (server-side .ilike), BUKAN cuma halaman aktif. Ini bug paling bahaya — jangan sampai user "kehilangan" siswa.
- Teacher hanya lihat siswa kelasnya (filter role di server, tak boleh bocor). Admin sesuai scope daerah/desa/kelompok.
- Export/import/naik-kelas/QR-cards/assign/template TETAP lihat SEMUA row — jalur fetchAllStudents JANGAN disentuh/dirusak.
- DataTable server-mode OPSIONAL (props baru default undefined = perilaku client lama). Komponen lain yang pakai DataTable tak boleh berubah perilaku.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-11-sm-uxnv-list-siswa-server-pagination.md
- Rules: @CLAUDE.md
- Egress rules: @docs/claude/egress-cost-optimization.md
- Query: src/app/(admin)/users/siswa/actions/students/queries.ts (STUDENT_SELECT:11, fetchAllStudents:29)
- Action: src/app/(admin)/users/siswa/actions/students/actions.ts (getAllStudents:150)
- Hook: src/app/(admin)/users/siswa/hooks/useSiswaPage.ts (filteredStudents useMemo — filter client-side)
- Table: src/components/table/Table.tsx (DataTableProps:24 — client-only, tambah server-mode)
- Konsumen all-rows (JANGAN dirusak): QrCardsTab, AssignStudentsModal, TemplateClient, [studentId]/actions/sidebar.ts

Mulai dari Task 1.


---

# ROUND 2 — FIX HASIL REVIEW (Claude Code, 11 Jul)

Round 1 sudah diimplementasi. Review /code-review menemukan **1 blocker yang membatalkan tujuan egress + 2 parity bug + 1 celah security + tes kurang**. Arsitektur (dua jalur terpisah, Table server-mode backward-compatible, hook keepPreviousData) SUDAH BENAR — JANGAN dirombak. Fix HANYA hal di bawah. Jalankan TDD: tulis test RED dulu (khususnya scope/search), baru fix.

## 🔴 FIX 1 (BLOCKER) — hapus fetch all-rows unconditional di useSiswaPage

**Masalah:** `useSiswaPage.ts` panggil `useStudentsPaginated` DAN `useStudents({classId:undefined, enabled:!!userProfile})` sekaligus. Jalur all-rows (~2198 baris) tetap ditarik tiap page load → egress MALAH NAIK, tujuan issue gagal. Buktinya `allStudents` di-destructure di `page.tsx` tapi TIDAK dipakai sama sekali di JSX (0 referensi).

**Fix:**
- Di `useSiswaPage.ts`: HAPUS blok `const { students: allStudents, ... } = useStudents({ classId: undefined, enabled: !!userProfile })`. Jangan fetch all-rows on-mount.
- Hapus `allStudents` dari return object hook + dari destructuring `page.tsx`.
- Konsumen all-rows (QrCardsTab, AssignStudentsModal, TemplateClient, sidebar.ts, export/import/naik-kelas) SUDAH panggil `getAllStudents`/`fetchAllStudents` sendiri — mereka tak butuh `allStudents` dari useSiswaPage. Pastikan jalur mereka utuh, JANGAN disentuh.
- Verifikasi: buka `/users/siswa`, cek MCP api-logs → query `students?...` hanya bawa `limit` kecil (pageSize), TIDAK ada fetch 2198-row lagi.

## 🔴 FIX 2 (PARITY) — pindah filter `status` ke server

**Masalah:** `page.tsx:457-470` filter `status` (active/graduated/inactive/all) client-side pakai `students.filter(...)` — jalan di HALAMAN AKTIF saja (10 baris). User "kehilangan" siswa non-aktif yang ada di halaman lain. Sama bahayanya dgn search page-only.

**Fix:**
- Tambah `status?: string` ke `FetchStudentsParams` + `getStudentsPaginated` params + `UseStudentsPaginatedOptions`.
- Di `fetchStudentsPaginated`: default `status='active'`; kalau `status==='all'` jangan filter, selain itu `.eq('status', status)`. (Cek nilai kolom `students.status` di DB — mungkin null utk aktif; kalau begitu handle `active` = `.or('status.is.null,status.eq.active')`.)
- Di `useSiswaPage`: masukkan `dataFilters.status` ke `paginationParams`, reset `page=1` saat status berubah.
- HAPUS `students.filter(status...)` di `page.tsx` (StatsCards + StudentsTable) — rows sudah terfilter server.
- Test: status='graduated' → server dipanggil dgn status=graduated, hasil dari SELURUH DB.

## 🔴 FIX 3 (PARITY) — `.in('id', allStudentIds)` overflow URL saat >100 id

**Masalah:** di `fetchStudentsPaginated`, saat teacher/kelas filter match >100 siswa, `query.in('id', allStudentIds)` dgn list UUID panjang OVERFLOW URL PostgREST → data null diam-diam → tabel 0 baris tanpa error. (Lihat pola bug `postgrest-in-url-overflow`.)

**Fix:**
- Untuk resolusi student_ids dari `student_classes`/primary `class_id`: kalau `targetClassIds`/`allStudentIds` bisa besar, chunk `.in()` per <=100 id (pola `fetchInBatches` / lihat `fetchAttendanceLogsInBatches` di `src/lib/utils/batchFetching.ts`), ATAU balik pendekatan: filter via join `student_classes` di server tanpa materialisasi list id di client.
- Alternatif lebih bersih: pakai RPC atau `.in` dengan sub-batch lalu union count. Prioritas: hasil count + rows tetap BENAR utk kelas besar (>100 siswa).
- Test: kelas dgn >100 siswa → pagination + count benar (bukan 0).

## 🟡 FIX 4 (SECURITY) — admin scoping harus INTERSECT, bukan tambah

**Masalah:** di `getStudentsPaginated`, admin daerah set `filters.daerah=[own]` tapi `filters.kelompok` kiriman user (bisa dari daerah LAIN) tetap dipakai apa adanya → admin bisa lihat siswa luar scope-nya kalau kirim kelompok_id luar.

**Fix:**
- Scope admin = BATAS ATAS (hard limit), filter user = penyempit DI DALAM batas itu. Terapkan sebagai intersection:
  - admin kelompok: paksa `filters.kelompok = [own]` (abaikan kelompok/desa/daerah user).
  - admin desa: `filters.desa=[own]`; kalau user kirim `filters.kelompok`, IZINKAN hanya kelompok yg ada di bawah desa itu (intersect); tolak/strip sisanya.
  - admin daerah: `filters.daerah=[own]`; user boleh sempitkan ke desa/kelompok DI DALAM daerah itu (intersect), bukan luar.
  - superadmin: tanpa batas (filter user apa adanya).
- Test: admin daerah A kirim `filters.kelompok=[kelompok di daerah B]` → hasil KOSONG / ter-strip, TIDAK bocor.

## 🟡 FIX 5 (TES) — lengkapi tes scope/search yang plan Task 5 wajibkan

Round 1 cuma 2 tes dangkal (unauth + happy-path superadmin). Tambah:
- `queries.test`: `fetchStudentsPaginated` — select TIDAK ada join berat, ada `count:'exact'`, `.range()` benar, `.ilike` saat search, `.eq('status')` saat status, `.in` filter org. `fetchAllStudents` UTUH (regression — export tetap all-rows).
- `actions.test`: teacher → HANYA siswa kelasnya (no-leak, test eksplisit siswa luar kelas tak muncul); admin daerah → tak bisa lihat luar daerah (intersect); shape `{rows,totalCount}`.
- integrasi: search "budi" → server dipanggil search=budi, hasil dari SELURUH DB; ganti halaman → refetch; kelas >100 siswa → count benar.

## Setelah semua fix
1. `npm run test:run` — semua hijau.
2. `npm run type-check` — no error (hapus `any` cast berlebih di page.tsx kalau tipe rows sudah jelas).
3. Verifikasi MCP api-logs: `/users/siswa` load = 1 query paginated ringan + 1 count, TANPA fetch 2198-row.
4. Output ringkasan per-fix: "✅ FIX N complete: [ringkasan]".


---

# ROUND 3 (OPSIONAL) — POLES MINOR (non-blocker)

Round 2 sudah LULUS review. Ini HANYA poles minor, TIDAK mengubah perilaku. Kerjakan kalau sempat; kalau tidak, sm-uxnv tetap boleh merge.

## POLES 1 — chunk >100 siswa jangan tarik semua row (egress)
**Masalah:** di `fetchStudentsPaginated`, saat `allStudentIds.length > 100`, kode loop tiap chunk `.select(NARROW_SELECT)` MENARIK SEMUA baris matching lalu `.slice()` di memory. Untuk kelas >100 siswa, ini tarik semua row tiap page-load (bukan cuma pageSize) — egress balik gemuk utk kasus itu.
**Fix (pilih salah satu):**
- (a) Ubah resolusi kelas→siswa jadi JOIN server-side: query `students` dengan `.in('id', ...)` diganti filter via relasi `student_classes!inner(class_id)` di select PostgREST (`.select('...,student_classes!inner(class_id)').in('student_classes.class_id', targetClassIds)`), sehingga `.range()` + `count:'exact'` jalan di server TANPA materialisasi id list di client. Verifikasi count akurat (hati-hati duplikat kalau siswa punya >1 kelas — pakai distinct/dedup).
- (b) Kalau (a) sulit karena many-to-many count, minimal: fetch HANYA kolom `id` saat kumpulkan `allStudentIds` (sudah), lalu utk halaman aktif, ambil `pageSize` id dari list ter-sort dan `.in('id', pageIds)` NARROW_SELECT hanya utk pageSize itu (bukan semua). Count = `allStudentIds.length` (sudah dihitung). Ini hindari tarik semua NARROW_SELECT row.
**Test:** kelas >100 siswa → page 1 hanya fetch NARROW_SELECT utk <=pageSize baris (assert `.in('id', ...)` dipanggil dgn array <= pageSize), count tetap benar (total >100).

## POLES 2 — rapikan `any` cast
`rows: any[]`, `s: any`, `(a, b)` di sort. Ganti dgn tipe eksplisit dari `NARROW_SELECT` (buat interface `PaginatedStudentRow` di `src/types/student.ts` sesuai kolom NARROW_SELECT: id, name, gender, class_id, kelompok_id, desa_id, daerah_id, status, created_at, updated_at). Update return type `getStudentsPaginated` + `useStudentsPaginated` pakai tipe itu. Type-check harus tetap hijau.

## Setelah poles
1. `npm run test:run` + `npm run type-check` hijau.
2. Output: "✅ POLES N complete".
