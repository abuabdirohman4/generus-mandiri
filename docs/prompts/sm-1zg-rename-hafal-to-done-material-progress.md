CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-01-sm-1zg-rename-hafal-to-done-material-progress.md

ISSUE: sm-1zg / GH-#XX
BRANCH: refactor/sm-1zg-rename-hafal-to-done

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 5)
2. Ini adalah refactor kecil (~15 baris), TIDAK perlu TDD — cukup type-check akhir
3. Setelah semua task: npm run type-check
4. Output per task: "✅ Task N complete: [ringkasan]"
5. JANGAN deviate dari plan tanpa approval user

TASK OVERVIEW:
- Task 1: DB Migration — ALTER TABLE student_material_progress RENAME COLUMN hafal TO done
- Task 2: Update monitoring/types.ts — ganti semua `hafal` → `done` di interfaces & getDisplayScore()
- Task 3: Update monitoring/actions/monitoring.ts — ganti query select + scoring logic (3 tempat)
- Task 4: Update monitoring/page.tsx — Progress interface + bulkUpdateProgress call + scoring
- Task 5: Type-check — npm run type-check, expected 0 errors

REFERENCE FILES:
- Plan: @docs/plans/2026-05-01-sm-1zg-rename-hafal-to-done-material-progress.md
- Rules: @CLAUDE.md
- Types: @src/app/(admin)/monitoring/types.ts
- Actions: @src/app/(admin)/monitoring/actions/monitoring.ts
- Page: @src/app/(admin)/monitoring/page.tsx

KEY TECHNICAL NOTES:
- student_material_progress saat ini 0 row — safe migration, tidak ada data yang hilang
- JANGAN ubah: `rapot/templates/types.ts` GradingFormat = 'hafal' (ini label UI rapot, bukan kolom DB)
- JANGAN ubah: state `hafalanCategories` di page.tsx (ini nama state untuk kategori, bukan kolom DB)
- JANGAN ubah: comment terkait hafalan di UI (konteks bisnis, bukan nama kolom)
- `revalidatePath('/hafalan')` di actions — biarkan (path revalidation, bukan kolom)
- Setelah Task 1 (DB migration via MCP), verifikasi kolom `done` ada sebelum lanjut

Mulai dari Task 1.
