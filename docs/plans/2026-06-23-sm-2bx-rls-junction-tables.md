# Plan — sm-2bx — Enable RLS on Junction Tables (SECURITY)

**Issue:** sm-2bx · Enable RLS: teacher_classes, student_classes, report_template_classes
**GH:** #27 · blocked-by E2E guard sm-s0r (done)
**Type:** security (labeled P3 in roadmap but notes say "tetap P1" — real cross-org data leak)
**Date:** 2026-06-23

> ⚠️ JANGAN CLOSE sebelum E2E hijau setelah RLS ON. Lihat [[rls-junction-tables-deferred]].

---

## 1. Goal & danger

3 junction tables (`teacher_classes`, `student_classes`, `report_template_classes`) punya **RLS OFF, 0 policy**. `helpers.client.ts` query `teacher_classes` dari BROWSER pakai anon key → guru manapun (atau via DevTools/API langsung) bisa SELECT SELURUH junction lintas-org se-sistem. = kebocoran data lintas-organisasi nasional. Enable RLS + policy per-command yang meniru pola tabel `students`.

## 2. Kenapa BUKAN quick-win (dari notes investigasi 2026-06-06)

- **38 query** ke 3 tabel; mayoritas via `createClient()` (kena RLS). Enable RLS bisa **diam-diam patahkan** operasi existing (return `[]` bukan error).
- Policy naif "authenticated + admin only" = SALAH → blokir guru assign/lihat kelas. Harus per-command (SELECT/INSERT/UPDATE/DELETE), hierarki daerah/desa/kelompok, teacher-by-class, superadmin.
- **RLS nested**: policy `students` sendiri JOIN `student_classes` — RLS ketat di junction bisa ikut pecahkan policy students. Hati-hati.

## 3. URUTAN AMAN (wajib, dari notes)

1. **Petakan 38 query** ke 3 tabel (mana via guru vs admin, mana anon-key client vs server).
2. **Desain policy** tiru pola `students` (ambil dari migrations existing / `list_migrations`).
3. **Tulis E2E DULU** (`tests/e2e/rls-junction-tables.spec.ts`) — harus HIJAU saat RLS masih OFF (baseline). Verif 5 alur: teacher assign (guru page), student-class assign (siswa page), rapot templates, absensi/meetings, dashboard enrollment stats.
4. **Enable RLS + policy** via Supabase MCP `apply_migration`.
5. **E2E lagi** — harus TETAP hijau.
6. **Kalau patah → fix policy, JANGAN disable RLS.**

## 4. Tasks

### Task 1 — Audit 38 query
- `grep -rn "teacher_classes\|student_classes\|report_template_classes" src/` → tabel: file, client type (createClient vs createAdminClient vs browser client), operasi (SELECT/INSERT/DELETE), role konteks. Output ke plan/notes (markdown table).
- Identifikasi yang via BROWSER anon key (paling bahaya, mis. `helpers.client.ts`).

### Task 2 — Ambil pola policy `students`
- `mcp list_migrations` + cari migration RLS `students`. Catat struktur per-command policy (USING/WITH CHECK, fungsi hierarki: daerah/desa/kelompok, teacher-by-class, superadmin bypass).

### Task 3 — E2E baseline (RLS OFF)
- `tests/e2e/rls-junction-tables.spec.ts`: 5 alur kritis. Jalankan dgn RLS masih OFF → semua HIJAU (baseline regression guard). Pakai infra `tests/e2e/helpers/auth.ts` + data demo [TEST] org.
- ⚠️ Memory [[postgrest-select-not-typechecked]]: .select() string wajib divalidasi runtime via E2E.

### Task 4 — Migration enable RLS + policy
- Desain policy per tabel (3 tabel × per-command). `apply_migration` via MCP. Hati-hati nested students↔student_classes.

### Task 5 — E2E re-run + fix loop
- Jalankan E2E lagi. Setiap alur yang patah (return [] / permission denied) → revisi policy (jangan disable RLS). Ulang sampai hijau.
- Manual spot-check: guru A login → tidak bisa SELECT teacher_classes guru B (via app + via direct API kalau bisa).

### Task 6 — Verify + advisors
- `mcp get_advisors` (security) → konfirmasi 3 tabel tak lagi flagged "RLS disabled".
- `npm run test:e2e` (subset) hijau. type-check 0.

## 5. Out of scope
- RLS tabel lain (hanya 3 junction ini).
- Refactor query (hanya tambah policy; ubah query hanya jika RLS memaksa).

## 6. CLAUDE.md Check
- [ ] Update [[rls-junction-tables-deferred]] memory → resolved setelah hijau.
- [ ] Note pola policy junction di `docs/claude/database-operations.md` (reusable untuk junction lain).
- [ ] Security section CLAUDE.md: konfirmasi "RLS defense in depth" kini berlaku ke junction.

## 7. Commit message
```
fix(security): enable RLS on teacher_classes/student_classes/report_template_classes (fixes #27)

Add per-command RLS policies (hierarchy daerah/desa/kelompok + teacher-by-class
+ superadmin) mirroring students table. Closes cross-org data leak via browser
anon key. E2E regression guard verifies 5 critical flows stay green post-RLS.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
