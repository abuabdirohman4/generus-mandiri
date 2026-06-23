CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-7fw-e2e-naik-kelas.md

ISSUE: sm-7fw / GH-#117
BRANCH: test/sm-7fw-e2e-naik-kelas

REQUIREMENTS:
1. Ikuti plan Task 1 → Task 5 (7 skenario)
2. Pakai infra existing: tests/e2e/helpers/auth.ts (loginAsSuperadmin/loginAsAdminDaerah/dll), data demo [TEST] org, .env.test. Pola dari student-enrollment.spec.ts + permissions.spec.ts.
3. CRITICAL: tahun aktif sistem TIDAK boleh berubah — execute pakai tahun terpilih, verify active tetap.
4. Cleanup: revert students.class_id setelah test (enrollment upsert idempotent; grade_promotion_logs immutable numpuk OK).
5. .select() string wajib divalidasi runtime via E2E (memory postgrest-select-not-typechecked) — ini nilai utama test ini.
6. Jangan tambah flaky baru (lihat memory e2e-flaky-tests). Pakai web-first assertions, hindari hard wait.
7. DB asserts skenario 6: student_enrollments.academic_year_id = TERPILIH (bukan active), students.class_id update, grade_promotion_logs terisi.
8. npm run test:e2e -- naik-kelas hijau. type-check 0.
9. Output per task: "✅ Task N complete: [ringkasan]"
10. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-7fw-e2e-naik-kelas.md
- Rules: @CLAUDE.md
- E2E quick start: @tests/QUICK_START.md
- Multi-role: @tests/MULTI_ROLE_TESTING.md
- E2E patterns: @docs/claude/e2e-testing-patterns.md
- Auth helpers: @tests/e2e/helpers/auth.ts
- Ref specs: @tests/e2e/student-enrollment.spec.ts, @tests/e2e/permissions.spec.ts
- Feature: @src/app/(admin)/naik-kelas/

Mulai dari Task 1.
