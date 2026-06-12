CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-12-sm-4ygf-superadmin-notif-history-multidaerah.md

ISSUE: sm-4ygf / GH-#106
BRANCH: feat/sm-4ygf-superadmin-notif-history-multidaerah

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → 8)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (Task 2 ada test daerah_ids)
3. Jalankan test setelah setiap task: npm run test:run -- logic.test
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. PENTING (Task 4a/6c): PostgREST nested join (sender:sender_id, daerah) bisa ter-infer sebagai ARRAY, bukan object. Tulis defensif dengan Array.isArray(...) ? x[0] : x. Cek pola existing di orgQueries.ts (desa/kelompok mapping).
7. PENTING (Task 6c): cek API MultiSelectCheckbox dari pemakaian roles picker di KirimBroadcastForm.tsx (baris ~516) — pakai pola props yang sama persis.
8. Output per task: "✅ Task N complete: [ringkasan]"
9. JANGAN deviate dari plan tanpa approval user

OUT OF SCOPE (jangan kerjakan): ganti nama "Super Admin" — itu UPDATE DB profiles.full_name manual, bukan kode.

REFERENCE FILES:
- Plan: @docs/plans/2026-06-12-sm-4ygf-superadmin-notif-history-multidaerah.md
- Rules: @CLAUDE.md
- Server actions conventions: @docs/claude/server-actions-conventions.md
- Form existing: @src/app/(admin)/notifikasi/components/KirimBroadcastForm.tsx
- Queries: @src/app/(admin)/notifikasi/actions/notifications/queries.ts

Mulai dari Task 1.
