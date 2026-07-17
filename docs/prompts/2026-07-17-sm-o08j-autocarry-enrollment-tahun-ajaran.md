CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-17-sm-o08j-autocarry-enrollment-tahun-ajaran.md

ISSUE: sm-o08j / GH-#143
BRANCH: feat/sm-o08j-autocarry-enrollment

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 6)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (Task 1 & 3 wajib test dulu)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

PENTING (mudah salah):
- Aturan carry pakai `category_group IN ('caberawit','muda_mudi')`, BUKAN `promote_to_class_master_id IS NULL`. Pra Nikah 4 (stopper) TETAP di-carry karena muda_mudi.
- Carry TIDAK update students.class_id / student_classes / grade_promotion_logs. HANYA insert enrollment tahun baru (kelas sama).
- Filter category_group di SERVER (actions.ts), jangan andalkan client.
- Backfill data existing SUDAH selesai via MCP — JANGAN buat script backfill.
- Task 6: buang display "· Sem N" saja, JANGAN hapus kolom semester dari data/query.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-17-sm-o08j-autocarry-enrollment-tahun-ajaran.md
- Rules: @CLAUDE.md
- Wizard actions: @src/app/(admin)/naik-kelas/actions/promotion/actions.ts
- Wizard queries: @src/app/(admin)/naik-kelas/actions/promotion/queries.ts
- Wizard logic: @src/app/(admin)/naik-kelas/actions/promotion/logic.ts
- Client: @src/app/(admin)/naik-kelas/PromotionClient.tsx
- Types: @src/types/promotion.ts
- Riwayat kelas: @src/app/(admin)/users/siswa/[studentId]/components/EnrollmentHistory.tsx
- Architecture (§Grade Promotion): @docs/claude/architecture-patterns.md

Mulai dari Task 1.
