CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-10-sm-mf8-tab-loading-indicator.md

ISSUE: sm-mf8 / GH-#58
STATUS: Enhancement — loading indicator tab + SWR cache

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 2)
2. Jalankan test setelah setiap task: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-10-sm-mf8-tab-loading-indicator.md
- Rules: @CLAUDE.md
- Tab header (tambah loading): @src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx
- Tab header test (update jika perlu): @src/app/(admin)/users/siswa/[studentId]/components/__tests__/StudentTabHeader.test.tsx
- MateriView (ganti ke SWR): @src/app/(admin)/users/siswa/[studentId]/components/MateriView.tsx
- MateriView test (update jika perlu): @src/app/(admin)/users/siswa/[studentId]/components/__tests__/MateriView.test.tsx
- Server action materi (sudah ada): @src/app/(admin)/users/siswa/[studentId]/actions/materi.ts
- SWR global config (referensi): @src/lib/swr.ts

Mulai dari Task 1.
