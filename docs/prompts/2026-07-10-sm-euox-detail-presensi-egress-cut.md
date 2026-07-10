CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-10-sm-euox-detail-presensi-egress-cut.md

ISSUE: sm-euox / GH-#135
BRANCH: perf/sm-euox-detail-presensi-egress-cut

REQUIREMENTS:
1. Ikuti plan task-by-task berurutan (Task 1 trim query → Task 5 tests)
2. TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah tiap task: npm run test:run
4. Jangan lanjut kalau ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Parity mutlak: list/kalender presensi render identik (title, status, tanggal, activity_type). Modal tetap tampil topic/description (via lazy-fetch Task 2).
9. Type topic/description jadi OPTIONAL di src/types canonical — jangan inline redefine.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-10-sm-euox-detail-presensi-egress-cut.md
- Rules: @CLAUDE.md
- Egress rules: @docs/claude/egress-cost-optimization.md
- Query: src/app/(admin)/users/siswa/actions/students/queries.ts (fetchStudentAttendanceHistory:296)
- Action: src/app/(admin)/users/siswa/actions/students/actions.ts (getStudentAttendanceHistory:1372)
- Hook: src/app/(admin)/users/siswa/[studentId]/hooks/useStudentDetail.ts
- Modal: src/app/(admin)/users/siswa/[studentId]/components/MeetingDetailModal.tsx
- List: src/app/(admin)/users/siswa/[studentId]/components/AttendanceList.tsx

Mulai dari Task 1.
