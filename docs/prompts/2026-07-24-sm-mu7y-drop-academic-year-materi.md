CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi FASE 2b (KODE) dari implementation plan di @docs/plans/2026-07-24-sm-mu7y-drop-academic-year-materi.md

ISSUE: sm-mu7y
BRANCH: feat/sm-mu7y-drop-academic-year-materi

SCOPE: HANYA perubahan KODE (Fase 2b). Fase 1 (sync data prod), Fase 2a (migrasi DB) dikerjakan USER via skill DB — JANGAN sentuh DB/SQL/migrasi.

PRASYARAT: migrasi DB local dev (5417) sudah drop kolom academic_year_id (user jalankan Fase 2a dulu). Kalau belum, test akan gagal — konfirmasi ke user.

REQUIREMENTS:
1. Ikuti plan Fase 2b file-by-file (6 file + import script)
2. KUNCI ASIMETRIS — WAJIB: hapus academic_year_id HANYA pada query .from('material_monthly_targets'). PERTAHANKAN academic_year_id pada student_material_progress, student_enrollments, rapot_data. Cek nama tabel tiap baris sebelum edit di laporan/materiQueries.ts.
3. TDD ketat: RED → GREEN → REFACTOR untuk logika query yang berubah
4. Jalankan test setelah tiap file: npm run test:run
5. Jangan lanjut jika ada test FAIL
6. Setelah semua: npm run type-check (nol referensi academic_year_id yatim di type materi)
7. Output per file: "✅ [file] complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-24-sm-mu7y-drop-academic-year-materi.md
- Rules: @CLAUDE.md
- PostgREST select tak ter-typecheck → E2E wajib (memory postgrest-select-not-typechecked)

FILE YANG DIUBAH (Fase 2b):
- src/types/material.ts (L151, L166)
- src/app/(admin)/materi/actions/monthly-targets/queries.ts
- src/app/(admin)/materi/actions/monthly-targets/actions.ts
- src/app/(admin)/laporan/actions/reports/materiQueries.ts (ASIMETRIS — hati-hati)
- src/app/(admin)/dashboard/actions/materiMonitoring.ts
- src/app/(admin)/users/siswa/[studentId]/actions/materi.ts
- scripts/import-materi.mjs

Mulai dari src/types/material.ts.
