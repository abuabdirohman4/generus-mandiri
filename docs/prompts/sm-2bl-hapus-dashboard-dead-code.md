CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-07-sm-2bl-hapus-dashboard-dead-code.md

ISSUE: sm-2bl / GH-#60
BRANCH: task/sm-2bl-hapus-dashboard-dead-code

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Ini adalah task HAPUS FILE — tidak ada kode baru yang ditulis
3. Setelah setiap task: jalankan grep untuk verifikasi tidak ada referensi tersisa
4. Setelah semua task: npm run type-check (harus 0 error)
5. Setelah type-check: npm run test:run (harus semua pass)
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN hapus file yang masih dipakai (lihat tabel "File yang TIDAK Diubah" di plan)

REFERENCE FILES:
- Plan: @docs/plans/2026-05-07-sm-2bl-hapus-dashboard-dead-code.md
- Rules: @CLAUDE.md

Mulai dari Task 1.
