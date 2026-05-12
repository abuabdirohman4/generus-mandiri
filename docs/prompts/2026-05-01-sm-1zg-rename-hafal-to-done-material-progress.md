CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-01-sm-1zg-rename-hafal-to-done-material-progress.md

ISSUE: sm-1zg / GH-#44
BRANCH: refactor/sm-1zg-rename-hafal-to-done

STATUS DB: Task 1 (DB migration) sudah selesai dikerjakan Claude Code via MCP.
- Kolom `hafal` di student_material_progress sudah di-rename ke `done` di Supabase production.
- Tabel memiliki 53 rows data yang tidak terdampak.
- MULAI DARI TASK 2 — jangan jalankan migration lagi.

REQUIREMENTS:
1. SKIP Task 1 — langsung mulai dari Task 2
2. Ikuti plan task-by-task: Task 2 → Task 3 → Task 4 → Task 5
3. Ini adalah refactor kecil (~15 baris), TIDAK perlu TDD — cukup type-check akhir
4. Setelah semua task: npm run type-check
5. Output per task: "✅ Task N complete: [ringkasan]"
6. JANGAN deviate dari plan tanpa approval user

TASK OVERVIEW:
- ~~Task 1: DB Migration~~ ✅ SUDAH SELESAI
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
- JANGAN ubah: `rapot/templates/types.ts` GradingFormat = 'hafal' (ini label UI rapot, bukan kolom DB)
- JANGAN ubah: state `hafalanCategories` di page.tsx (ini nama state untuk kategori, bukan kolom DB)
- JANGAN ubah: comment terkait hafalan di UI (konteks bisnis, bukan nama kolom)
- `revalidatePath('/hafalan')` di actions — biarkan (path revalidation, bukan kolom)

Mulai dari Task 2.
