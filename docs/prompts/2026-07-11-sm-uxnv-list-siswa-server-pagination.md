CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-11-sm-uxnv-list-siswa-server-pagination.md

ISSUE: sm-uxnv / GH-#137
BRANCH: perf/sm-uxnv-list-siswa-server-pagination

REQUIREMENTS:
1. Ikuti plan task-by-task (Task 1 query paginated → Task 5 tests)
2. TDD ketat: RED → GREEN → REFACTOR. Test filter/search/teacher-scope WAJIB (risiko tinggi).
3. Jalankan test setelah tiap task: npm run test:run. Jangan lanjut kalau FAIL.
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user.

PARITY MUTLAK:
- Search harus cari SELURUH DB (server-side .ilike), BUKAN cuma halaman aktif. Ini bug paling bahaya — jangan sampai user "kehilangan" siswa.
- Teacher hanya lihat siswa kelasnya (filter role di server, tak boleh bocor). Admin sesuai scope daerah/desa/kelompok.
- Export/import/naik-kelas/QR-cards/assign/template TETAP lihat SEMUA row — jalur fetchAllStudents JANGAN disentuh/dirusak.
- DataTable server-mode OPSIONAL (props baru default undefined = perilaku client lama). Komponen lain yang pakai DataTable tak boleh berubah perilaku.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-11-sm-uxnv-list-siswa-server-pagination.md
- Rules: @CLAUDE.md
- Egress rules: @docs/claude/egress-cost-optimization.md
- Query: src/app/(admin)/users/siswa/actions/students/queries.ts (STUDENT_SELECT:11, fetchAllStudents:29)
- Action: src/app/(admin)/users/siswa/actions/students/actions.ts (getAllStudents:150)
- Hook: src/app/(admin)/users/siswa/hooks/useSiswaPage.ts (filteredStudents useMemo — filter client-side)
- Table: src/components/table/Table.tsx (DataTableProps:24 — client-only, tambah server-mode)
- Konsumen all-rows (JANGAN dirusak): QrCardsTab, AssignStudentsModal, TemplateClient, [studentId]/actions/sidebar.ts

Mulai dari Task 1.
