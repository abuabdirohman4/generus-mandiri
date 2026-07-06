CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-06-sm-q7x-qr-scan-mark-presensi.md

ISSUE: sm-q7x / GH-#25
BRANCH: feat/sm-q7x-qr-scan-mark-presensi

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 2 → Task 3)
2. Terapkan TDD ketat untuk Layer 2 (logic.ts): RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Ikuti 3-layer architecture (queries.ts/logic.ts/actions.ts) — lihat docs/claude/architecture-patterns.md §3-Layer Functional Architecture
7. Install dependency baru dulu: npm install @yudiel/react-qr-scanner qrcode.react
8. Output per task: "✅ Task N complete: [ringkasan]"
9. JANGAN deviate dari plan tanpa approval user
10. JANGAN bikin ulang logic WIB-date offset — extract dari saveAttendanceForMeeting existing (actions.ts:140-146) jadi helper shared

REFERENCE FILES:
- Plan: @docs/plans/2026-07-06-sm-q7x-qr-scan-mark-presensi.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Existing attendance write path: @src/app/(admin)/presensi/actions/attendance/queries.ts
- Existing attendance actions (untuk pola WIB date + auth): @src/app/(admin)/presensi/actions/attendance/actions.ts
- Existing tab pattern: @src/app/(admin)/laporan/components/LaporanTabHeader.tsx
- Meeting detail page: @src/app/(admin)/presensi/[meetingId]/page.tsx
- Permission check attendance: @src/app/(admin)/presensi/actions/meetings/helpers.client.ts
- Student tab header (untuk halaman QR per-siswa): @src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx

Mulai dari Task 1.
