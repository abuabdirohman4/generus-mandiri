CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-11-sm-4n5-student-detail-sidebar.md

ISSUE: sm-4n5 / GH-#73
STATUS: New feature — tambah sidebar navigasi antar siswa di halaman detail siswa

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 2 → Task 3 → Task 4)
2. Jalankan test setelah setiap task: npm run test:run
3. Jangan lanjut jika ada test FAIL
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-11-sm-4n5-student-detail-sidebar.md
- Rules: @CLAUDE.md
- Pattern reference: @src/app/(admin)/monitoring/components/StudentSidebar.tsx
- Target layout: @src/app/(admin)/users/siswa/[studentId]/layout.tsx
- Target header: @src/app/(admin)/users/siswa/[studentId]/components/StudentTabHeader.tsx
- Students action: @src/app/(admin)/users/siswa/actions/students/actions.ts (cek return type getAllStudents + getCurrentUserRole)

NOTES:
- Task 1: Cek dulu apakah getAllStudents() return type punya kelompok_name + desa_name. Jika tidak, pakai query alternatif di plan.
- Task 4: Layout saat ini mungkin sudah punya StudentTabHeader render — tambahkan sidebar di sisinya, jangan replace yang sudah ada.

Mulai dari Task 1.
