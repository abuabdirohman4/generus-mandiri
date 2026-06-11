# Plan: sm-5o7 — Konfigurasi tampilan notifikasi (banner/modal/dismiss/visibility)

> Epic: sm-5o7 | Sub: sm-jpc (DB+types), sm-rqr (modal), sm-rnm (form UI), sm-q3d (visibility)

## Context

Sistem notifikasi (sm-69c) sekarang hanya 1 cara tampil: banner di home + masuk inbox (dropdown/list). Sender butuh kontrol lebih: notif penting harus jadi **modal blocking** (tak bisa ditutup sampai aksi), notif sekilas tak perlu nyangkut di inbox. Fitur ini beri sender kontrol penuh CARA notif tampil ke penerima, via 1 kolom JSONB `notifications.display_config`.

**Keputusan desain (dikonfirmasi user):**
- **1 kolom JSONB** `display_config` (pola seperti `target_scope` existing), bukan kolom terpisah.
- **type tetap terpisah** = warna/ikon (info/success/warning). `display_config` = cara tampil. Orthogonal.
- **Realtime delivery DIBUANG** dari scope (polling 60s permanen, cukup).
- Kolom `action_url` + `action_label` SUDAH ADA (migration sm-6sw) — dipakai CTA modal.

## display_config shape

```ts
interface NotificationDisplayConfig {
  mode: 'banner' | 'modal' | 'both'        // cara tampil
  dismiss: 'free' | 'acknowledge' | 'cta_required'  // perilaku tutup (untuk modal)
  showInList: boolean                       // tampil di dropdown + list page?
}
// default (notif lama / NULL): { mode: 'banner', dismiss: 'free', showInList: true }
```

- **mode** `banner`=banner home existing · `modal`=overlay global semua route · `both`=keduanya
- **dismiss** (hanya relevan modal): `free`=X+backdrop tutup biasa · `acknowledge`=tombol "Mengerti" set is_dismissed (tak muncul lagi) · `cta_required`=TIDAK bisa tutup kecuali klik CTA action_url
- **showInList** `false`=notif tak masuk dropdown+list (interupsi sekilas saja, tak nyangkut inbox) · `true`=masuk inbox permanen

## Sub-issues & changes

### sm-jpc — DB + types (foundation, kerjakan dulu)
- **Migration** (Supabase MCP `apply_migration`): `ALTER TABLE notifications ADD COLUMN display_config jsonb DEFAULT '{"mode":"banner","dismiss":"free","showInList":true}'::jsonb`
- `src/types/notification.ts`: tambah `NotificationDisplayConfig` + field `display_config` di `NotificationBase` + `SendNotificationInput`.
- `logic.ts` (`validateNotificationInput`): validasi enum mode/dismiss + boolean showInList.
- `queries.ts`: insert `display_config` di `insertNotification`; fetch + coalesce default saat map (notif lama NULL → default).

### sm-rqr — BlockingNotificationModal (depend sm-jpc)
- Komponen baru `src/components/layouts/BlockingNotificationModal.tsx`. Render notif dgn `mode in (modal,both)` belum is_dismissed.
- Mount di `src/components/layouts/AdminLayoutProvider.tsx` (semua route admin).
- Reuse base `src/components/ui/modal/index.tsx` + **tambah prop `isBlockingModal`** → disable backdrop-click (line ~91) + Escape (line ~27) close.
- 3 perilaku dismiss sesuai config. `cta_required` → no X, no backdrop, hanya tombol CTA (navigate action_url + acknowledge).
- Antri 1 modal per waktu. Reuse `dismiss()` dari `useNotifications` untuk acknowledge.

### sm-rnm — Send form config UI (depend sm-jpc)
- `KirimBroadcastForm.tsx`: tambah UI mode (button group / InputFilter), dismiss (muncul jika mode modal/both), showInList (Checkbox), CTA field action_url+action_label (muncul jika dismiss=cta_required atau modal).
- Pakai komponen form existing (InputFilter/Checkbox/Button) — JANGAN raw HTML.
- State + pass `display_config` + action_url/label ke `sendNotification`. Reset setelah submit.
- **Catatan**: actions.ts saat ini hardcode action_url/label = null (dibuang di sm-6sw) — kembalikan ambil dari input.

### sm-q3d — Visibility filter (depend sm-jpc)
- Hormati `showInList`: notif `showInList=false` TIDAK tampil di `NotificationDropdown` + list page tab Diterima. Filter di `fetchMyNotifications` (query) atau consumer.
- `unreadCount` badge: notif `showInList=false` TIDAK ikut hitung (tampil via banner/modal, bukan inbox).
- `NotificationBanner`: tetap tampilkan notif `mode in (banner,both)` terlepas showInList.

## Verification (E2E manual + smoke)
- Kirim notif mode=modal dismiss=cta_required + action_url → muncul modal global semua halaman, X+backdrop+Escape tak menutup, hanya CTA → navigate + tak muncul lagi.
- mode=modal dismiss=acknowledge → tombol "Mengerti" → tutup, tak muncul lagi (is_dismissed DB).
- mode=banner → seperti existing (banner home), tak ada modal.
- mode=both → banner + modal.
- showInList=false → tak muncul di dropdown/list, badge tak naik. showInList=true → masuk inbox.
- Notif LAMA (display_config NULL) → tetap tampil sbg banner (default), tak rusak.
- type-check + build (user run). E2E reproduksi untuk dismiss logic (TDD — business logic kritis).

## Roles (SOP project)
Claude Code = plan+issue+review · Antigravity = TDD+implementasi (≥3 file) · User = git.
