CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-n0r-dashboard-materi-widget.md

ISSUE: sm-n0r / GH-#55
BRANCH: feat/sm-n0r-dashboard-materi-widget

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3 → 4)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-n0r-dashboard-materi-widget.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Dashboard page: @src/app/(admin)/dashboard/page.tsx
- Access control server: @src/lib/accessControlServer.ts
- AcademicYearSelector: @src/components/shared/AcademicYearSelector.tsx

Mulai dari Task 1.
