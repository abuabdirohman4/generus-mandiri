CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-26-sm-lpaf-qr-optional-hide.md

ISSUE: sm-lpaf / GH-#154
BRANCH: feat/sm-lpaf-qr-optional

REQUIREMENTS:
1. Ikuti plan task-by-task berurutan
2. TDD ketat: RED → GREEN → REFACTOR
3. npm run test:run setelah tiap task
4. Jangan lanjut jika ada test FAIL
5. Setelah semua: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate tanpa approval
8. Task 0 (migration DB) = USER eksekusi, kasih SQL saja.

REFERENCE FILES:
- Plan: @docs/plans/2026-07-26-sm-lpaf-qr-optional-hide.md
- Rules: @CLAUDE.md
- Type: @src/types/idCardTemplate.ts
- Compose: @src/lib/idCard/composeCard.client.ts
- PDF util: @src/lib/idCard/idCardPdfUtils.ts
- Form: @src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx
- Action: @src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts

Mulai dari Task 1 (Task 0 = migration, serahkan user).
