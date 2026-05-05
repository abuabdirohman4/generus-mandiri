CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-06-sm-obw-datafilter-all-in-one.md

ISSUE: sm-obw / GH-#56
BRANCH: refactor/sm-obw-datafilter-all-in-one

REQUIREMENTS:
1. SEBELUM mulai kode: audit semua halaman yang pakai DataFilter dan AcademicYearSelector
2. Desain API props yang backward-compatible — existing props tidak boleh breaking
3. Implementasi sub-components internal (OrgFilterSection, DateFilterSection, dll)
4. Migrasi halaman satu per satu, jalankan npm run type-check setelah tiap halaman
5. Terapkan TDD ketat: RED → GREEN → REFACTOR
6. Jalankan test setelah setiap task: npm run test:run
7. Jangan lanjut jika ada test FAIL atau type-check error
8. Output per task: "✅ Task N complete: [ringkasan]"
9. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-05-06-sm-obw-datafilter-all-in-one.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- DataFilter: @src/components/shared/DataFilter.tsx
- AcademicYearSelector: @src/components/shared/AcademicYearSelector.tsx

CATATAN: Ini task besar dengan risk HIGH. Kerjakan satu halaman per sesi, jangan rush.

Mulai dari pre-work audit (langkah pertama dalam plan).
