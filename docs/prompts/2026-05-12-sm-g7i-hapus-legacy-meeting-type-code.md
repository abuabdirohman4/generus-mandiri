CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-12-sm-g7i-hapus-legacy-meeting-type-code.md

ISSUE: sm-g7i / GH-#41
BRANCH: chore/sm-g7i-hapus-legacy-meeting-type-code

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 13)
2. Setelah setiap task: verifikasi dengan grep/type-check sesuai instruksi di plan
3. Jalankan test setelah Task 7: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check && npm run test:run
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Task 4 (hapus file meetingTypes.ts) harus dilakukan SETELAH semua import ke file itu sudah diupdate

REFERENCE FILES:
- Plan: @docs/plans/2026-05-12-sm-g7i-hapus-legacy-meeting-type-code.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Types: @src/types/meeting.ts
- Legacy file (akan dihapus): @src/lib/constants/meetingTypes.ts
- Presensi queries: @src/app/(admin)/presensi/actions/meetings/queries.ts
- Presensi actions: @src/app/(admin)/presensi/actions/meetings/actions.ts
- Activity types hook: @src/hooks/useActivityTypes.ts

Mulai dari Task 1.
