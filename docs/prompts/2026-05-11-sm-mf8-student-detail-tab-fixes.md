CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-10-sm-mf8-student-detail-tab-fixes.md

ISSUE: sm-mf8 / GH-#58
STATUS: Post-Antigravity fix — perbaikan bug + tambah fitur yang belum selesai

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 2 → 3 → 4 → 5)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-10-sm-mf8-student-detail-tab-fixes.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Tab header (fix label): @src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx
- Layout (hapus wrapper): @src/app/(admin)/users/siswa/[studentId]/layout.tsx
- MateriView (rewrite): @src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx
- Server action baru: src/app/(admin)/users/siswa/[studentId]/actions/materi.ts (BARU)
- MateriDataTable (tambah action col): @src/app/(admin)/laporan/components/MateriDataTable.tsx
- Contoh pola server action materi: @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- getGrade + getProgressTextColor: @src/lib/percentages.ts
- Academic year actions: @src/app/(admin)/tahun-ajaran/actions/academic-years.ts

Mulai dari Task 1.
