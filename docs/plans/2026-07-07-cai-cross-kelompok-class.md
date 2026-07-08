# Plan: Buat & Assign Kelas Lintas-Kelompok dari Level Daerah/Desa

**Date:** 2026-07-07
**Status:** Draft (belum ada sm-id — dibuat saat eksekusi)

## Context

Admin daerah/desa perlu membuat kelas baru (mis. "CAI 2026") yang eksis di **tiap kelompok** dalam scope-nya, lalu mengisi kelas itu dengan siswa dari berbagai kelompok sekaligus — tiap siswa masuk ke "CAI 2026" **di kelompoknya masing-masing**.

Model data saat ini: **1 kelas = 1 kelompok** (`classes.kelompok_id`). Jadi "CAI 2026" se-daerah = N baris `classes` (satu per kelompok), semua berbagi satu `class_master_id`. User sudah konfirmasi tetap pakai model ini (bukan 1 row global) — perubahan paling kecil.

Dua nyeri saat ini:
1. Tombol "Kelas Standar" hanya bisa buat kelas dari **master standar** (Kelas 1–6, SMP, dll) — tak bisa nama bebas seperti "CAI 2026".
2. `AssignStudentsModal` cuma bisa assign siswa ke **satu kelas di satu kelompok** — tak bisa lintas kelompok sekaligus. Assign satu-satu per kelompok = capek.

Tambahan: akses fitur assign ini juga dibuka ke **guru terpilih** (guru desa/daerah hierarkis atau guru yang di-grant), bukan admin saja.

### Fakta yang sudah diverifikasi (DB + kode)

- Kelas senama lintas kelompok **selalu berbagi tepat 1 `class_master_id`**, 0 baris tanpa master (dicek: 48 kelompok, distinct_masters=1). → `class_master_id` = kunci routing andal (jangan match by `name` text) **untuk kelas STANDAR (19 master fix)**.
- **REVISI 2026-07-08 (sm-o9no fix):** kelas CUSTOM (dibuat via "Kelas Custom" tab) TIDAK bikin class_masters baru — semua custom class pakai master fix **"Lainnya"** (id tetap, `class_masters` selalu 19 row). Konsekuensi: `class_master_id` SAJA tidak cukup buat identifikasi "keluarga kelas" custom (CAI 2026 vs Tahfidz sama-sama masternya "Lainnya"). Routing utk kelas custom WAJIB kombinasi `class_master_id = Lainnya AND name = ?` (exact/case-insensitive match), bukan `class_master_id` doang. Kelas standar tetap cukup `class_master_id` saja.
- RLS `classes` **sudah benar** untuk admin daerah/desa (policy "Users can view classes in their hierarchy" handle cabang daerah/desa/kelompok). Bug "dropdown kelas kosong" yang dilaporkan awal **tidak tereproduksi statis** — data kelas untuk admin daerah ada (ratusan baris). Bukan bug; nyeri sebenarnya = alur assign lintas-kelompok belum ada.
- **`student_classes` RLS DISABLED** (dicek `pg_class.relrowsecurity=false`) — tak ada satupun policy. Artinya siapapun authenticated bisa insert; **tak ada guard per-kelompok dari DB**. → Guard `class.kelompok_id === student.kelompok_id` **WAJIB di server action** (bukan andalkan RLS). `student_enrollments` RLS enabled (autoEnroll admin sudah jalan).
- Belum ada satupun jalur kode yang memvalidasi `class.kelompok_id === student.kelompok_id`. Wajib tambah guard di fitur baru.

## Feature A — Bulk-create kelas nama-bebas ke banyak kelompok

Extend alur batch existing agar bisa nama custom, bukan cuma master standar.

**Reuse:**
- `src/app/(admin)/kelas/actions/batch-standard/` — `createBatchStandardClasses` (actions.ts:27), `insertClassWithMasterMapping` (queries.ts:14), `buildBatchPlan` (logic.ts:35).
- `BatchStandardKelasModal.tsx` — UI multi-kelompok (cascade daerah/desa + checkbox kelompok).

**Perubahan:**
1. Action baru `createBatchCustomClasses(kelompokIds: string[], className: string)` (file baru di `kelas/actions/batch-custom/` atau extend `batch-standard`):
   - Buat/temukan satu `class_masters` row untuk `className` (cek existing by name dulu; kalau belum ada, insert `{name: className, category_group: 'custom'}` — cek kolom wajib `class_masters` saat eksekusi).
   - Loop `kelompokIds`: `insertClassWithMasterMapping(supabase, kelompokId, className, masterId)` — skip yang sudah ada (reuse dedupe `buildBatchPlan`).
   - Return `BatchStandardResult` (totalCreated, skipped).
   - Access: `canAccessFeature(profile, 'manage_classes')` (sama seperti batch standar).
2. UI: tambah mode "Kelas Custom" ke `BatchStandardKelasModal` (atau modal baru): input **Nama Kelas** (text) + reuse panel multi-kelompok. Tambah tombol **"Pilih semua kelompok"** (centang semua `filteredKelompok`).

## Feature B — Bulk-assign siswa lintas kelompok

Generalisasi `AssignStudentsModal` agar target = **keluarga kelas** (by `class_master_id`), siswa boleh lintas kelompok.

**Reuse:**
- `AssignStudentsModal.tsx` + `stores/assignStudentsStore` — basis (search siswa, checkbox, select-all, DataFilter auto-fill by role).
- `assignStudentsToClass` (siswa/actions/students/actions.ts:795) — pola insert `student_classes` + skip dupe. TAPI ambil single `classId` & skip `student_enrollments` → butuh varian baru.
- `autoEnrollStudent` (actions.ts:62) — upsert `student_enrollments` (onConflict student_id,academic_year_id,semester).
- `fetchClassMasterMappings` (siswa/actions/classes/queries.ts:16) — Map class_id→master.
- `MultiSelectCheckbox` (search + select-all built-in), `InputFilter`, `DataFilter`.

**Perubahan:**
1. Helper resolver baru (siswa/actions/classes atau lib): `resolveClassInKelompok(classMasterId, kelompokId, className?) → classId | null` — query `class_master_mappings` JOIN `classes` WHERE `class_master_id = ? AND kelompok_id = ?`. **Untuk master "Lainnya" (custom), WAJIB tambah filter `AND name ILIKE className`** (banyak kelas custom beda nama share master yang sama — lihat revisi 2026-07-08 di atas). Untuk 18 master standar lain, `className` tidak perlu (class_master_id sudah unik per kelompok). Pakai **two-query pattern** (jangan nested PostgREST — silently fails, lihat CLAUDE.md & accessControlServer.ts:170).
2. Action baru `assignStudentsToClassGroup(studentIds: string[], classMasterId: string, className?: string)` (`className` wajib diisi kalau `classMasterId` = "Lainnya"):
   - Ambil `kelompok_id` tiap siswa (query `students`).
   - Per siswa: `targetClassId = resolveClassInKelompok(classMasterId, student.kelompok_id)`.
     - Kalau null (kelas "CAI 2026" belum ada di kelompok itu) → masuk `skipped` dengan alasan, ATAU auto-create (putuskan saat eksekusi — default: skip + laporkan, suruh user jalankan Feature A dulu).
   - Guard: pastikan target class `kelompok_id === student.kelompok_id` (implisit dari resolver, tapi assert).
   - Batch insert `student_classes` (skip dupe via UNIQUE student_id,class_id) + `autoEnrollStudent` per siswa.
   - Access gate: helper baru `canBulkAssignCrossKelompok(profile)` = `isAdmin || isTeacherDaerah || isTeacherDesa || permissions.can_bulk_assign_cross_kelompok` (mirror `canMultiKelompokLaporan` accessControl.ts:136 & `canManageIdCardTemplate`:95). Server-side pakai `getUserProfile` + cek. **Gate ini KRITIS** — `student_classes` RLS disabled, jadi cek akses di action = satu-satunya benteng.
   - Pakai `createClient()` (RLS-scoped) untuk admin & guru — insert `student_classes` boleh (RLS disabled). Untuk **membatasi scope** siswa/kelas yang boleh di-assign guru hierarkis: filter kandidat via `getTeacherAllowedClassIds` + `teacher_kelompok_access` (pola cabang teacher siswa/actions/classes/actions.ts:66) SEBELUM insert. Jangan andalkan RLS `student_classes` (tak ada).
3. UI (modal baru `AssignStudentsCrossKelompokModal` atau extend existing):
   - Target: `InputFilter` pilih **keluarga kelas** — untuk 18 master standar, list `class_master.name` biasa; untuk kelas custom, list **distinct `classes.name` yang mapping ke master "Lainnya"** di scope (bukan cuma "Lainnya" satu opsi — user pilih "CAI 2026" atau "Tahfidz" dst by nama). Kirim `classMasterId` + `className` (kalau custom) ke action.
   - Siswa: `MultiSelectCheckbox` semua siswa dalam scope daerah/desa (lintas kelompok), search + select-all. Tampilkan kelompok tiap siswa di label (biar jelas).
   - Submit → `assignStudentsToClassGroup`. Tampilkan hasil: X assigned, Y skipped (+alasan).
4. Navigasi: kalau bikin halaman/route baru, WAJIB update 3 tempat — `AppSidebar.tsx allNavItems[]`, `home/components/QuickActions.tsx quickActions[]`, `AppHeader.tsx getPageTitle()` (lihat memory [[new-page-checklist]]). Kalau cuma modal di `/users/siswa`, tak perlu.

## Files (representatif)

**Feature A:**
- `src/app/(admin)/kelas/actions/batch-standard/actions.ts` (+ logic.ts, queries.ts) — extend / action custom baru.
- `src/app/(admin)/kelas/components/BatchStandardKelasModal.tsx` — mode custom + "pilih semua kelompok".

**Feature B:**
- `src/app/(admin)/users/siswa/actions/students/actions.ts` — `assignStudentsToClassGroup` baru (dekat `assignStudentsToClass`:795).
- `src/app/(admin)/users/siswa/actions/classes/queries.ts` — `resolveClassInKelompok` helper.
- `src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx` (+ `stores/assignStudentsStore`) — generalisasi / modal baru.
- `src/lib/accessControl.ts` — `canBulkAssignCrossKelompok` helper (+ re-export via userUtils).

## TDD (WAJIB — business logic)

Per CLAUDE.md, ini business logic → tulis test dulu (RED→GREEN):
- `resolveClassInKelompok`: master+kelompok → class benar; kelompok tanpa kelas → null.
- `assignStudentsToClassGroup`: routing tiap siswa ke class di kelompoknya; siswa yang kelasnya belum ada → skipped; dupe → skipped; guard kelompok-match.
- `canBulkAssignCrossKelompok`: admin daerah/desa ✅, guru daerah/desa ✅, guru kelompok ❌ (kecuali flag), siswa ❌.
- Feature A `createBatchCustomClasses`: dedupe by name+master, skip existing.
- Ingat [[postgrest-select-not-typechecked]] — select string tak ter-cover type-check/unit → tambah E2E/smoke untuk resolver query.

## Verification (end-to-end)

1. `npm run dev`, login admin daerah.
2. Feature A: buat "CAI 2026" → pilih semua kelompok → submit. Cek DB: N baris `classes` name='CAI 2026', semua share 1 `class_master_id`.
   ```sql
   SELECT count(*) klas, count(DISTINCT cmm.class_master_id) masters
   FROM classes c JOIN class_master_mappings cmm ON cmm.class_id=c.id
   WHERE c.name='CAI 2026';  -- masters harus = 1
   ```
3. Feature B: buka assign lintas-kelompok → pilih "CAI 2026" → centang siswa dari ≥2 kelompok berbeda → submit. Cek tiap siswa masuk ke `student_classes` dgn `class_id` yg `kelompok_id`-nya = kelompok siswa:
   ```sql
   SELECT s.name, s.kelompok_id st_kel, c.kelompok_id cls_kel, c.name
   FROM student_classes sc JOIN students s ON s.id=sc.student_id
   JOIN classes c ON c.id=sc.class_id WHERE c.name='CAI 2026';
   -- st_kel HARUS = cls_kel untuk tiap baris
   ```
4. Cek `student_enrollments` ter-upsert (autoEnroll).
5. Login **guru daerah/desa terpilih** → pastikan bisa buka & assign; guru kelompok biasa → tak bisa.
6. Guru daerah yang di-grant subset kelompok (`teacher_kelompok_access`) → hanya lihat siswa/kelas di kelompok itu.

## Open questions (putuskan saat eksekusi)

- Feature B: siswa yang kelompoknya belum punya "CAI 2026" → **skip + laporkan** (default) atau auto-create kelasnya? (Rekomendasi: skip, suruh jalankan Feature A dulu — pisah tanggung jawab.)
- ~~Guru hierarkis insert `student_classes` via RLS?~~ **RESOLVED**: `student_classes` RLS disabled → insert bebas via `createClient`. Konsekuensi: guard akses + kelompok-match WAJIB di action.
- "Guru terpilih" = otomatis semua guru daerah/desa, atau butuh permission flag eksplisit `can_bulk_assign_cross_kelompok`? (Rekomendasi: hierarkis otomatis + flag opsional untuk guru kelompok tertentu.)
