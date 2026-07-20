CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-20-sm-d7zd-hooks-order-naik-kelas.md

ISSUE: sm-d7zd / GH-#149
BRANCH: fix/sm-d7zd-hooks-order

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-20-sm-d7zd-hooks-order-naik-kelas.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Sudah diperiksa bersih: @src/app/(admin)/naik-kelas/PromotionClient.tsx
- PRASYARAT: sm-iywv harus closed dulu (butuh sourcemap)
- Sentry issues: GENERUS-MANDIRI-13 dan GENERUS-MANDIRI-12

Mulai dari Task 1.
