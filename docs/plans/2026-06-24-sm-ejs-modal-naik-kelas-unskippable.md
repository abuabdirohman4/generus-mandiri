# Plan — sm-ejs — Modal Naik Kelas Tidak Bisa Di-Skip (CTA-required blocking)

**Issue:** sm-ejs · feat: pending naik kelas actionable per kelompok (RE-SCOPED)
**Date:** 2026-06-24
**Supersedes:** docs/plans/2026-06-23-sm-ejs-pending-naik-kelas-actionable.md (konsep "pending" dibuang)

---

## Context

Issue sm-ejs awalnya direncanakan sebagai sistem "pending naik kelas" (admin daerah
naikkan massal, kelompok isi keputusan Paud/Pra Nikah via tabel baru + flag + notif).
**Konsep itu DIBUANG** setelah diskusi: tiap kelompok jalankan naik kelas sendiri lewat
wizard yang sudah ada (sudah ada checkbox exclude untuk pilih siapa naik/tidak), jadi
tidak perlu pending sama sekali.

Kebutuhan sebenarnya: **modal notifikasi `cta_required` di home masih bisa di-skip.**
Admin kirim notif `cta_required` ("Saatnya naik kelas") ke kelompok. Modal blocking
muncul (`BlockingNotificationModal`), tapi:

1. **Bug skip:** `handleCta` langsung panggil `dismiss()` saat user klik tombol CTA →
   notif hilang permanen walau user batal di wizard / tidak menyelesaikan naik kelas.
2. **Navigasi tidak terblok:** modal muncul tapi sidebar, header, dan bottom bar mobile
   tetap klikable → user bisa kabur ke halaman lain tanpa menyelesaikan task.

**Outcome:**
- Modal `cta_required` naik-kelas baru hilang **setelah `executeGradePromotion` sukses**
  (sekali) di tahun ajaran aktif — bukan saat klik CTA.
- Selama modal aktif: sidebar, header, bottom bar mobile **terblok total**. Satu-satunya
  aksi = klik CTA ke `/naik-kelas`.
- Di halaman `/naik-kelas` modal **tidak muncul** (tidak menghalangi wizard).

---

## Identifikasi "notif naik-kelas"

Notif generic (sm-69c) tidak punya field khusus naik-kelas. Penanda: notif dengan
`display_config.dismiss === 'cta_required'` **dan** `action_url` mengandung `/naik-kelas`.
Tidak perlu migrasi / kolom baru / tabel baru.

"Selesai" = minimal 1 kali `executeGradePromotion` sukses. Tidak perlu tracking per kelas.

---

## Files & Changes

### 1. src/components/layouts/BlockingNotificationModal.tsx
- **handleCta**: HAPUS `dismiss(notif.id)`. Hanya `markRead` + `router.push(action_url)`.
  Notif tetap undismissed → modal muncul lagi sampai promotion selesai.
- **Path guard**: import `usePathname`. Jika `pathname.startsWith('/naik-kelas')`,
  JANGAN render modal (`return null`). Supaya wizard tidak terhalang.

### 2. Blok navigasi global saat modal cta_required aktif
- Modal sudah `fixed inset-0 z-99999` + backdrop `bg-black/50`. Cek z-index aktual
  AppSidebar / AppHeader / BottomNavigation.
- **Opsi A (default):** pastikan modal z-index menang atas ketiga nav → backdrop
  menutupi & memblok klik. Jika ada nav ber-z-index >= modal, naikkan modal.
- **Opsi B (fallback):** store/flag `useBlockingModalActive()` → ketiga nav baca flag →
  `pointer-events-none` + dim saat aktif.
- Bottom bar mobile (BottomNavigation.tsx) WAJIB ikut terblok.

### 3. Auto-dismiss setelah promotion sukses
- Server action `dismissPromotionCtaNotifications()` di
  notifikasi/actions/notifications/actions.ts: ambil notif user via `fetchMyNotifications`,
  filter `dismiss==='cta_required'` & `action_url` ~ `/naik-kelas` & belum dismissed →
  panggil `dismiss` query existing.
- Wire ke `executeGradePromotion` (naik-kelas/actions/promotion/actions.ts): setelah loop,
  jika `result.success.length > 0` → await `dismissPromotionCtaNotifications()` sebelum
  revalidatePath.
- Client: setelah submit sukses di PromotionClient.tsx → panggil `mutate()` dari
  useNotifications agar modal hilang tanpa reload.

---

## Reuse
- useNotifications (src/hooks/useNotifications.ts) — dismiss, markRead, allNotifications, mutate
- dismiss query (notifikasi/actions/notifications/queries.ts)
- dismissNotification action (notifikasi/actions/notifications/actions.ts)
- fetchMyNotifications query
- usePathname (next/navigation)
- DEFAULT_DISPLAY_CONFIG, NotificationDisplayConfig (src/types/notification.ts)

---

## Tasks (TDD untuk logic, manual untuk UI)

1. **Helper logic (TDD):** `isPromotionCtaNotification(notif)` →
   cta_required && action_url includes /naik-kelas. RED → GREEN.
2. **Modal:** hapus dismiss di handleCta + path guard /naik-kelas.
3. **Blok navigasi:** sidebar + header + bottom bar (verifikasi z-index aktual).
4. **Auto-dismiss:** server action + hook ke executeGradePromotion + client mutate().
5. **Verify manual end-to-end** + `npm run type-check`.

---

## Verify end-to-end
1. Admin kirim notif cta_required, action_url=/naik-kelas, target kelompok X.
2. User kelompok X login → modal blocking di home. Klik sidebar/header/bottom-bar → terblok.
   Klik CTA → ke /naik-kelas, modal tidak menghalangi.
3. Reload tanpa naik kelas → modal muncul lagi (tidak ter-skip).
4. Jalankan wizard → submit sukses → modal hilang, tidak muncul lagi di reload.
5. npm run type-check 0 error.

---

## Out of scope
- Konsep "pending" lama (tabel grade_promotion_pending, flag requires_local_decision) — DIBUANG.
- Tracking per-kelas "semua kelas wajib naik". Cukup 1x sukses.

## CLAUDE.md Check
- [ ] Pola "modal cta_required unskippable + auto-dismiss by action_url" → dokumentasikan
      singkat di docs notif jika dianggap pattern berulang.
- [ ] Tidak ada tabel/route/permission baru → tidak perlu update Key Tables / App Router.

## Commit message template
```
fix(frontend): make cta_required naik-kelas modal unskippable until promotion done

- Stop dismissing cta_required modal on CTA click (only mark read + navigate)
- Block sidebar/header/bottom-bar navigation while cta_required modal active
- Skip modal render on /naik-kelas so wizard is reachable
- Auto-dismiss promotion cta notif after executeGradePromotion succeeds

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
