CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-26-sm-952u-font-size-percent-global.md

ISSUE: sm-952u / GH-#153
BRANCH: feat/sm-952u-font-size-percent

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-26-sm-952u-font-size-percent-global.md
- Rules: @CLAUDE.md
- Compose: @src/lib/idCard/composeCard.client.ts
- Form: @src/app/(admin)/users/siswa/qr-cards/template/TemplateClient.tsx
- Validasi: @src/app/(admin)/users/siswa/qr-cards/actions/template/logic.ts
- Action: @src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts

Mulai dari Task 1.
