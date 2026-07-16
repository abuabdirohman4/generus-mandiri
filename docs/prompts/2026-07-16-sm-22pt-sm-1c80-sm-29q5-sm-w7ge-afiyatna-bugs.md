CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-16-sm-22pt-sm-1c80-sm-29q5-sm-w7ge-afiyatna-bugs.md

ISSUES: sm-22pt / sm-1c80 / sm-29q5 / sm-w7ge — GH-#142
BRANCH: fix/sm-22pt-sm-1c80-afiyatna-bugs

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Mulai dari Task 1 (sm-22pt) — paling simpel
3. Lanjut Task 2 (sm-1c80) — 3 files
4. Task 3 (sm-29q5) — investigasi dulu via grep, baru implement
5. Task 4 (sm-w7ge) — SKIP, belum ada info cukup dari user
6. Setelah semua task: npm run type-check
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-16-sm-22pt-sm-1c80-sm-29q5-sm-w7ge-afiyatna-bugs.md
- Rules: @CLAUDE.md
- Students queries: @src/app/(admin)/users/siswa/actions/students/queries.ts
- Students types: @src/types/student.ts
- StudentsTable: @src/app/(admin)/users/siswa/components/StudentsTable.tsx
- OverviewTab: @src/app/(admin)/laporan/components/OverviewTab.tsx
- Dashboard types: @src/types/dashboard.ts

Mulai dari Task 1 (sm-22pt).
