# sm-69c — In-App Broadcast / Notifikasi by Scope

## Context

Broadcast WA dari daerah sering mandek di level desa — tidak diteruskan ke kelompok/guru. Solusi: superadmin/admin daerah kirim notifikasi in-app yang **langsung sampai** ke akun penerima per org scope. Fondasi reusable untuk fitur lain (mis. pending naik kelas `sm-ejs`).

Saat ini `NotificationDropdown.tsx` + `NotificationBadge.tsx` hanya **dummy template** (data hardcoded "Terry Franci"). Tidak ada tabel `notifications`, tidak ada halaman `/notifikasi`. Plan ini bangun fitur nyata dari nol.

## Decisions (locked dengan user)

| Axis | Keputusan |
|---|---|
| **Sender** | Superadmin + Admin Daerah saja (extensible, role lain menyusul) |
| **Targeting** | Per org scope (daerah/desa/kelompok) **+** filter by role (opsional) |
| **Storage** | Fan-out junction: `notifications` + `notification_recipients` (1 row/user) |
| **Delivery** | **MVP: SWR polling** (~60dtk + on-focus). Realtime = fase 2 terpisah |
| **Display** | Bell badge + dropdown + halaman `/notifikasi` + mark-read + **banner dismissable**. Hard-block modal **defer** → catat di `sm-ejs` |

---

## 1. Database (migration via MCP `apply_migration`)

> Project tidak punya `supabase/migrations/` — pakai `mcp__generus-mandiri-v2__apply_migration`.

```sql
-- notifications: 1 row per broadcast
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  type text not null default 'broadcast',          -- extensible: broadcast|system|...
  target_scope jsonb not null,                       -- {daerah_id?,desa_id?,kelompok_id?,roles?:string[]}
  sender_id uuid not null references public.profiles(id),
  sender_daerah_id uuid, sender_desa_id uuid, sender_kelompok_id uuid,  -- audit snapshot
  created_at timestamptz not null default now()
);

-- notification_recipients: fan-out, 1 row per penerima
create table public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  is_read boolean not null default false,
  read_at timestamptz,
  is_dismissed boolean not null default false,       -- untuk banner dismiss
  created_at timestamptz not null default now(),
  unique (notification_id, recipient_id)
);
create index idx_notif_recip_unread on public.notification_recipients (recipient_id, is_read);
create index idx_notif_recip_dismiss on public.notification_recipients (recipient_id, is_dismissed);

alter table public.notifications enable row level security;
alter table public.notification_recipients enable row level security;
```

**RLS policies** (defense-in-depth; insert tetap via `createAdminClient` di server action):
- `notification_recipients`: SELECT/UPDATE row milik sendiri (`recipient_id = auth.uid()`). UPDATE dibatasi kolom `is_read/read_at/is_dismissed`.
- `notifications`: SELECT bila ada recipient row milik `auth.uid()` untuk notif itu.

**Fase 2 (realtime, issue terpisah):** `alter publication supabase_realtime add table public.notification_recipients;` — JANGAN di MVP.

---

## 2. Types — `src/types/notification.ts` (baru)

Ikuti hierarki Base→Extended→Full (lihat `architecture-patterns.md`):

```ts
export interface NotificationTargetScope {
  daerah_id?: string | null
  desa_id?: string | null
  kelompok_id?: string | null
  roles?: string[]                // kosong/undefined = semua role dalam scope
}
export interface NotificationBase { id: string; title: string; body: string; type: string; created_at: string }
export interface Notification extends NotificationBase { target_scope: NotificationTargetScope; sender_id: string }
// row gabungan untuk UI penerima (join recipients)
export interface NotificationWithStatus extends NotificationBase {
  is_read: boolean; read_at: string | null; is_dismissed: boolean; sender_name?: string
}
export interface SendNotificationInput { title: string; body: string; target: NotificationTargetScope }
```

---

## 3. Server Actions — 3-layer di `src/app/(admin)/notifikasi/actions/notifications/`

Ikuti pola sm-d15 (queries/logic/actions terpisah + `__tests__/`). Re-export via `actions/index.ts`.

**`logic.ts`** (pure, TDD penuh):
- `validateNotificationInput(input)` → reject title/body kosong, body terlalu panjang.
- `resolveTargetScopeForSender(profile, target)` → **enforce**: admin daerah dipaksa ke `daerah_id` miliknya (tolak target lintas-daerah); superadmin bebas. Return scope ter-normalisasi atau error.
- `buildRecipientProfileFilter(scope)` → tentukan kolom filter (`kelompok_id` / `desa_id` / `daerah_id`) + role filter.

**`queries.ts`** (terima `supabase` param, no `'use server'`):
- `fetchRecipientProfileIds(supabase, scope)` — resolve daftar `profiles.id`. **Reuse pola** `resolveKelompokIdsInScope` di `naik-kelas/actions/classes/queries.ts:27` untuk turunkan kelompok→desa→daerah. Query `profiles` by org column + `role in (...)` bila ada.
- `insertNotification(supabase, row)`, `insertRecipients(supabase, rows[])` (bulk).
- `fetchMyNotifications(supabase, userId, {limit,onlyUnread})`, `countUnread(supabase, userId)`.
- `markRead(supabase, userId, ids[])`, `markAllRead(supabase, userId)`, `dismiss(supabase, userId, id)`.

**`actions.ts`** (`'use server'`, return `{success,data,message}`):
- `sendNotification(input)` — auth → `canSendNotification(profile)` gate → `validateNotificationInput` → `resolveTargetScopeForSender` → `createAdminClient` → `fetchRecipientProfileIds` (exclude sender) → `insertNotification` → `insertRecipients` → `logActivity(...)` → `revalidatePath('/notifikasi')`.
- `getMyNotifications(opts)`, `getUnreadCount()`, `markNotificationRead(ids)`, `markAllNotificationsRead()`, `dismissNotification(id)`.

---

## 4. Access control — `src/lib/accessControl.ts`

Tambah helper:
```ts
export function canSendNotification(profile: UserProfile): boolean {
  return isSuperAdmin(profile) || isAdminDaerah(profile)   // existing helpers di file ini
}
```
Re-export lewat `accessControlServer.ts` untuk pemakaian server.

---

## 5. Client hook — `src/hooks/useNotifications.ts` (baru)

Pola sama `usePromotionEnabled.ts`. SWR polling:
```ts
useSWR('notifications:list', () => getMyNotifications(...), { refreshInterval: 60000, revalidateOnFocus: true })
useSWR('notifications:unread', () => getUnreadCount(), { refreshInterval: 60000, revalidateOnFocus: true })
```
Expose `notifications`, `unreadCount`, `markRead`, `markAllRead`, `dismiss`, `mutate`.

---

## 6. UI

**a. `NotificationBell` + dropdown** — rewrite `header/NotificationDropdown.tsx` (buang dummy `notificationData`). Tampilkan unread count dari `useNotifications`, list ringkas terbaru, link "Lihat semua" → `/notifikasi`. Enable kembali di `AppHeader.tsx` `ApplicationMenu` (saat ini di-comment, baris ~200). Badge transfer lama (`NotificationBadge.tsx`) **dibiarkan terpisah** (urusan beda: pending transfer).

**b. Halaman `/notifikasi`** — `src/app/(admin)/notifikasi/page.tsx`: list penuh + "Tandai semua dibaca". Klik item → mark read. Tombol **"Kirim Notifikasi"** muncul hanya bila `canSendNotification` → buka form.

**c. Form kirim** (komponen di `notifikasi/components/`): `title`, `body`, target scope picker + role. **WAJIB pakai komponen existing** (jangan raw HTML): `InputFilter` (dropdown desa/kelompok), `MultiSelectCheckbox` (role), `Button`. Admin daerah: scope terkunci ke daerahnya (pilih desa/kelompok di dalamnya). Superadmin: bisa pilih daerah juga.

**d. Banner dismissable** — `components/layouts/NotificationBanner.tsx`: tampil notif terbaru yang `!is_dismissed`, tombol X → `dismissNotification`. Render di `AdminLayout` (`src/app/(admin)/layout.tsx`) di atas `{children}`.

---

## 7. Navigasi — WAJIB update 3 tempat (memory `new-page-checklist`)

Route `/notifikasi` baru → update:
1. `AppSidebar.tsx` `allNavItems[]` (+ icon).
2. `home/components/QuickActions.tsx` `quickActions[]`.
3. `AppHeader.tsx` `getPageTitle()` switch → `case '/notifikasi': return 'Notifikasi'`.

---

## 8. TDD (unit) + E2E

**Unit (Vitest):**
- `logic.test.ts`: `validateNotificationInput` (empty/oversize reject), `resolveTargetScopeForSender` (admin daerah dipaksa daerah sendiri, tolak lintas-daerah; superadmin bebas), `buildRecipientProfileFilter` (kombinasi scope+role).
- `queries.test.ts`: struktur dasar dgn mock supabase — `insertNotification` panggil `.from('notifications')`, `fetchRecipientProfileIds` bangun filter benar.

**E2E (Playwright) — WAJIB** karena query PostgREST + delivery cross-role tak ter-cover unit (memory `postgrest-select-not-typechecked`). Spec baru `tests/e2e/notifikasi.spec.ts`, pakai multi-role auth helpers existing (`tests/e2e/helpers/auth.ts`, `MULTI_ROLE_TESTING.md`). Jaga minimal & robust (hindari flaky — memory `e2e-flaky-tests`):
- **Happy path**: login superadmin → `/notifikasi` → kirim (target scope + role) → login penerima → badge unread naik + banner muncul + item di list → mark read → badge turun.
- **Negatif scope**: admin daerah A tidak bisa target daerah B (opsi daerah lain tak tersedia / di-reject).
- Jalankan: `npm run test:e2e`.

---

## 9. Side-task — catat di `sm-ejs`

`bd update sm-ejs --notes`: saat implement pending naik kelas, pertimbangkan **hard-block modal** (acknowledge wajib) memakai fondasi notifikasi ini — di-defer dari sm-69c MVP.

---

## 10. CLAUDE.md Check (saat implementasi selesai)

- [ ] Tabel baru `notifications`, `notification_recipients` → tambah ke **Key Tables** (CLAUDE.md §Database).
- [ ] Route baru `/notifikasi` → tambah ke **App Router Structure**.
- [ ] Pattern fan-out notifikasi + `canSendNotification` → dokumentasikan di `docs/claude/architecture-patterns.md` (§Notifikasi baru).
- [ ] Realtime fase 2 → catat sebagai issue follow-up.

---

## Verification

1. `mcp apply_migration` → cek `list_tables` muncul 2 tabel + RLS on.
2. `npm run test:run` (logic + queries hijau) → `npm run type-check`.
3. `npm run test:e2e` → `notifikasi.spec.ts` hijau (happy path + negatif scope).
4. Manual: login **superadmin** → `/notifikasi` → Kirim (target desa X, role guru) → login **guru desa X** → badge naik, banner muncul, item ada di list → mark read → badge turun → dismiss banner → hilang.

---

## Post-approval workflow (project SOP — bukan bagian plan mode)

Setelah ExitPlanMode di-approve:
1. Tulis plan final ke `docs/plans/2026-06-09-sm-69c-broadcast-notifikasi.md` (mirror plan ini).
2. `bd update sm-69c --claim`.
3. `gh issue create --title "[sm-69c] feat: in-app broadcast notifikasi by scope"` (body dari plan).
4. `bd update sm-69c --notes "GH-#XX: <url>"`.
5. `bd update sm-ejs --notes "..."` (hard-block modal, §9).
6. Prompt file `docs/prompts/2026-06-09-sm-69c-broadcast-notifikasi.md`.
7. Output pilihan A/B → estimasi **≥3 file & ≥100 baris → MODE A (Antigravity)**.

## Estimasi scope
~12-15 file baru/ubah (migration, types, 3 layer + unit tests, hook, 4 komponen UI, 3 nav, layout, accessControl, **E2E spec**). >> threshold → **Mode A**.
