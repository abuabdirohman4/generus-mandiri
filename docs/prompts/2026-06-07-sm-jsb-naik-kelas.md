CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-07-sm-jsb-naik-kelas-impl.md

ISSUE: sm-jsb / GH-#24
BRANCH: feat/sm-jsb-naik-kelas

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 9, hormati dependency di plan)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (wajib utk suggestTargetClass, validatePromotionPermission, preparePromotionData, togglePromotionEnabled)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

KEPUTUSAN TERKUNCI (jangan ubah):
- Academic year = Opsi A: naik-kelas enroll ke active academic_year. TIDAK bikin academic_year sendiri. Admin bikin tahun baru via /tahun-ajaran dulu.
- Toggle = reuse tabel app_settings (key='grade_promotion_enabled'). TIDAK ada DDL untuk app_settings.
- student_enrollments.semester WAJIB di-supply (NOT NULL, no default).
- grade_promotion_logs immutable (RLS no UPDATE/DELETE).

CONSTRAINT PENTING:
- Sort kelas SELALU via class_master.sort_order pakai pola 2-query. JANGAN nested join PostgREST (silent fail). Lihat src/app/(admin)/users/siswa/actions/classes.ts.
- Kategori kelas pakai category_group via classHelpers.ts, BUKAN tabel categories (sudah dihapus).
- Permission: reuse accessControlServer.ts (getCurrentUserProfile, getDataFilter) + userUtils.ts (isSuperAdmin, isAdminDaerah, dll). JANGAN import accessControl.ts langsung.
- 3-layer architecture (queries/logic/actions terpisah) ikut pola sm-d15.
- Semua type domain di src/types/promotion.ts. Server actions return {success, data, message}.
- PostgREST .select() string tidak ter-type-check → validasi runtime via E2E/smoke.

REFERENCE FILES:
- Plan: @docs/plans/2026-06-07-sm-jsb-naik-kelas-impl.md
- Design doc (spec): @docs/plans/2026-04-03-naik-kelas-design.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Pola enroll existing: @src/app/(admin)/tahun-ajaran/actions/enrollments.ts
- Pola academic year: @src/app/(admin)/tahun-ajaran/actions/academic-years.ts
- Sidebar nav: @src/components/layouts/AppSidebar.tsx
- Settings page: @src/app/(admin)/settings/page.tsx
- E2E multi-role: @tests/MULTI_ROLE_TESTING.md

Mulai dari Task 1 (DB migration).
