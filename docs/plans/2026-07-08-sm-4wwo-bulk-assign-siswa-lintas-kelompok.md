# Plan: Feature B — Bulk-assign siswa lintas kelompok + fix authorization

**Date:** 2026-07-08
**Related:** `docs/plans/2026-07-07-cai-cross-kelompok-class.md` (Feature A sudah selesai: sm-o9no)

## Context

Admin daerah/desa (dan guru terpilih) perlu mengisi kelas seperti "CAI 2026" dengan siswa dari **berbagai kelompok sekaligus** — tiap siswa masuk ke "CAI 2026" di kelompoknya masing-masing (model: 1 kelas = 1 kelompok, jadi "CAI 2026" = N baris `classes`, satu per kelompok, semua share `class_master_id`).

Saat ini `AssignStudentsModal` cuma bisa assign ke **satu kelas di satu kelompok** (client-side filter membatasi ke kelompok terpilih). Assign lintas kelompok = harus ulang per kelompok, capek.

**Temuan kritis dari explorasi (WAJIB ditangani):** `assignStudentsToClass` (`students/actions.ts:795`) **tidak punya authorization backend sama sekali** — `getUserProfile()` dipanggil lalu dibuang, dan tabel `student_classes` **RLS-nya DISABLED** (0 policy). Artinya siapapun yang bisa memanggil action ini bisa assign siswa manapun ke kelas manapun, lintas kelompok, tanpa batas. Selama ini "aman" hanya karena tombol Assign disembunyikan (UI-gated `isAdmin`). Membuka fitur ke guru = memperlebar lubang ini kalau backend tidak ditambal dulu. `createStudent` juga tanpa scope-guard kecuali untuk admin_desa (`logic.ts:185`).

## Keputusan user (2026-07-08)

1. **Akses**: admin daerah/desa otomatis + guru terpilih via flag `can_bulk_assign_cross_kelompok` yang di-set dari halaman guru (SettingsModal). Guru/admin kelompok tetap terbatas kelompoknya (tak butuh cross-kelompok).
2. **Fix keamanan**: dikerjakan **bareng** Feature B (wajib, bukan issue terpisah).
3. **Kelas belum ada di kelompok siswa**: **skip + laporkan** (bukan auto-create). Contoh: "1 siswa dilewati: kelas CAI 2026 belum ada di Warlob 3" → user jalankan Feature A dulu.

## Fakta terverifikasi (DB + kode)

- Role literal hanya 3: `superadmin` / `admin` / `teacher`. Level daerah/desa/kelompok = derived dari hierarchy id (`accessControl.ts:5-44`). `isAdmin` = admin|superadmin (`page.tsx:71`), true untuk semua admin_*, false untuk semua guru_*.
- `getAllClasses` (`classes/actions.ts:20`) & `getAllStudents` (`students/actions.ts:143`) **sudah benar per role** — cabang teacher hierarkis pakai `createAdminClient` + `fetchClassesHierarchical`/scope by kelompok/desa/daerah. Tidak ada role yang dapat dropdown kosong (asal data ada). **Tidak perlu diubah.**
- Kelas custom pakai master fix **"Lainnya"** → routing kelas custom butuh `class_master_id=Lainnya AND name ILIKE ?`; kelas standar cukup `class_master_id`. (Revisi sm-o9no.)
- Pola permission flag guru: `profile.permissions?.can_X === true` (`accessControl.ts:110,139`). Toggle di-set di `guru/components/SettingsModal.tsx` + `updateTeacherPermissions`.
- `student_classes` RLS OFF, `student_enrollments` RLS ON (autoEnroll admin sudah jalan).

## Perubahan

### 1. Authorization helper baru — `src/lib/accessControl.ts` (+ re-export `userUtils`, mirror server di `accessControlServer.ts`)

```ts
canBulkAssignCrossKelompok(profile) =
  isSuperAdmin || isAdminDaerah || isAdminDesa ||
  isTeacherDaerah || isTeacherDesa ||
  profile.permissions?.can_bulk_assign_cross_kelompok === true
```
Mirror pola `canMultiKelompokLaporan` (`accessControl.ts:139`). Versi server dipakai di action (gate KRITIS — satu-satunya benteng karena RLS off).

### 2. Resolver — `students/actions/classes/queries.ts`

`resolveClassInKelompok(supabase, classMasterId, kelompokId, className?) → classId | null`
- Query `class_master_mappings` JOIN `classes` WHERE `class_master_id=? AND kelompok_id=?`. **Two-query pattern** (jangan nested PostgREST — silently fails; CLAUDE.md + `accessControlServer.ts:170`).
- Kalau `classMasterId` = master "Lainnya" → WAJIB tambah `AND name ILIKE className` (custom class beda nama share master sama).

### 3. Action baru — `students/actions/students/actions.ts` (dekat `assignStudentsToClass:795`)

`assignStudentsToClassGroup(studentIds, classMasterId, className?)`:
- **Gate**: `getUserProfile()` → `if (!canBulkAssignCrossKelompok(profile)) return {success:false, message:'...'}`.
- Ambil `kelompok_id` tiap siswa (query `students`). **Scope guard**: pastikan tiap siswa dalam scope profile (via `getDataFilter` daerah/desa, atau `getTeacherAllowedClassIds`+`teacher_kelompok_access` untuk guru) — tolak siswa di luar scope.
- Per siswa: `targetClassId = resolveClassInKelompok(classMasterId, student.kelompok_id, className)`.
  - null → `skipped` dgn alasan "kelas belum ada di kelompok X" (keputusan #3).
  - **Assert** `targetClass.kelompok_id === student.kelompok_id` (defense).
- Batch insert `student_classes` (skip dupe via UNIQUE student_id,class_id) + `autoEnrollStudent` per siswa (`actions.ts:62`).
- Return `{ assigned, skipped: [{studentName, reason}] }`.

### 4. Fix authorization lubang existing (WAJIB — keputusan #2)

- `assignStudentsToClass` (`actions.ts:795`): tambah gate + scope-guard yang sama (jangan biarkan tanpa auth). Minimal: cek `canBulkAssignCrossKelompok` ATAU admin-scope, + validasi `class.kelompok_id` dalam scope profile.
- `createStudent` (`actions.ts:379`): tambah scope-guard untuk admin_daerah + guru (saat ini cuma admin_desa di `logic.ts:185`) — tolak bikin siswa di kelompok di luar scope. Konsisten pola `buildStudentHierarchy`.

### 5. UI — `AssignStudentsModal.tsx` + `page.tsx` + `SettingsModal.tsx`

- **`page.tsx`**: pindah tombol "Assign" keluar dari cabang `isAdmin` (`page.tsx:324-348`). Gate baru: tampil kalau `canBulkAssignCrossKelompok(profile)` (client via userUtils). Guru terpilih kini lihat tombol.
- **`AssignStudentsModal.tsx`**: generalisasi target — bukan pilih 1 kelas/1 kelompok, tapi pilih **keluarga kelas**:
  - Standar: list `class_master.name`.
  - Custom: list distinct `classes.name` yang mapping ke master "Lainnya" dalam scope (user pilih "CAI 2026"/"Tahfidz" by nama, bukan "Lainnya").
  - Siswa: `MultiSelectCheckbox` lintas kelompok dalam scope, search + select-all, label tampilkan kelompok tiap siswa.
  - Submit → `assignStudentsToClassGroup(studentIds, classMasterId, className?)`. Tampilkan hasil X assigned / Y skipped (+alasan).
  - Simpan mode lama (single-class assign) atau ganti total — **putuskan saat eksekusi**: rekomendasi ganti total (cross-kelompok superset dari single, filter kelompok = pilih 1 kelompok saja).
- **`guru/components/SettingsModal.tsx`**: tambah toggle `can_bulk_assign_cross_kelompok` (pola `can_multi_kelompok_laporan`, sekitar `:171`), simpan via `updateTeacherPermissions`.

## Files (representatif)

- `src/lib/accessControl.ts` + `accessControlServer.ts` — `canBulkAssignCrossKelompok`.
- `src/app/(admin)/users/siswa/actions/students/actions.ts` — `assignStudentsToClassGroup` (baru), fix `assignStudentsToClass` + `createStudent`.
- `src/app/(admin)/users/siswa/actions/classes/queries.ts` — `resolveClassInKelompok`.
- `src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx` (+ `stores/assignStudentsStore.ts`) — generalisasi.
- `src/app/(admin)/users/siswa/page.tsx` — gate tombol Assign.
- `src/app/(admin)/users/guru/components/SettingsModal.tsx` — toggle flag.

## TDD (WAJIB — business logic + security)

- `canBulkAssignCrossKelompok`: admin daerah/desa ✅, guru daerah/desa ✅, guru+flag ✅, guru kelompok tanpa flag ❌, admin kelompok ❌, student ❌.
- `resolveClassInKelompok`: standar (master→kelas per kelompok) ✅; custom (master Lainnya + nama) ✅; nama beda master sama → tidak ketuker; kelompok tanpa kelas → null.
- `assignStudentsToClassGroup`: routing tiap siswa ke class di kelompoknya; kelas belum ada → skipped+alasan; dupe → skipped; siswa di luar scope → ditolak; guard kelompok-match.
- `assignStudentsToClass` (fix): tanpa akses → ditolak; class di luar scope → ditolak.
- Ingat [[postgrest-select-not-typechecked]] — select string wajib E2E/smoke, tak ter-cover unit.

## Verification (end-to-end)

Pre-warm route dulu via curl sebelum Playwright (dev cold-compile 30-40s; lihat CLAUDE.md quirk).

1. Login **admin daerah** → buka Assign → pilih "CAI 2026" → centang siswa dari ≥2 kelompok → submit. Cek DB: tiap siswa masuk `student_classes` dgn `class_id` yg `kelompok_id`-nya = kelompok siswa:
   ```sql
   SELECT s.name, s.kelompok_id st_kel, c.kelompok_id cls_kel
   FROM student_classes sc JOIN students s ON s.id=sc.student_id
   JOIN classes c ON c.id=sc.class_id WHERE c.name='CAI 2026';
   -- st_kel HARUS = cls_kel tiap baris
   ```
2. Cek `student_enrollments` ter-upsert (autoEnroll).
3. Skenario skip: siswa dari kelompok tanpa "CAI 2026" → muncul di hasil "dilewati", TIDAK masuk `student_classes`, kelas TIDAK auto-kebuat.
4. Login **guru daerah dgn flag ON** → tombol Assign muncul, bisa assign dalam scope-nya. **Guru kelompok tanpa flag** → tombol TIDAK muncul.
5. **Security**: panggil `assignStudentsToClass`/`assignStudentsToClassGroup` sebagai role tanpa akses (mis. via test dgn profile guru kelompok) → ditolak, 0 insert.
6. Guru daerah dgn `teacher_kelompok_access` subset → hanya bisa assign siswa/kelas di kelompok yang di-grant.

## Catatan eksekusi

- Kolom `permissions` = JSONB, flag baru cukup ditambah key (`updateTeacherPermissions` sudah fetch-then-merge, `settings/queries.ts:51`) — tak perlu migration.
- Tab Master/kelas custom routing "Lainnya" sudah fixed (sm-o9no) — resolver tinggal pakai.
