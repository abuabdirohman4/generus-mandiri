CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-2bx-rls-junction-tables.md

ISSUE: sm-2bx / GH-#27
BRANCH: fix/sm-2bx-rls-junction-tables

⚠️ SECURITY — cross-org data leak nyata. JANGAN close sebelum E2E hijau setelah RLS ON.

REQUIREMENTS:
1. Ikuti URUTAN AMAN persis: (Task 1) audit 38 query → (Task 2) tiru pola policy students → (Task 3) tulis E2E DULU & hijau saat RLS masih OFF → (Task 4) enable RLS+policy via MCP apply_migration → (Task 5) E2E lagi, kalau patah FIX POLICY jangan disable RLS → (Task 6) get_advisors.
2. Policy WAJIB per-command (SELECT/INSERT/UPDATE/DELETE) + hierarki daerah/desa/kelompok + teacher-by-class + superadmin. JANGAN policy naif "authenticated+admin only" (bakal blokir guru).
3. Hati-hati RLS nested: policy students JOIN student_classes — RLS ketat di junction bisa pecahkan policy students. Test alur dashboard/students setelah enable.
4. E2E verif 5 alur: teacher assign, student-class assign, rapot templates, absensi/meetings, dashboard enrollment stats. Pakai infra tests/e2e/helpers/auth.ts + data [TEST].
5. .select() string wajib divalidasi runtime via E2E (memory postgrest-select-not-typechecked).
6. Cek MCP Supabase terkoneksi dulu (list_tables) sebelum migration.
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user. JANGAN close issue.

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-2bx-rls-junction-tables.md
- Rules: @CLAUDE.md
- DB ops + RLS: @docs/claude/database-operations.md
- E2E patterns: @docs/claude/e2e-testing-patterns.md
- E2E auth helpers: @tests/e2e/helpers/auth.ts
- E2E ref: @tests/e2e/permissions.spec.ts, @tests/e2e/student-enrollment.spec.ts
- Client junction query (paling bahaya): grep helpers.client.ts teacher_classes

Mulai dari Task 1 — audit 38 query dulu, JANGAN langsung enable RLS.
