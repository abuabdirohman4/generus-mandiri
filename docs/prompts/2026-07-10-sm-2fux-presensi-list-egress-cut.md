CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-10-sm-2fux-presensi-list-egress-cut.md

ISSUE: sm-2fux / GH-#136
BRANCH: perf/sm-2fux-presensi-list-egress-cut

REQUIREMENTS:
1. Ikuti plan task-by-task berurutan (Task 1 trim query → Task 4 tests)
2. TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah tiap task: npm run test:run
4. Jangan lanjut kalau ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Parity mutlak: list/card /presensi render identik (topic tetap tampil). Edit pertemuan HARUS tetap pre-fill siswa terpilih + topic + description (via lazy-fetch getMeetingById saat modal edit buka). JANGAN sampai submit create/edit kehilangan data siswa.
9. Tipe student_snapshot?/description? jadi OPSIONAL di src/types/meeting canonical — jangan inline redefine.
10. JANGAN ubah pagination cursor fetchMeetingsByClass (limit + cursor sudah benar).

REFERENCE FILES:
- Plan: @docs/plans/2026-07-10-sm-2fux-presensi-list-egress-cut.md
- Rules: @CLAUDE.md
- Egress rules: @docs/claude/egress-cost-optimization.md
- Query list: src/app/(admin)/presensi/actions/meetings/queries.ts (fetchMeetingsByClass:59, fetchMeetingById:12)
- Modal edit: src/app/(admin)/presensi/components/CreateMeetingModal.tsx (student_snapshot prefill:553)
- Card: src/app/(admin)/presensi/components/MeetingCards.tsx (topic render:701)
- Hook: src/app/(admin)/presensi/hooks/useMeetings.ts
- Types: src/types/meeting.ts

Mulai dari Task 1.
