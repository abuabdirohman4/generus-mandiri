# Plan: sm-4ygf — Superadmin Notif History (all senders) + Multi-Daerah Picker

GH Issue: #106 · Beads: sm-4ygf

## Context

Dua peningkatan fitur notifikasi untuk superadmin:

1. **Riwayat semua broadcast** — Sekarang `fetchSentNotifications` hard-filter `.eq('sender_id', senderId)`, jadi superadmin cuma lihat kiriman SENDIRI. Ubah: superadmin lihat/edit/hapus SEMUA broadcast (termasuk kiriman admin daerah), dengan kolom nama pengirim. Admin daerah tetap cuma lihat kirimannya sendiri.
2. **Multi-daerah picker** — Sekarang scope `daerah` cuma single (`.eq('daerah_id', x)`); `all` = semua daerah. Tambah: superadmin bisa pilih BEBERAPA daerah (multi-select) → `.in('daerah_id', [...])`.

**Out of scope (DB-only, bukan kode):** Ganti nama pengirim "Super Admin" yang muncul ke penerima = `UPDATE profiles SET full_name='...' WHERE role='superadmin'`. Sumbernya `profiles.full_name`, bukan literal kode. Dilakukan terpisah oleh user.

## Critical Files

| File | Perubahan |
|---|---|
| `src/types/notification.ts` | `daerah_ids?: string[]` di scope; `sender_name?: string` di NotificationSentSummary |
| `src/app/(admin)/notifikasi/actions/notifications/queries.ts` | param `isSuperadmin` di fetchSent/update/delete/fetchRecipients; `daerah_ids` di fetchRecipientProfileIds |
| `src/app/(admin)/notifikasi/actions/notifications/logic.ts` | validate `daerah_ids` |
| `src/app/(admin)/notifikasi/actions/notifications/actions.ts` | pass `isSuperAdmin(profile)` ke query history/edit/delete |
| `src/app/(admin)/notifikasi/components/KirimBroadcastForm.tsx` | scope=daerah superadmin → MultiSelectCheckbox; handleSubmit set daerah_ids |
| `src/app/(admin)/notifikasi/page.tsx` | render `sent.sender_name` di metadata riwayat |
| `src/app/(admin)/notifikasi/actions/notifications/__tests__/logic.test.ts` | test daerah_ids validate + resolve |
| `src/app/(admin)/notifikasi/actions/notifications/__tests__/queries.test.ts` | test (jika ada infra) — opsional |

---

## TASK 1 — Types

### 1a. NotificationTargetScope — tambah `daerah_ids`

File: `src/types/notification.ts`

```ts
export interface NotificationTargetScope {
  daerah_id?: string | null
  daerah_ids?: string[]      // ← NEW: superadmin multi-daerah; if set, takes priority over daerah_id
  desa_id?: string | null
  kelompok_id?: string | null
  roles?: string[]
  recipient_ids?: string[]
}
```

### 1b. NotificationSentSummary — tambah `sender_name`

```ts
export interface NotificationSentSummary {
  id: string
  title: string
  body: string
  type: string
  created_at: string
  edited_at: string | null
  recipient_count: number
  read_count: number
  dismissed_count: number
  display_config?: NotificationDisplayConfig | null
  sender_name?: string       // ← NEW: only populated for superadmin view (others see own only)
}
```

---

## TASK 2 — Logic validation (TDD)

File: `src/app/(admin)/notifikasi/actions/notifications/logic.ts`

### RED — tambah test di `__tests__/logic.test.ts`

```ts
describe('validateNotificationInput — daerah_ids', () => {
  const base = { title: 'T', body: 'B' }
  it('accepts valid daerah_ids array', () => {
    const r = validateNotificationInput({ ...base, target: { daerah_ids: ['d1', 'd2'] } } as any)
    expect(r.ok).toBe(true)
  })
  it('rejects empty daerah_ids array', () => {
    const r = validateNotificationInput({ ...base, target: { daerah_ids: [] } } as any)
    expect(r.ok).toBe(false)
  })
  it('rejects daerah_ids with empty string', () => {
    const r = validateNotificationInput({ ...base, target: { daerah_ids: ['d1', ''] } } as any)
    expect(r.ok).toBe(false)
  })
})
```

Run: `npm run test:run -- logic.test` → 3 new FAIL.

### GREEN — validateNotificationInput

Sisipkan SETELAH blok `recipient_ids` validation (sebelum `if (input.display_config)`):

```ts
  if (input.target.daerah_ids !== undefined) {
    if (!Array.isArray(input.target.daerah_ids) || input.target.daerah_ids.length === 0) {
      return { ok: false, error: 'Pilih minimal 1 daerah' }
    }
    if (input.target.daerah_ids.some(id => typeof id !== 'string' || !id)) {
      return { ok: false, error: 'ID daerah tidak valid' }
    }
  }
```

`resolveTargetScopeForSender`: superadmin sudah `return { ok: true, scope: target }` (pass-through) → `daerah_ids` lewat tanpa perubahan. Admin daerah tak boleh pakai daerah_ids (mereka single daerah sendiri) — tidak perlu blokir eksplisit karena form tak mengirimnya; tapi defense: di actions guard sudah ada cek personal, daerah_ids untuk admin daerah akan resolve ke daerah lain → security. Tambah guard di Task 4.

Run → PASS.

---

## TASK 3 — Query: recipient resolution untuk daerah_ids

File: `queries.ts`, fungsi `fetchRecipientProfileIds`.

Sisipkan cek `daerah_ids` SEBELUM `if (scope.kelompok_id)` block (prioritas: recipient_ids → daerah_ids → kelompok → desa → daerah → all):

```ts
  // Personal: recipient_ids provided directly, skip org resolve
  if (scope.recipient_ids?.length) {
    const ids = scope.recipient_ids
    if (excludeUserId) return ids.filter((id: string) => id !== excludeUserId)
    return ids
  }

  let query = supabase.from('profiles').select('id')

  // Multi-daerah (superadmin)
  if (scope.daerah_ids?.length) {
    query = query.in('daerah_id', scope.daerah_ids)
  } else if (scope.kelompok_id) {
    query = query.eq('kelompok_id', scope.kelompok_id)
  } else if (scope.desa_id) {
    query = query.eq('desa_id', scope.desa_id)
  } else if (scope.daerah_id) {
    query = query.eq('daerah_id', scope.daerah_id)
  }
  // null/empty = all (superadmin broadcast)
```

(Sisanya — role filter, map — tidak berubah.)

---

## TASK 4 — Query: superadmin bypass ownership (history/edit/delete/recipients)

File: `queries.ts`.

### 4a. fetchSentNotifications — param isSuperadmin + join sender name

```ts
export async function fetchSentNotifications(
  supabase: SupabaseClient,
  senderId: string,
  limit = 20,
  isSuperadmin = false        // ← NEW
): Promise<NotificationSentSummary[]> {
  let query = supabase
    .from('notifications')
    .select('id, title, body, type, created_at, edited_at, display_config, sender:sender_id(full_name), notification_recipients(is_read, is_dismissed)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!isSuperadmin) {
    query = query.eq('sender_id', senderId)
  }

  const { data, error } = await query
  if (error || !data) return []

  return data.map((row: any) => {
    const recipients: { is_read: boolean; is_dismissed: boolean }[] = row.notification_recipients ?? []
    return {
      id: row.id,
      title: row.title,
      body: row.body,
      type: row.type ?? 'info',
      created_at: row.created_at,
      edited_at: row.edited_at ?? null,
      recipient_count: recipients.length,
      read_count: recipients.filter(r => r.is_read).length,
      dismissed_count: recipients.filter(r => r.is_dismissed).length,
      display_config: (row.display_config as NotificationDisplayConfig | null) ?? DEFAULT_DISPLAY_CONFIG,
      sender_name: isSuperadmin ? (row.sender?.full_name ?? undefined) : undefined,   // ← only superadmin needs it
    }
  })
}
```

NOTE PostgREST: `sender:sender_id(full_name)` bisa ter-infer sebagai array. Jika `row.sender` array → pakai `Array.isArray(row.sender) ? row.sender[0]?.full_name : row.sender?.full_name`. Tulis defensif:
```ts
const senderName = Array.isArray(row.sender) ? row.sender[0]?.full_name : row.sender?.full_name
...
sender_name: isSuperadmin ? (senderName ?? undefined) : undefined,
```

### 4b. fetchNotificationRecipients — param isSuperadmin

```ts
export async function fetchNotificationRecipients(
  supabase: SupabaseClient,
  notificationId: string,
  senderId: string,
  isSuperadmin = false        // ← NEW
): Promise<NotificationRecipientStatus[]> {
  let ownership = supabase.from('notifications').select('id').eq('id', notificationId)
  if (!isSuperadmin) ownership = ownership.eq('sender_id', senderId)
  const { data: notif } = await ownership.single()
  if (!notif) return []
  // ... rest unchanged
}
```

### 4c. deleteNotification — param isSuperadmin

```ts
export async function deleteNotification(supabase: SupabaseClient, notificationId: string, senderId: string, isSuperadmin = false) {
  let q = supabase.from('notifications').delete().eq('id', notificationId)
  if (!isSuperadmin) q = q.eq('sender_id', senderId)
  return await q
}
```

### 4d. updateNotification — param isSuperadmin

```ts
export async function updateNotification(
  supabase: SupabaseClient,
  notificationId: string,
  senderId: string,
  input: UpdateNotificationInput,
  isSuperadmin = false        // ← NEW
) {
  let q = supabase.from('notifications').update({
    title: input.title.trim(),
    body: input.body.trim(),
    type: input.type ?? 'info',
    edited_at: new Date().toISOString(),
  }).eq('id', notificationId)
  if (!isSuperadmin) q = q.eq('sender_id', senderId)
  return await q.select().single()
}
```

---

## TASK 5 — Actions: pass isSuperAdmin

File: `actions.ts`. Import `isSuperAdmin` dari `@/lib/accessControl` (cek import existing; KirimBroadcastForm import dari sana).

### 5a. getSentNotifications
```ts
    const sent = await fetchSentNotifications(adminClient, profile.id, opts.limit ?? 20, isSuperAdmin(profile))
```

### 5b. getNotificationRecipients
```ts
    const recipients = await fetchNotificationRecipients(adminClient, notificationId, profile.id, isSuperAdmin(profile))
```

### 5c. deleteNotification action (cari wrapper-nya di actions.ts) — pass `isSuperAdmin(profile)`
### 5d. updateNotification action (cari wrapper) — pass `isSuperAdmin(profile)`

> Cari nama wrapper action delete/update di actions.ts (mungkin `deleteNotification`/`updateNotification` re-export). Tambah arg isSuperadmin di pemanggilan query.

### 5e. Security guard daerah_ids untuk non-superadmin (sendNotification)
Tambah SETELAH guard recipient_ids existing:
```ts
    // Security: only superadmin may target multiple daerah
    if (input.target.daerah_ids?.length && profile.role !== 'superadmin') {
      return { success: false, message: 'Tidak memiliki izin memilih banyak daerah' }
    }
```

---

## TASK 6 — Form: multi-daerah picker (superadmin)

File: `KirimBroadcastForm.tsx`.

### 6a. State multi-daerah
Tambah dekat `selectedDaerah`:
```ts
const [selectedDaerahIds, setSelectedDaerahIds] = useState<string[]>([])
```

### 6b. handleSubmit — scope daerah superadmin → daerah_ids
Ganti blok `else if (scope === 'daerah')`:
```ts
    } else if (scope === 'daerah') {
      if (isSA) {
        if (selectedDaerahIds.length === 0) { setFeedback({ type: 'error', message: 'Pilih minimal 1 daerah.' }); return }
        target.daerah_ids = selectedDaerahIds
      } else {
        const daerahId = profile?.daerah_id
        if (!daerahId) { setFeedback({ type: 'error', message: 'Pilih daerah terlebih dahulu.' }); return }
        target.daerah_id = daerahId
      }
    }
```

### 6c. UI — scope=daerah superadmin pakai MultiSelectCheckbox
Ganti blok render daerah single dropdown (sekitar `{isSA && scope !== 'all' && scope !== 'personal' && (...)}`).
- Untuk scope `daerah`: render `MultiSelectCheckbox` (opsi = daerahList) → `selectedDaerahIds`.
- Untuk scope `desa`/`kelompok`: TETAP single dropdown `selectedDaerah` (karena desa/kelompok butuh 1 daerah induk).

Pisah kondisi:
```tsx
{isSA && scope === 'daerah' && (
  <div>
    <Label>Pilih Daerah</Label>
    <MultiSelectCheckbox
      options={daerahList.map(d => ({ value: d.id, label: d.name }))}
      selected={selectedDaerahIds}
      onChange={setSelectedDaerahIds}
    />
  </div>
)}
{isSA && (scope === 'desa' || scope === 'kelompok') && (
  // existing single daerah dropdown (selectedDaerah) — unchanged
)}
```
> Cek API `MultiSelectCheckbox` (props `options`/`selected`/`onChange` vs lain) sebelum tulis — sudah dipakai untuk roles di form ini (lihat baris ~516). Pakai pola yang sama persis dengan roles picker.

### 6d. Reset selectedDaerahIds saat scope berubah
Di useEffect reset (yang reset dependent fields saat scope change), tambah `setSelectedDaerahIds([])`.

---

## TASK 7 — Page UI: tampilkan sender_name di riwayat

File: `page.tsx`, blok metadata riwayat (sekitar baris 432 `<span>Terkirim {sent.recipient_count}</span>`).

Tambah di awal metadata row (hanya tampil bila ada — yaitu superadmin):
```tsx
{sent.sender_name && (
  <>
    <span className="text-gray-600 dark:text-gray-300">{sent.sender_name}</span>
    <span aria-hidden="true">·</span>
  </>
)}
<span>Terkirim {sent.recipient_count}</span>
```

---

## TASK 8 — Verifikasi

1. `npm run test:run -- logic.test` → semua PASS (termasuk daerah_ids baru)
2. `npm run type-check` → no error
3. Manual:
   - Login superadmin → tab Riwayat → tampil broadcast dari admin daerah lain + nama pengirimnya
   - Superadmin edit/hapus broadcast admin daerah → berhasil
   - Login admin daerah → tab Riwayat → cuma broadcast sendiri (regression: tidak bocor)
   - Superadmin kirim, scope=Daerah → muncul checklist multi-daerah → pilih 2 daerah → kirim → cuma user di 2 daerah itu yang dapat
   - Admin daerah: tidak ada opsi multi-daerah (tetap daerah sendiri)
4. Security: admin daerah craft request `daerah_ids` lewat → ditolak "Tidak memiliki izin memilih banyak daerah"

---

## CLAUDE.md Check
- [ ] Pattern baru? `daerah_ids` multi-org targeting — pola kecil, mirip recipient_ids existing. Tidak perlu dokumentasi baru.
- [ ] Tabel DB baru? Tidak.
- [ ] Route/page baru? Tidak.
- [ ] Permission pattern baru? Superadmin bypass-ownership di history — konsisten dengan pola superadmin "see all" di fitur lain. Tidak perlu doc baru.
- [ ] Nama pengirim: dokumentasikan di catatan rilis bahwa `full_name` = display name notif (agar tim tahu sumbernya DB, bukan kode).
