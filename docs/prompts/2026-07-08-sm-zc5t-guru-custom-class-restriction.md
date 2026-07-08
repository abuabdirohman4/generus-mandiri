CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-08-sm-zc5t-guru-custom-class-restriction.md

ISSUE: sm-zc5t / GH-#131
BRANCH: feat/sm-zc5t-guru-custom-class-restriction

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 6)
2. Task 1 (DB migration) pakai MCP Supabase tool `apply_migration` — JANGAN tulis raw SQL file manual
3. Terapkan TDD ketat untuk Task 3 (logic.ts): RED → GREEN → REFACTOR
4. Task 5 (accessControlServer.ts) TIDAK ada unit test existing (query Supabase langsung) — ikuti instruksi verifikasi manual/E2E di plan, jangan skip
5. Task 6 (GuruModal.tsx): cek dulu props `InputFilter` component (`src/components/form/input/InputFilter.tsx`) sebelum implement — signature `onChange` dan `disabled` prop harus dikonfirmasi cocok
6. Jalankan test setelah setiap task: npm run test:run
7. Jangan lanjut jika ada test FAIL
8. Setelah semua task: npm run type-check
9. Output per task: "✅ Task N complete: [ringkasan]"
10. JANGAN deviate dari plan tanpa approval user
11. PERHATIKAN "CRITICAL" note di Task 5 soal `.filter()` vs `.find()` — pakai versi FIX (filter), bukan versi awal yang cuma penjelasan

REFERENCE FILES:
- Plan: @docs/plans/2026-07-08-sm-zc5t-guru-custom-class-restriction.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md (§Hierarchical Teacher Pattern)
- Pola referensi UI: @src/app/(admin)/users/siswa/components/AssignStudentsModal.tsx (lainnyaClassNames, InputFilter kondisional)
- Target utama: @src/lib/accessControlServer.ts, @src/app/(admin)/users/guru/actions/teacher-class-masters/, @src/app/(admin)/users/guru/components/GuruModal.tsx

Mulai dari Task 1.
