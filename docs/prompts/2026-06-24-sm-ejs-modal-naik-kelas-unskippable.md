CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-24-sm-ejs-modal-naik-kelas-unskippable.md

ISSUE: sm-ejs / GH-#111
BRANCH: fix/sm-ejs-modal-naik-kelas-unskippable

RINGKAS: Modal notif cta_required ("Saatnya naik kelas") di home masih bisa di-skip.
Perbaiki agar:
1. Modal TIDAK dismiss saat klik CTA (hanya markRead + navigate). Hilang HANYA setelah
   executeGradePromotion sukses (sekali).
2. Blok navigasi total (sidebar + header + bottom bar mobile) saat modal cta_required aktif.
3. Skip modal render di halaman /naik-kelas (wizard tidak terhalang).
4. Auto-dismiss notif cta_required naik-kelas (penanda: action_url ~ /naik-kelas) setelah
   executeGradePromotion sukses.

PENANDA notif naik-kelas: display_config.dismiss === 'cta_required' && action_url includes '/naik-kelas'.
TANPA migrasi DB, tabel, atau kolom baru.

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat untuk helper logic (isPromotionCtaNotification): RED → GREEN → REFACTOR
3. UI changes (modal, nav blocking) verify manual — tidak perlu unit test
4. Jalankan test setelah task logic: npm run test:run
5. Setelah semua task: npm run type-check (0 error)
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. JANGAN buat tabel grade_promotion_pending / flag requires_local_decision (out of scope, dibuang)

REUSE (jangan bikin baru):
- useNotifications hook (src/hooks/useNotifications.ts): dismiss, markRead, allNotifications, mutate
- dismiss query (src/app/(admin)/notifikasi/actions/notifications/queries.ts)
- dismissNotification action (src/app/(admin)/notifikasi/actions/notifications/actions.ts)
- fetchMyNotifications query
- usePathname (next/navigation)
- DEFAULT_DISPLAY_CONFIG, NotificationDisplayConfig (src/types/notification.ts)

REFERENCE FILES:
- Plan: @docs/plans/2026-06-24-sm-ejs-modal-naik-kelas-unskippable.md
- Rules: @CLAUDE.md
- Modal: @src/components/layouts/BlockingNotificationModal.tsx
- Modal mount: @src/components/layouts/AdminLayoutProvider.tsx
- Nav: @src/components/layouts/AppSidebar.tsx @src/components/layouts/AppHeader.tsx @src/components/layouts/BottomNavigation.tsx
- Promotion action: @src/app/(admin)/naik-kelas/actions/promotion/actions.ts
- Wizard client: @src/app/(admin)/naik-kelas/PromotionClient.tsx
- Notif types: @src/types/notification.ts

Mulai dari Task 1.
