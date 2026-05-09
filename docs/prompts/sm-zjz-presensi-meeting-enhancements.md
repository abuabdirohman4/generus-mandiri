CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-08-sm-zjz-presensi-meeting-enhancements.md

ISSUE: sm-zjz / GH-#67
BRANCH: feat/sm-zjz-presensi-meeting-enhancements

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 8)
2. Task 1, 4, 7 bisa dikerjakan paralel; Task 2 setelah 1; Task 5-6 setelah 2; Task 8 setelah semua
3. Tidak perlu TDD untuk perubahan UI/JSX, tapi logic di useMemo harus benar
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-08-sm-zjz-presensi-meeting-enhancements.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Queries: @src/app/(admin)/presensi/actions/attendance/queries.ts
- Hook: @src/app/(admin)/presensi/hooks/useMeetingAttendance.ts
- Actions: @src/app/(admin)/presensi/actions/attendance/actions.ts
- Table: @src/app/(admin)/presensi/components/AttendanceTable.tsx
- Page: @src/app/(admin)/presensi/[meetingId]/page.tsx
- ColumnToggle ref: @src/components/table/ColumnToggle.tsx
- Store ref: @src/app/(admin)/materi/stores/materiStore.ts

Mulai dari Task 1.
