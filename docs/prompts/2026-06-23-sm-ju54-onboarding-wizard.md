CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-ju54-onboarding-wizard.md

ISSUE: sm-ju54 / GH-#110
BRANCH: feat/sm-ju54-onboarding-wizard

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 8)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (untuk logic/permission/orchestration; skip untuk UI presentasional murni)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. JANGAN rewrite createKelompok/createDesa/createDaerah/createBatchStandardClasses/createTeacher — panggil/re-export saja. Wizard = orchestration, bukan business logic baru.
6. Pakai komponen form existing (InputFilter, Checkbox, MultiSelectCheckbox, Button) — JANGAN raw <input>/<select>/<button> untuk form.
7. WAJIB Task 7 — daftarkan /onboarding di 3 tempat navigasi (AppSidebar allNavItems, QuickActions, AppHeader getPageTitle). Lupa = menu/judul hilang.
8. Setelah semua task: npm run type-check (0 errors)
9. Output per task: "✅ Task N complete: [ringkasan]"
10. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-ju54-onboarding-wizard.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Wizard pattern: @src/app/(admin)/naik-kelas/PromotionClient.tsx
- Page guard: @src/app/(admin)/naik-kelas/page.tsx
- Kelas batch engine: @src/app/(admin)/kelas/actions/batch-standard/actions.ts
- Standard kelas modal (UI mimic): @src/app/(admin)/kelas/components/BatchStandardKelasModal.tsx
- Teacher action: @src/app/(admin)/users/guru/actions/teachers/actions.ts
- Org actions: @src/app/(admin)/organisasi/actions/kelompok.ts (+ desa.ts, daerah.ts)
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1.
