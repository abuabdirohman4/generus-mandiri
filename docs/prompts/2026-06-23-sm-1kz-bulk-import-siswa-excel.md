CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-1kz-bulk-import-siswa-excel.md

ISSUE: sm-1kz / GH-#112
BRANCH: feat/sm-1kz-bulk-import-siswa-excel

REQUIREMENTS:
1. Ikuti plan task-by-task (Task 1 → Task 6)
2. TDD ketat untuk parse/validate/template logic; skip untuk UI murni
3. npm run test:run setelah tiap task; jangan lanjut kalau FAIL
4. EXTEND existing batch-import flow — JANGAN rebuild modal/preview/commit. Reuse createStudentsBatch, Step3Preview, batchImportStore. Tambah jalur Excel ke Step2Input (mode switch manual/excel).
5. Parse Excel client-side (xlsx/SheetJS). Logic parse+validate dipisah ke modul pure (parseExcel.ts) supaya testable.
6. Commit tetap lewat createStudentsBatch (server) — permission/scope check jalan di server. Cek apakah perlu chunking untuk ratusan baris.
7. Pakai komponen form existing; cek components/form/input/ untuk FileInput sebelum pakai raw <input type=file>.
8. npm i xlsx (user yang jalankan kalau Claude tak boleh install).
9. Setelah semua: npm run type-check (0 errors)
10. Output per task: "✅ Task N complete: [ringkasan]"
11. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-1kz-bulk-import-siswa-excel.md
- Rules: @CLAUDE.md
- Existing batch modal: @src/app/(admin)/users/siswa/components/BatchImportModal.tsx
- Step2Input (extend ini): @src/app/(admin)/users/siswa/components/batch-import/Step2Input.tsx
- Step3Preview (reuse): @src/app/(admin)/users/siswa/components/batch-import/Step3Preview.tsx
- Store: @src/app/(admin)/users/siswa/stores/batchImportStore.ts
- Commit action: @src/app/(admin)/users/siswa/actions/students/actions.ts (createStudentsBatch)
- Business rules: @docs/claude/business-rules.md (§Students)
- DB bulk ops: @docs/claude/database-operations.md
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1.
