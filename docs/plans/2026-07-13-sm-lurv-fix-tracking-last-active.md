# Plan: Fix Tracking — last_active_at via DB Trigger

**Date**: 2026-07-13  
**Issue**: TBD (replace TBD with Beads ID after bd create)  
**GH**: TBD (replace after gh issue create)

## Problem

`getUserActivitySummary()` di `tracking/actions.ts` fetch `activity_logs` dibatasi 30 hari terakhir (line 147: `.gte('created_at', thirtyDaysAgoISO)`). User yang aktif tapi terakhir login >30 hari lalu → `last_active = null` → UI tampil **"Belum pernah aktif"** padahal dia aktif input data.

Root cause: `last_active` diambil dari `userLogs[0]?.created_at` setelah filter 30 hari — user di luar window = null.

## Solution

Tambah kolom `last_active_at TIMESTAMPTZ` di `profiles` + DB trigger yang auto-update tiap INSERT ke `activity_logs`. `getUserActivitySummary()` lalu cukup baca `profiles.last_active_at` — tidak perlu fetch `activity_logs` sama sekali untuk kolom ini.

**Egress impact**: Positif — query summary hanya fetch `profiles` (ringan), tidak fetch ribuan baris `activity_logs`.

## Files Changed

1. **DB migration** (via MCP `apply_migration`) — kolom + trigger
2. `src/app/(admin)/tracking/actions.ts` — `getUserActivitySummary()` pakai `last_active_at` dari profiles
3. `src/app/(admin)/tracking/components/UserSummaryTable.tsx` — label "Terakhir Aktif" tetap, tidak perlu ubah (data sama)

Total: 2 file kode + 1 migration. **Mode B (direct)**.

---

## Task 1: DB Migration — Kolom + Trigger

### SQL

```sql
-- 1. Tambah kolom last_active_at di profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- 2. Backfill dari activity_logs yang ada (MAX per user)
UPDATE public.profiles p
SET last_active_at = subq.max_created
FROM (
  SELECT user_id, MAX(created_at) AS max_created
  FROM public.activity_logs
  GROUP BY user_id
) subq
WHERE p.id = subq.user_id;

-- 3. Trigger function
CREATE OR REPLACE FUNCTION public.update_profile_last_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET last_active_at = NEW.created_at
  WHERE id = NEW.user_id
    AND (last_active_at IS NULL OR last_active_at < NEW.created_at);
  RETURN NEW;
END;
$$;

-- 4. Trigger
DROP TRIGGER IF EXISTS trg_activity_log_last_active ON public.activity_logs;
CREATE TRIGGER trg_activity_log_last_active
  AFTER INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_profile_last_active();
```

### Verifikasi

```sql
-- Cek kolom ada
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'last_active_at';

-- Cek backfill (beberapa row harus non-null)
SELECT id, username, last_active_at FROM profiles
WHERE last_active_at IS NOT NULL LIMIT 5;

-- Cek trigger ada
SELECT trigger_name FROM information_schema.triggers
WHERE trigger_name = 'trg_activity_log_last_active';
```

---

## Task 2: Update `getUserActivitySummary()` di actions.ts

### Sebelum (line 139–170)

```typescript
const CHUNK = 100
const recentLogs: { user_id: string; created_at: string; action: string }[] = []
for (let i = 0; i < profileIds.length; i += CHUNK) {
  const chunk = profileIds.slice(i, i + CHUNK)
  const { data, error } = await supabase
    .from('activity_logs')
    .select('user_id, created_at, action')
    .in('user_id', chunk)
    .gte('created_at', thirtyDaysAgoISO)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (data) recentLogs.push(...data)
}

const logsByUser = new Map<string, { created_at: string; action: string }[]>()
for (const log of recentLogs) {
  const list = logsByUser.get(log.user_id) ?? []
  list.push(log)
  logsByUser.set(log.user_id, list)
}

const summaries = (profiles ?? []).map((p) => {
  const userLogs = logsByUser.get(p.id) ?? []
  const recentActions = userLogs.filter((l) => l.action !== 'open_page')

  return {
    id: p.id,
    full_name: p.full_name,
    username: p.username,
    role: p.role,
    last_active: userLogs[0]?.created_at ?? null,
    total_actions_30d: recentActions.length,
  }
})
```

### Sesudah

Ubah profile query untuk include `last_active_at`, lalu untuk `total_actions_30d` tetap fetch `activity_logs` 30 hari tapi hanya `COUNT` per user (bukan full rows):

```typescript
// Ambil semua profiles dalam scope — include last_active_at
let profileQuery = supabase
  .from('profiles')
  .select('id, full_name, username, role, last_active_at')  // ← tambah last_active_at
  .neq('role', 'superadmin')

if (filter?.daerah_id) profileQuery = profileQuery.eq('daerah_id', filter.daerah_id)
if (filter?.desa_id) profileQuery = profileQuery.eq('desa_id', filter.desa_id)
if (filter?.kelompok_id) profileQuery = profileQuery.eq('kelompok_id', filter.kelompok_id)

const { data: profiles, error: profileError } = await profileQuery
if (profileError) throw profileError

const profileIds = (profiles ?? []).map((p) => p.id)

// Fetch action count 30 hari (bukan last_active — sudah dari profiles)
const CHUNK = 100
const actionCountByUser = new Map<string, number>()
for (let i = 0; i < profileIds.length; i += CHUNK) {
  const chunk = profileIds.slice(i, i + CHUNK)
  const { data, error } = await supabase
    .from('activity_logs')
    .select('user_id, action')
    .in('user_id', chunk)
    .gte('created_at', thirtyDaysAgoISO)
    .neq('action', 'open_page')
  if (error) throw error
  if (data) {
    for (const log of data) {
      actionCountByUser.set(log.user_id, (actionCountByUser.get(log.user_id) ?? 0) + 1)
    }
  }
}

const summaries = (profiles ?? []).map((p) => ({
  id: p.id,
  full_name: p.full_name,
  username: p.username,
  role: p.role,
  last_active: (p as any).last_active_at ?? null,  // dari kolom profiles, bukan activity_logs
  total_actions_30d: actionCountByUser.get(p.id) ?? 0,
}))
```

Hapus juga `thirtyDaysAgo` block lama dan ganti dengan tetap hanya untuk action count:

```typescript
// Hanya butuh untuk filter action count 30 hari
const thirtyDaysAgo = new Date()
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()
```

### Verifikasi

Setelah implement, cek di UI:
- User yang terakhir aktif >30 hari tidak lagi tampil "Belum pernah aktif"
- User yang belum pernah akses app sama sekali tetap tampil "Belum pernah aktif"
- Kolom "Aksi 30 Hari" tetap menghitung aksi 30 hari terakhir dengan benar

---

## TDD Notes

Fitur ini murni data plumbing (DB trigger + query change), bukan business logic baru. TDD formal (unit test) skip — tidak ada logic yang bisa diuji tanpa DB. Verifikasi via MCP SQL query setelah migration + visual check di UI.

---

## Commit Message Template

```
fix(tracking): akurasi last_active via kolom profiles + DB trigger

- Tambah last_active_at di profiles, backfill dari activity_logs
- Trigger auto-update last_active_at tiap INSERT activity_logs
- getUserActivitySummary() baca last_active dari profiles (bukan
  filter 30 hari activity_logs) — user aktif >30 hari tidak lagi
  tampil "Belum pernah aktif"
- action count 30 hari tetap dari activity_logs (hanya fetch action+user_id)

fixes #TBD

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check

- [ ] Pattern baru: `profiles.last_active_at` sebagai kolom denormalisasi dari `activity_logs` → perlu ditambahkan ke Key Tables di CLAUDE.md (`profiles` entry)
- [ ] Trigger DB baru: `trg_activity_log_last_active` — dokumentasi di `docs/claude/database-operations.md` jika ada seksi triggers
- [ ] Tidak ada route/page baru
- [ ] Tidak ada permission pattern baru
