CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-1jj-bulk-edit-teacher-permissions.md

ISSUE: sm-1jj / GH-#81
BRANCH: feat/sm-1jj-bulk-edit-teacher-permissions

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 8)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR untuk logic/queries/action; skip untuk UI presentasional murni
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. CRITICAL: permission JSONB SELALU fetch-then-merge — JANGAN overwrite. Reuse updateTeacherPermissionsQuery / updateTeacherMaterialPermissionsQuery yang sudah ada (lihat architecture-patterns.md §JSONB Merge sm-97n).
6. Tri-state per flag (No change / Grant / Revoke) — bukan checkbox biner, supaya tidak revoke flag yang tidak disentuh.
7. Row-selection ditambahkan ke shared Table.tsx sebagai prop OPT-IN (default off) — JANGAN merusak tabel lain.
8. Pakai komponen form existing (Checkbox, MultiSelectCheckbox, Button) — JANGAN raw <input>/<select>/<button>.
9. Partial success, no rollback — kumpulkan failed[] dan tampilkan di toast.
10. Setelah semua task: npm run type-check (0 errors)
11. Output per task: "✅ Task N complete: [ringkasan]"
12. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-1jj-bulk-edit-teacher-permissions.md
- Rules: @CLAUDE.md
- JSONB merge pattern: @docs/claude/architecture-patterns.md (§Material Management Permissions)
- Permission UI reference: @src/app/(admin)/users/guru/components/SettingsModal.tsx
- Merge queries (reuse): @src/app/(admin)/users/guru/actions/settings/queries.ts
- Settings actions: @src/app/(admin)/users/guru/actions/settings/actions.ts
- Shared Table: @src/components/table/Table.tsx
- GuruTable: @src/app/(admin)/users/guru/components/GuruTable.tsx
- useGuruPage hook: @src/app/(admin)/users/guru/hooks/useGuruPage.ts
- Guru page wiring: @src/app/(admin)/users/guru/page.tsx
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1.
