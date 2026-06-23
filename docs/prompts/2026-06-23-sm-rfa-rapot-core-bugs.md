CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-03-18-rapot-core-bugs.md

ISSUE: sm-rfa / GH-#22
BRANCH: fix/sm-rfa-rapot-core-bugs

REQUIREMENTS:
1. Ikuti plan task-by-task (Task 1 → Task 5; Task 6 commit oleh user)
2. Ini BUG fix bundle (4 core bugs). Untuk tiap bug: kalau memungkinkan tulis test reproduksi (RED) → fix → verify (GREEN) sebagai regression guard. Bug UI murni (bg-gray-750) boleh tanpa test.
3. npm run test:run setelah tiap task; jangan lanjut kalau FAIL
4. onConflict fix (Task 3): hapus spasi di string composite key — PostgreSQL gagal pada 'student_id, subject_id'. Pastikan SEMUA lokasi (baris 85,108,147,353 di queries.ts).
5. Pakai komponen form/button existing — JANGAN raw HTML.
6. Setelah semua: npm run type-check (0 errors)
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-03-18-rapot-core-bugs.md
- Rules: @CLAUDE.md
- Business rules (rapot): @docs/claude/business-rules.md
- DB ops: @docs/claude/database-operations.md
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1.
