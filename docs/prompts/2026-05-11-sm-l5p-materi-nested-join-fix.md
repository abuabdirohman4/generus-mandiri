CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-11-sm-l5p-materi-nested-join-fix.md

ISSUE: sm-l5p / GH-#69
STATUS: Bug fix — tab materi hanya tampil Hafalan karena nested join broken

REQUIREMENTS:
1. Ikuti plan task-by-task
2. Jalankan test setelah task: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-11-sm-l5p-materi-nested-join-fix.md
- Rules: @CLAUDE.md
- Fix target: @src/app/(admin)/users/siswa/[studentId]/actions/materi.ts (line 44-55)
- Pattern referensi yang bekerja: @src/app/(admin)/laporan/actions/reports/materiQueries.ts (line 90-100)
- Pattern referensi 2: @src/app/(admin)/materi/actions/items/queries.ts (line 91-94)

Mulai dari Task 1.
