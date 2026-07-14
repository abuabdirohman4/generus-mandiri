CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-08-sm-e67-bug-filter-layout-guru-desa.md

ISSUE: sm-e67 / GH-#66
BRANCH: fix/sm-e67-filter-layout-guru-desa

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Tidak ada TDD untuk bug UI/layout, tapi test manual harus diverifikasi
3. Untuk fix `accessControl.ts`: pastikan fungsi `isTeacherDesa`/`isTeacherDaerah` sudah ada sebelum menambahkannya
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-08-sm-e67-bug-filter-layout-guru-desa.md
- Rules: @CLAUDE.md
- DataFilter: @src/components/shared/DataFilter.tsx
- accessControl: @src/lib/accessControl.ts
- Page: @src/app/(admin)/presensi/[meetingId]/page.tsx

Mulai dari Task 1.
