CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-12-sm-g7i-hapus-legacy-meeting-type-code.md

ISSUE: sm-g7i / GH-#41
BRANCH: chore/sm-g7i-hapus-legacy-meeting-type-code

STATUS DB: Task 1 (DB migration) sudah selesai dikerjakan Claude Code via MCP pada 2026-05-12.
- Kolom `meeting_type_code` sudah di-DROP dari tabel `meetings` di Supabase production.
- 21 meetings yang belum punya activity_type_id sudah di-backfill (Pengajian + KELOMPOK).
- JANGAN jalankan migration apapun terkait meeting_type_code — sudah tidak ada kolom tersebut.
- MULAI DARI TASK 2.

REQUIREMENTS:
1. SKIP Task 1 — langsung mulai dari Task 2
2. Ikuti plan task-by-task: Task 2 → Task 3 → ... → Task 13
3. Setelah setiap task: verifikasi dengan grep/type-check sesuai instruksi di plan
4. Jalankan test setelah Task 7: npm run test:run
5. Jangan lanjut jika ada test FAIL
6. Setelah semua task: npm run type-check && npm run test:run && npm run build
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user
9. Task 4 (hapus file meetingTypes.ts) harus dilakukan SETELAH semua import ke file itu sudah diupdate

TASK OVERVIEW:
- ~~Task 1: DB Migration~~ ✅ SUDAH SELESAI
- Task 2: Update src/types/meeting.ts — hapus meeting_type_code, meetingTypeCode fields
- Task 3: Update src/types/dashboard.ts — hapus meeting_type_code field
- Task 4: Hapus src/lib/constants/meetingTypes.ts (SETELAH semua import diupdate)
- Task 5: Refactor src/app/(admin)/presensi/hooks/useMeetingTypes.ts
- Task 6: Refactor src/app/(admin)/presensi/components/CreateMeetingModal.tsx
- Task 7: Update src/app/(admin)/presensi/actions/meetings/queries.ts + update test
- Task 8: Update src/app/(admin)/presensi/actions/meetings/actions.ts
- Task 9: Update MeetingList.tsx, MeetingCards.tsx, MeetingTypeBadge.tsx
- Task 10: Update src/app/(admin)/presensi/[meetingId]/page.tsx
- Task 11: Update dashboard/actions/overview/queries.ts + TodayMeetings.tsx
- Task 12: Update users/siswa/actions/students/queries.ts + actions.ts + hooks/useMeetings.ts
- Task 13: Final verification (grep + type-check + test + build)

REFERENCE FILES:
- Plan: @docs/plans/2026-05-12-sm-g7i-hapus-legacy-meeting-type-code.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Legacy file (akan dihapus): @src/lib/constants/meetingTypes.ts
- Types: @src/types/meeting.ts
- Presensi queries: @src/app/(admin)/presensi/actions/meetings/queries.ts
- Presensi actions: @src/app/(admin)/presensi/actions/meetings/actions.ts
- Activity types hook: @src/hooks/useActivityTypes.ts

Mulai dari Task 2.
