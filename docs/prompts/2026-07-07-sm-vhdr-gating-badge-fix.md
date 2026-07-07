CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-07-sm-vhdr-gating-badge-fix.md

ISSUE: sm-vhdr / GH-#125 (follow-up dari sm-8c8i / GH-#124)
BRANCH: fix/sm-vhdr-gating-badge-fix

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 sampai Task 5)
2. TDD untuk Task 1 (backfill bug fix): tulis test dulu, verify FAIL dengan kode lama, baru fix
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Task 2 (permission gating) ikuti pola EXACT dari canManageMaterials di src/lib/accessControl.ts — jangan bikin pola baru
9. Task 3-4 murni UI presentational (LivePresensiTab.tsx) — TDD boleh skip per CLAUDE.md, tapi verify manual di dev server

REFERENCE FILES:
- Plan: @docs/plans/2026-07-07-sm-vhdr-gating-badge-fix.md
- Rules: @CLAUDE.md
- Attendance actions: @src/app/(admin)/presensi/actions/attendance/actions.ts
- Access control (pola permission existing): @src/lib/accessControl.ts
- User types: @src/types/user.ts
- SettingsModal (UI checkbox existing): @src/app/(admin)/users/guru/components/SettingsModal.tsx
- Teacher settings actions: @src/app/(admin)/users/guru/actions/settings/actions.ts
- CreateMeetingModal: @src/app/(admin)/presensi/components/CreateMeetingModal.tsx
- LivePresensiTab: @src/app/(admin)/presensi/components/LivePresensiTab.tsx

Mulai dari Task 1.
