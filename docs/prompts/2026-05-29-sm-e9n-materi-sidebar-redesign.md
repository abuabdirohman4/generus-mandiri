CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-29-sm-e9n-materi-sidebar-redesign.md

ISSUE: sm-e9n / GH-#79
BRANCH: feat/sm-e9n-materi-sidebar-redesign

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 7)
2. TDD hanya untuk logic murni — plan sudah menandai task mana yang SKIP TDD (semua task ini)
3. Jalankan `npm run type-check` setelah setiap task
4. Jangan lanjut jika ada TypeScript error
5. Setelah semua task: `npm run build`
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-29-sm-e9n-materi-sidebar-redesign.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md (khususnya section Material Management Permissions)
- Store: @src/app/(admin)/materi/stores/materiStore.ts
- Sidebar: @src/app/(admin)/materi/components/layout/MateriSidebar.tsx
- Page Client: @src/app/(admin)/materi/components/layout/MaterialsPageClient.tsx
- Content View: @src/app/(admin)/materi/components/views/MateriContentView.tsx
- Monitoring pattern (grouped tables): @src/app/(admin)/monitoring/page.tsx lines 1120-1200
- Access control: @src/lib/accessControl.ts (canManageMaterials function)

KEY CONTEXT:
- `canManageMaterials(profile)` returns true for superadmin/admin OR teacher with permissions.can_manage_materials=true
- `viewMode` in store: 'by_material' | 'by_class' — keep for backward compat, but `activeTab` is new source of truth
- MateriTable component already accepts showClassColumn/showSemesterColumn/showMonthColumn props
- Monitoring page groups materials by `material.material_type?.name` — use same pattern but group by typeId with type object
- Class sort order: always use `class_master.sort_order` (classes prop from parent is already sorted)

PERHATIAN:
- File MateriSidebar.tsx saat ini masih memiliki kode lama (by_class semester tree, expandedClasses, expandedSemesters, dll) — Task 3 akan menghapus semua ini
- Jangan hapus CRUD modal code di sidebar (CategoryModal, TypeModal, ConfirmModal, edit/delete handlers) — ini tetap dibutuhkan untuk tab Kategori
- Task 4 membuat file BARU: src/app/(admin)/materi/components/views/MateriKelasView.tsx

Mulai dari Task 1.
