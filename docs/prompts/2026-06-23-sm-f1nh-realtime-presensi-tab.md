CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-f1nh-realtime-presensi-tab.md

ISSUE: sm-f1nh / GH-#115
BRANCH: feat/sm-f1nh-realtime-presensi-tab

REQUIREMENTS:
1. Ikuti plan Task 1 → Task 5
2. TDD untuk merge logic (applyAttendanceEvent); skip untuk hook/UI presentasional
3. Enable realtime publication attendance_logs via MCP apply_migration (cek dulu belum ada). Verify RLS SELECT scope. Cek MCP terkoneksi (list_tables) dulu.
4. CRITICAL: hook reusable BARU useAttendanceRealtime follow pola usePresence.ts (centralized, cleanup-safe). JANGAN bikin Supabase channel ad-hoc di komponen (lihat CLAUDE.md: NEVER create channel directly).
5. Tab Live read-only, big layout untuk infocus. Pakai komponen existing.
6. npm run test:run PASS; npm run type-check 0.
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-f1nh-realtime-presensi-tab.md
- Rules: @CLAUDE.md
- Realtime pattern: @src/hooks/usePresence.ts, @src/stores/usePresenceStore.ts
- Realtime doc: @docs/technical/realtime-presence.md
- Meeting detail page: @src/app/(admin)/presensi/[meetingId]/page.tsx
- DB ops: @docs/claude/database-operations.md

Mulai dari Task 1.
