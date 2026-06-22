CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-22-sm-ft7w-pengajian-tingkat-daerah.md

ISSUE: sm-ft7w / GH-#107
BRANCH: feat/sm-ft7w-pengajian-daerah

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat di Task 1a: RED (test fail) → GREEN (implement) → REFACTOR
3. Jalankan test setelah Task 1a: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. JANGAN raw HTML untuk form — pakai MultiSelectCheckbox yang sudah ada
9. JANGAN git add/commit/push — user yang eksekusi git

REFERENCE FILES:
- Plan: @docs/plans/2026-06-22-sm-ft7w-pengajian-tingkat-daerah.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Modal saat ini: @src/app/(admin)/presensi/components/CreateMeetingModal.tsx
- MeetingList: @src/app/(admin)/presensi/components/MeetingList.tsx
- MeetingCards: @src/app/(admin)/presensi/components/MeetingCards.tsx

Mulai dari Task 1a (buat logic.test.ts, verifikasi RED, baru buat logic.ts, verifikasi GREEN).
