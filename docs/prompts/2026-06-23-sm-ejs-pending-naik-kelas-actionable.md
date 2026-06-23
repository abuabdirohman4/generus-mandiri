CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-ejs-pending-naik-kelas-actionable.md

ISSUE: sm-ejs / GH-#111
BRANCH: feat/sm-ejs-pending-naik-kelas

DEPENDS ON: sm-69c (notification system — sudah selesai, REUSE jangan rebuild)

REQUIREMENTS:
1. Ikuti plan task-by-task berurutan (Task 1 → Task 7)
2. TDD ketat untuk logic/queries/action: RED → GREEN → REFACTOR; skip untuk UI presentasional murni
3. npm run test:run setelah tiap task; jangan lanjut kalau FAIL
4. REUSE sm-69c notif infra (action_url, action_label, dismiss_mode='cta_required', display_mode='modal', fetchRecipientProfileIds, createBroadcastNotification) — JANGAN bikin sistem notif baru.
5. REUSE sm-jsb promotion queries (resolveTargetClassInKelompok, upsertEnrollment, updateStudentClassId, upsertStudentClass, insertPromotionLog) untuk apply "naik".
6. STOP sebelum Task 1 migration: TANYA user dulu master mana yang dapat flag requires_local_decision (Paud + Pra Nikah yang mana persisnya). JANGAN tebak / derive dari sort_order (lihat keputusan project: kategori/jenjang pakai kolom eksplisit).
7. Decision sudah final: pakai cta_required soft-block, BUKAN account-wide hard block.
8. Migration via Supabase MCP apply_migration. Cek list_tables dulu sebelum ubah skema.
9. RLS grade_promotion_pending: scope kelompok/desa baca+update miliknya, daerah/superadmin semua. Cek dulu state RLS junction tables existing.
10. Semua Server Action return { success, data, message }. Partial success, no rollback.
11. Pakai komponen form existing (Checkbox, Button, InputFilter) — JANGAN raw HTML form.
12. Sub-route /naik-kelas/pending WAJIB masuk getPageTitle() (AppHeader). Wizard /naik-kelas → gate daerah-only di sidebar + page guard.
13. Setelah semua: npm run type-check (0 errors)
14. Output per task: "✅ Task N complete: [ringkasan]"
15. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-ejs-pending-naik-kelas-actionable.md
- Rules: @CLAUDE.md
- Notif pattern: @docs/claude/architecture-patterns.md (§Notifikasi sm-69c)
- Promotion pattern: @docs/claude/architecture-patterns.md (§Grade Promotion sm-jsb)
- Notif types: @src/types/notification.ts
- Notif actions: @src/app/(admin)/notifikasi/actions/notifications/actions.ts
- Notif queries: @src/app/(admin)/notifikasi/actions/notifications/queries.ts
- Promotion queries: @src/app/(admin)/naik-kelas/actions/promotion/queries.ts
- Promotion classes logic: @src/app/(admin)/naik-kelas/actions/classes/logic.ts
- Naik-kelas page guard: @src/app/(admin)/naik-kelas/page.tsx
- Server actions convention: @docs/claude/server-actions-conventions.md

Mulai dari Task 1 — TAPI tanya user dulu daftar master requires_local_decision sebelum jalankan migration.
