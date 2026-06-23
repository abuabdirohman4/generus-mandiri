CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-dp7-bulk-ganti-kelas-siswa.md

ISSUE: sm-dp7 / GH-#113
BRANCH: feat/sm-dp7-bulk-ganti-kelas-siswa

REQUIREMENTS:
1. Ikuti plan task-by-task (Task 0 → Task 7)
2. TDD ketat untuk logic/queries/action; skip untuk UI murni
3. npm run test:run setelah tiap task; jangan lanjut kalau FAIL
4. STOP di Task 0: baca business-rules.md §Students + §Transfers, lalu TANYA user keputusan "ganti kelas" = replace total (A) atau pindah single (B). Default plan = (A) replace, TAPI destruktif (hapus student_classes) → WAJIB konfirmasi sebelum coding.
5. CRITICAL: ini GANTI, BUKAN add. JANGAN pakai assignStudentsToClass (itu additive). Buat bulkChangeStudentClass baru yang replace membership + update students.class_id.
6. Row multi-select via shared DataTable prop `selectable` (opt-in, default off). Kalau sm-1jj sudah merge prop ini, consume saja; kalau belum, build di sini dengan spec sama.
7. Class dropdown scope-aware. Class sort by class_master.sort_order — pakai two-query pattern, JANGAN nested PostgREST join (silently fails, lihat CLAUDE.md §Class Sort Order).
8. Semua Server Action return { success, data, message }. Partial success, no rollback.
9. Pakai komponen form existing (InputFilter, Checkbox, Button, Modal) — JANGAN raw HTML form.
10. Setelah semua: npm run type-check (0 errors)
11. Output per task: "✅ Task N complete: [ringkasan]"
12. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-dp7-bulk-ganti-kelas-siswa.md
- Rules: @CLAUDE.md
- Business rules: @docs/claude/business-rules.md (§Students, §Transfers)
- Existing additive action (JANGAN dipakai utk ganti): @src/app/(admin)/users/siswa/actions/students/actions.ts (assignStudentsToClass)
- StudentsTable: @src/app/(admin)/users/siswa/components/StudentsTable.tsx
- useSiswaPage: @src/app/(admin)/users/siswa/hooks/useSiswaPage.ts
- Siswa page: @src/app/(admin)/users/siswa/page.tsx
- Shared Table: @src/components/table/Table.tsx
- Class actions: @src/app/(admin)/users/siswa/actions/classes/actions.ts
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 0 — baca business rules + konfirmasi semantik replace ke user SEBELUM coding.
