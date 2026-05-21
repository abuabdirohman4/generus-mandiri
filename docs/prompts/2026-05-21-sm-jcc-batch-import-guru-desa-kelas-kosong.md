CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-21-sm-jcc-batch-import-guru-desa-kelas-kosong.md

ISSUE: sm-jcc / GH-#75
BRANCH: fix/sm-jcc-batch-import-guru-desa-kelas

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Jalankan type-check setelah selesai: npm run type-check
3. Output per task: "✅ Task N complete: [ringkasan]"
4. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-21-sm-jcc-batch-import-guru-desa-kelas-kosong.md
- Rules: @CLAUDE.md
- Architecture (Hierarchical Teacher Pattern): @docs/claude/architecture-patterns.md
- Task 2 target: @src/app/(admin)/users/siswa/components/batch-import/Step1Config.tsx
- Task 3 target: @src/app/(admin)/users/siswa/actions/students/actions.ts
- buildStudentHierarchy: @src/app/(admin)/users/siswa/actions/students/logic.ts
- Hook (classes source): @src/hooks/useClasses.ts

Mulai dari Task 2.
