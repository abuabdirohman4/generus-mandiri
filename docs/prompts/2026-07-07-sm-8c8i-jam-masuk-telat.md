CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-07-sm-8c8i-jam-masuk-telat.md

ISSUE: sm-8c8i / GH-#124
BRANCH: feat/sm-8c8i-jam-masuk-telat

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 sampai Task 10)
2. Terapkan TDD ketat untuk Task 2 (isLate): RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Migration (Task DB Schema Changes) dijalankan via mcp__generus-mandiri-v2__apply_migration — pastikan MCP Supabase terkoneksi sebelum mulai
9. check_in_time WAJIB di-stamp server-side (new Date().toISOString()), JANGAN terima dari client — cegah clock-skew/spoofing
10. Cek dulu apakah ada test file existing untuk logic.ts dan useAttendanceRealtime.logic sebelum bikin file baru

REFERENCE FILES:
- Plan: @docs/plans/2026-07-07-sm-8c8i-jam-masuk-telat.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Types: @src/types/attendance.ts, @src/types/meeting.ts
- Attendance logic: @src/app/(admin)/presensi/actions/attendance/logic.ts
- Attendance queries: @src/app/(admin)/presensi/actions/attendance/queries.ts
- Attendance actions: @src/app/(admin)/presensi/actions/attendance/actions.ts
- Meeting queries: @src/app/(admin)/presensi/actions/meetings/queries.ts
- Realtime logic: @src/hooks/useAttendanceRealtime.logic.ts
- useMeetingAttendance: @src/app/(admin)/presensi/hooks/useMeetingAttendance.ts
- CreateMeetingModal: @src/app/(admin)/presensi/components/CreateMeetingModal.tsx
- AttendanceTable: @src/app/(admin)/presensi/components/AttendanceTable.tsx
- LivePresensiTab: @src/app/(admin)/presensi/components/LivePresensiTab.tsx
- Meeting detail page: @src/app/(admin)/presensi/[meetingId]/page.tsx

Mulai dari Task 1.
