CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-05-sm-97n-multi-kelompok-laporan-permission.md

ISSUE: sm-97n / GH-#83
BRANCH: feat/sm-97n-multi-kelompok-laporan-permission

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 4)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

PENTING — Task 2 (fix updateTeacherPermissionsQuery):
- updateTeacherPermissionsQuery di queries.ts saat ini overwrite seluruh JSONB permissions
- HARUS diubah ke fetch-then-merge pattern sebelum menambah field baru
- Reference pattern: updateTeacherMaterialPermissionsQuery di file yang sama

REFERENCE FILES:
- Plan: @docs/plans/2026-06-05-sm-97n-multi-kelompok-laporan-permission.md
- Rules: @CLAUDE.md
- Types: @src/types/user.ts
- UserUtils: @src/lib/userUtils.ts
- SettingsModal: @src/app/(admin)/users/guru/components/SettingsModal.tsx
- Settings queries: @src/app/(admin)/users/guru/actions/settings/queries.ts
- DataFilter: @src/components/shared/DataFilter.tsx
- OverviewTab: @src/app/(admin)/laporan/components/OverviewTab.tsx

Mulai dari Task 1.
