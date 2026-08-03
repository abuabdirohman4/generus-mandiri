CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-08-03-sm-6sbz-offline-presensi-queue-sync.md

ISSUE: sm-6sbz / GH-#163 (DEPENDS ON sm-vxna — pastikan Tier 1 offline shell sudah ada)
BRANCH: feat/sm-6sbz-offline-presensi-queue-sync

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD KETAT (business logic): RED → GREEN → REFACTOR. Tulis offlineQueue.test.ts DULU, verifikasi FAIL, baru implement.
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. JANGAN raw <button> — pakai Button dari components/ui/button/; ikon dari src/lib/icons.tsx
9. Sync MANUAL (tombol), BUKAN auto — jangan auto-kirim saat online event
10. Reuse saveAttendance idempotent existing — re-submit aman, jangan bikin action baru

REFERENCE FILES:
- Plan: @docs/plans/2026-08-03-sm-6sbz-offline-presensi-queue-sync.md
- Rules: @CLAUDE.md
- Attendance action: @src/app/(admin)/presensi/actions/attendance/actions.ts
- Auto-save hook: @src/app/(admin)/presensi/hooks/useAutoSave.ts
- Auto-save status UI: @src/app/(admin)/presensi/components/AutoSaveStatus.tsx
- Draft storage pattern (acuan localStorage): @src/app/(admin)/users/siswa/utils/draftStorage.ts
- Business rules: @docs/claude/business-rules.md

Mulai dari Task 1.
