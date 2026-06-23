CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-8nvh-null-guard-student-snapshot.md

ISSUE: sm-8nvh / GH-#114
BRANCH: fix/sm-8nvh-null-guard-student-snapshot

REQUIREMENTS:
1. Ikuti plan Task 1 → Task 3
2. Bug fix = RED dulu: tulis test reproduksi (meeting student_snapshot=null → harus tidak throw), lalu fix (GREEN). Extract iterasi ke pure helper kalau forEach masih di action.
3. Grep dulu `student_snapshot` di seluruh src/app/(admin)/presensi/actions/ — line di deskripsi (1028) mungkin sudah bergeser pasca refactor 3-layer. Guard SEMUA akses (.forEach/.map/.length).
4. npm run test:run PASS; npm run type-check 0.
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-8nvh-null-guard-student-snapshot.md
- Rules: @CLAUDE.md
- Target: @src/app/(admin)/presensi/actions/ (grep student_snapshot)
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1.
