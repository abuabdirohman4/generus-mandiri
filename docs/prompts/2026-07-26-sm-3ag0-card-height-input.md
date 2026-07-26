CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-26-sm-3ag0-card-height-input.md

ISSUE: sm-3ag0 / GH-#152
BRANCH: feat/sm-3ag0-card-height-input

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. Task 0 (migration DB) dieksekusi USER — jangan jalankan SSH/DB sendiri, cukup kasih SQL-nya.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-26-sm-3ag0-card-height-input.md
- Rules: @CLAUDE.md
- Form: @src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx
- Action: @src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts
- Type: @src/types/idCardTemplate.ts
- PDF util: @src/lib/idCard/idCardPdfUtils.ts
- Preview: @src/lib/idCard/GridPreview.tsx

Mulai dari Task 1 (Task 0 = migration, serahkan user).
