CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-29-sm-1jj-bulk-edit-teacher-permissions.md

ISSUE: sm-1jj / GH-#81
BRANCH: feat/sm-1jj-bulk-edit-teacher-permissions

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 8)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (terutama Task 2 & 3)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-29-sm-1jj-bulk-edit-teacher-permissions.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Store pattern: @src/app/(admin)/users/guru/stores/guruStore.ts
- Existing settings actions: @src/app/(admin)/users/guru/actions/settings/actions.ts
- Existing queries: @src/app/(admin)/users/guru/actions/settings/queries.ts
- Existing logic: @src/app/(admin)/users/guru/actions/settings/logic.ts
- GuruTable: @src/app/(admin)/users/guru/components/GuruTable.tsx
- useGuruPage: @src/app/(admin)/users/guru/hooks/useGuruPage.ts
- Page: @src/app/(admin)/users/guru/page.tsx

Mulai dari Task 1.
