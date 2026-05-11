CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-11-sm-527-archive-permission-multi-kelompok.md

ISSUE: sm-527 / GH-#68
STATUS: Bug fix — archive permission guru multi-kelompok + back navigation tab

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 2)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-11-sm-527-archive-permission-multi-kelompok.md
- Rules: @CLAUDE.md
- Fix target: @src/lib/accessControl.ts (canTeacherAccessStudent, line 48-65)
- Existing tests (baca dulu): @src/lib/__tests__/accessControl.test.ts
- Existing permissions tests: @src/app/(admin)/users/siswa/actions/students/__tests__/permissions.test.ts
- Tab header fix: @src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx (line 45)
- Type reference: @src/types/student.ts (StudentWithOrg, StudentWithClasses)

Mulai dari Task 1.
