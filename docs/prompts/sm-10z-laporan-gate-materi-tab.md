CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-10z-laporan-gate-materi-tab.md

ISSUE: sm-10z / GH-#53
BRANCH: feat/sm-10z-laporan-gate-materi-tab

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 2)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-10z-laporan-gate-materi-tab.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Laporan page: @src/app/(admin)/laporan/page.tsx
- Access control: @src/lib/accessControl.ts

Mulai dari Task 1.
