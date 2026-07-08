# Prompt: sm-4wwo — Bulk-assign siswa lintas kelompok + fix authorization

**Baca dulu plan lengkap:** `docs/plans/2026-07-08-sm-4wwo-bulk-assign-siswa-lintas-kelompok.md`
**Issue:** sm-4wwo (P1) · GH #129
**Workflow proyek:** ikuti TDD wajib (RED→GREEN→REFACTOR) — lihat `docs/claude/testing-guidelines.md`. Ini business logic + security, TDD non-negotiable.

## Ringkasan tugas

Dua hal digabung jadi satu PR:

1. **Fitur baru**: admin daerah/desa + guru terpilih bisa bulk-assign banyak siswa lintas kelompok ke "keluarga kelas" yang sama (mis. "CAI 2026") — tiap siswa otomatis masuk ke kelas itu di kelompoknya sendiri.
2. **Fix keamanan P1** (wajib, jangan skip): `assignStudentsToClass` dan `createStudent` di `src/app/(admin)/users/siswa/actions/students/actions.ts` saat ini **tanpa authorization backend sama sekali**. Tabel `student_classes` RLS-nya disabled (0 policy) — jadi backend adalah satu-satunya benteng, tidak ada RLS sebagai fallback.

## Urutan kerja yang disarankan

1. Fix keamanan dulu (item 4 di plan) — sebelum menambah fitur baru yang bisa memperlebar exposure.
2. Helper `canBulkAssignCrossKelompok` (item 1).
3. Resolver `resolveClassInKelompok` (item 2) — TDD dulu, ini logic routing kritis (kelas standar vs custom "Lainnya" beda cara resolve).
4. Action `assignStudentsToClassGroup` (item 3) — TDD dulu.
5. UI: toggle permission di halaman guru (item 5, SettingsModal) → gate tombol Assign di siswa page.tsx → generalisasi AssignStudentsModal.

## Detail lengkap tiap langkah

Lihat section "Perubahan" (1-5) di plan file — sudah berisi signature function, file target, dan alasan tiap keputusan. Jangan improvisasi keputusan yang sudah difinalkan user (lihat section "Keputusan user" di plan):
- Akses: admin daerah/desa otomatis + guru daerah/desa otomatis + flag `can_bulk_assign_cross_kelompok` untuk guru lain yang di-grant.
- Kelas belum ada di kelompok siswa → **skip + laporkan**, JANGAN auto-create.
- Fix authorization WAJIB bareng PR ini, bukan ditunda.

## Constraint teknis penting (jangan dilanggar)

- **Two-query pattern wajib** untuk semua query hierarki organisasi (daerah→desa→kelompok). JANGAN nested PostgREST join — silently fails tanpa error (lihat CLAUDE.md, dicontohkan di `accessControlServer.ts:170` & `getAllClasses`/`fetchClassesHierarchical`).
- Routing kelas custom (master "Lainnya") WAJIB kombinasi `class_master_id = Lainnya AND name ILIKE className` — jangan cuma `class_master_id`, karena semua kelas custom (CAI 2026, Tahfidz, dst) share master yang sama.
- `student_classes` RLS disabled — JANGAN asumsikan RLS akan menolak akses ilegal. Guard harus eksplisit di server action.
- Server Actions WAJIB return `{ success, data, message }` — lihat `docs/claude/server-actions-conventions.md`.
- Semua domain type baru masuk `src/types/` (Base→Extended→Full pattern) — lihat `src/types/README.md`.

## Reuse (jangan bikin ulang)

- `getTeacherAllowedClassIds`, `getDataFilter`, `canAccessFeature` — `src/lib/accessControlServer.ts`.
- Pola permission flag guru: `profile.permissions?.can_X === true`, lihat `canMultiKelompokLaporan` (`src/lib/accessControl.ts:139`) sebagai template persis untuk `canBulkAssignCrossKelompok`.
- `updateTeacherPermissions` (fetch-then-merge JSONB) — `src/app/(admin)/users/guru/actions/settings/queries.ts:51` — reuse untuk simpan flag baru, jangan bikin action baru.
- `autoEnrollStudent` — `src/app/(admin)/users/siswa/actions/students/actions.ts:62`.
- `MultiSelectCheckbox`, `InputFilter`, `DataFilter` — komponen form existing, JANGAN raw HTML.

## Verification

Ikuti section "Verification (end-to-end)" di plan — termasuk skenario security (role tanpa akses harus ditolak, 0 insert) dan skenario skip (kelas belum ada → tidak auto-kebuat). Pre-warm route via curl sebelum Playwright E2E (dev server cold-compile bisa 30-40 detik, lihat CLAUDE.md "Tool Environment Quirks").

## Definition of done

- [ ] Semua unit test di section TDD plan GREEN.
- [ ] `npm run type-check` bersih.
- [ ] Fix authorization: role tanpa akses ditolak baik di `assignStudentsToClass` (existing) maupun `assignStudentsToClassGroup` (baru).
- [ ] `createStudent` punya scope-guard konsisten semua level admin + guru (bukan cuma admin_desa seperti sekarang).
- [ ] E2E: admin daerah bulk-assign lintas kelompok berhasil, guru dengan flag ON bisa akses, guru tanpa flag tombol tidak muncul.
- [ ] Tidak ada kelas ke-auto-create saat assign (skip + laporkan saja).

---

## Round 2: Fix hasil code review (2026-07-08)

Implementasi pertama sudah jalan (fitur + toggle guru + resolver "Lainnya"), tapi code review (`/code-review high`) nemu 2 lubang security CONFIRMED yang wajib ditambal + 4 issue lain. Urutan prioritas:

### WAJIB — security (P1, jangan skip)

**1. `assignStudentsToClass` (single-class path) tidak validasi scope siswa**
File: `src/app/(admin)/users/siswa/actions/students/actions.ts:803`
Auth check yang ada cuma verifikasi `classId` ada dalam scope caller (`fetchClassesHierarchical` + `getTeacherAllowedClassIds`). `studentIds` array TIDAK PERNAH divalidasi ada dalam scope yang sama. Karena `student_classes` RLS disabled, ini artinya caller bisa assign siswa manapun (termasuk dari kelompok lain) ke kelas miliknya sendiri — cross-kelompok data injection.
**Fix**: tambahkan validasi scope siswa yang sama seperti di `assignStudentsToClassGroup` (loop per siswa, cek `kelompok_id` siswa ada dalam hierarki caller) SEBELUM insert. Reuse logic yang sama, jangan duplikat — pertimbangkan extract jadi helper bersama dipakai kedua action.

**2. `buildStudentHierarchy` default-ALLOW, seharusnya default-DENY**
File: `src/app/(admin)/users/siswa/actions/students/logic.ts:185`
Dua celah di fungsi yang sama:
- (a) Kalau `userProfile.kelompok_id`, `desa_id`, `daerah_id` semua null/undefined untuk non-superadmin → tidak ada branch if/else-if yang fire → tidak throw → siswa dianggap allowed.
- (b) Kalau `kelompokData` null (query kelompok gagal — transient error, RLS, atau row terhapus) → seluruh blok `if (kelompokId && kelompokData)` di-skip (karena `kelompokData` falsy) → jatuh ke `return` di akhir fungsi TANPA throw → siswa dianggap allowed.
Kedua kasus ini reachable dari `assignStudentsToClassGroup` (dipanggil dalam loop per siswa) dan `createStudent`/`createStudentsBatch`.
**Fix**: ubah default jadi DENY — kalau `kelompokId` ada tapi `kelompokData` null → throw eksplisit (bukan `guard-then-skip`). Kalau non-superadmin tidak match branch scope manapun (semua id null) → throw eksplisit, jangan biarkan jatuh ke `return` sukses.

**3. Empty `catch(e) {}` di loop scope-check menelan error infra sebagai "ditolak akses"**
File: `src/app/(admin)/users/siswa/actions/students/actions.ts:918` (dalam `assignStudentsToClassGroup`)
Loop yang manggil `buildStudentHierarchy` dibungkus `try { ... } catch(e) { /* Not allowed */ }` — ini menyamakan error DB genuine (network timeout, dll) dengan penolakan akses yang sah. Siswa yang harusnya lolos jadi ter-skip dengan alasan menyesatkan "di luar cakupan akses Anda", padahal errornya infra.
**Fix**: bedakan error dari `buildStudentHierarchy` (memang out-of-scope, expected) vs error dari query Supabase sebelumnya (infra, unexpected) — misal cek `studentsError`/`kelompokError` eksplisit dulu sebelum panggil `buildStudentHierarchy`, baru catch khusus untuk hasil `buildStudentHierarchy`.

### PENTING — correctness

**4. Resolver "Lainnya" bisa salah masuk ke kelas STANDAR yang kebetulan senama**
File: `src/app/(admin)/users/siswa/actions/classes/queries.ts:134`
Branch `classMasterId === 'Lainnya'` resolve kelas cuma pakai `eq(kelompok_id).ilike(name)` — TANPA cek `class_master_mappings`. Kalau user ketik nama yang kebetulan sama dengan kelas standar existing (mis. "Paud"), siswa ter-assign ke kelas standar itu, bukan kelas custom.
**Fix**: tambah filter — kelas yang di-resolve harus benar-benar mapped ke master "Lainnya" (join `class_master_mappings` di branch ini juga, bukan cuma di branch generic).

### PERLU DIPUTUSKAN — gap fungsional

**5. UI cross-kelompok cuma support kelas custom, tidak support kelas standar**
File: `src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx:165`
`assignStudentsToClassGroup` selalu dipanggil dengan `classMasterId` literal `'Lainnya'` — tidak ada jalur UI untuk assign lintas-kelompok ke keluarga kelas STANDAR (mis. semua "Kelas 1" di banyak kelompok sekaligus, by class_master_id asli). Plan awal minta dua-duanya.
**Putuskan**: apakah ini scope v1 yang disengaja (custom-only cukup untuk sekarang), atau perlu ditambah dropdown pilih master standar juga? Kalau tidak sempat, minimal catat sebagai known limitation di PR description — jangan diam-diam skip.

### MINOR — boleh nyusul kalau waktu terbatas

**6. `.limit(1)` tanpa `ORDER BY` di `resolveClassInKelompok`** (`queries.ts:142`) — kalau 1 kelompok punya 2+ kelas senama, hasil non-deterministik. Tambah `order('created_at')` atau sejenis biar konsisten.
**7. N+1 query di `assignStudentsToClassGroup`** (`actions.ts:890`) — loop per siswa lakukan query kelompok + resolve + insert + autoEnroll terpisah. Untuk bulk besar (100+ siswa) ini lambat. Bisa dioptimasi: group siswa per kelompok dulu, resolve kelas sekali per kelompok, baru insert batch — tapi jangan korbankan correctness (temuan #1-3) demi ini.
**8. Dynamic `import()` di dalam action** (`actions.ts:823` dst) — pindah ke static import di top file kalau tidak ada alasan khusus (circular dependency dll).

## Definition of done (round 2)

- [ ] Temuan #1, #2, #3 fixed + ada test yang membuktikan fix-nya (RED sebelum fix, GREEN sesudah).
- [ ] Temuan #4 fixed.
- [ ] Temuan #5 diputuskan (fix atau didokumentasikan sebagai limitation).
- [ ] `npm run type-check` bersih.
- [ ] Re-run semua test existing, pastikan tidak ada regresi.
