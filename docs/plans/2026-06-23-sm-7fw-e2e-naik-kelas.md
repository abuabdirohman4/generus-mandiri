# Plan — sm-7fw — E2E Naik Kelas (Grade Promotion)

**Issue:** sm-7fw · test: E2E naik kelas
**Depends:** sm-jsb (done)
**Type:** test (P3)
**Date:** 2026-06-23

---

## 1. Goal

E2E Playwright untuk fitur naik kelas (sm-jsb). Regression guard untuk wizard + toggle + permission + scope + execute.

## 2. Infra siap (dari issue)

- Data demo SIAP & aman dimutate: org **[TEST]** Daerah/Desa/Kelompok Test (8 siswa dummy, 2 kelas), 6 akun test per role (`.env.test`).
- Helpers: `tests/e2e/helpers/auth.ts` (`loginAsSuperadmin`/`loginAsAdminDaerah`/dll).
- Pola referensi: `tests/e2e/student-enrollment.spec.ts` + `permissions.spec.ts`.
- 📖 `tests/QUICK_START.md` + `tests/MULTI_ROLE_TESTING.md`.

## 3. Skenario (7, dari issue)

1. **Toggle**: ON → menu Naik Kelas muncul di sidebar + quickactions; OFF → `/naik-kelas` redirect `/home`.
2. **Permission**: admin desa/kelompok/guru TIDAK bisa toggle; hanya superadmin / admin daerah.
3. **Dropdown tahun ajaran**: hanya muncul untuk superadmin / admin daerah (role-gated).
4. **Wizard**: multi-select + "Pilih Semua" + filter DataFilter + search nama.
5. **Scope isolation**: guru biasa cuma lihat kelasnya.
6. **Execute** di kelompok [TEST] → cek `student_enrollments.academic_year_id` = tahun TERPILIH (BUKAN active), `students.class_id` update, `grade_promotion_logs` terisi.
7. **Stopper** (Pra Nikah 4 / Orang Tua / Pengurus) TIDAK muncul.

## 4. Constraint kritis

- ⚠️ **Tahun aktif sistem TIDAK boleh berubah** — execute pakai tahun terpilih, verify active tetap.
- **Cleanup**: revert `students.class_id` setelah test (enrollment upsert idempotent; `grade_promotion_logs` immutable, numpuk OK).
- [[postgrest-select-not-typechecked]]: `.select()` string wajib divalidasi runtime via E2E — ini salah satu nilai utama test ini.

## 5. Tasks

### Task 1 — Setup spec + helpers
- `tests/e2e/naik-kelas.spec.ts`. Import auth helpers. Konfirmasi toggle helper (set `grade_promotion_enabled` ON/OFF) ada / buat util setup.
- Baca `tests/MULTI_ROLE_TESTING.md` untuk pola multi-role.

### Task 2 — Skenario 1-3 (toggle, permission, dropdown)
- Toggle ON/OFF → sidebar/quickactions visibility + redirect.
- Per-role: hanya superadmin/admin daerah bisa toggle + lihat dropdown tahun.

### Task 3 — Skenario 4-5 (wizard + scope)
- Wizard interaksi: multi-select, Pilih Semua, DataFilter, search.
- Guru biasa: cuma kelasnya.

### Task 4 — Skenario 6-7 (execute + stopper)
- Execute di [TEST] kelompok → assert DB: `student_enrollments.academic_year_id` = terpilih, `students.class_id` update, `grade_promotion_logs` terisi, active year UNCHANGED.
- Stopper tak muncul di options.
- Cleanup: revert class_id.

### Task 5 — Verify
- `npm run test:e2e -- naik-kelas` hijau. Pastikan tak flaky (lihat [[e2e-flaky-tests]] — jangan tambah flaky baru).
- Active year tetap setelah full run.

## 6. Out of scope
- E2E pending naik kelas (sm-ejs) — issue terpisah.
- Unit test (sudah ada di sm-jsb).

## 7. CLAUDE.md Check
- [ ] Tambah skenario ke `docs/claude/e2e-testing-patterns.md` kalau ada pola baru (DB-assert + cleanup idempotent).
- [ ] Tidak ada perubahan kode app (test-only).

## 8. Commit message
```
test(naik-kelas): E2E Playwright for grade promotion (fixes #XX)

Cover 7 scenarios: toggle gating, role permission, year dropdown gating,
wizard multi-select/filter/search, scope isolation, execute (DB asserts:
enrollment year = selected not active, class_id update, logs), stopper hidden.
Idempotent cleanup; active year preserved.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
