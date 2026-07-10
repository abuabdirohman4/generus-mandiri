---
name: egress-analysis
description: Analyze Supabase egress for the Generus Mandiri project — which users, which pages, and which queries are burning bandwidth. Use whenever the user shares an egress dashboard screenshot, asks "kenapa egress naik", "siapa yang pakai banyak", "biang kerok egress apa", "query mana yang boros", worries about the 5GB Free-tier limit, or wants a daily activity breakdown per user/page. Also trigger for "cek aktivitas hari ini", "user mana yang aktif", or any question correlating Supabase usage to app pages. Produces a diagnosis (who + what page + which query) and appends a dated snapshot to docs/claude/egress-register.md.
---

# Egress Analysis (Generus Mandiri)

Supabase Free tier bills **5GB egress/month**, cycle **07 → 07**. Egress = PostgREST payload bytes × frequency, NOT DB size. This skill diagnoses an egress spike: **who** used the app, **which pages** they hit, and **which query** produced the bytes — then records it.

Before starting, skim [`docs/claude/egress-register.md`](../../docs/claude/egress-register.md) for the known problem/fix table and past snapshots, and [`docs/claude/egress-cost-optimization.md`](../../docs/claude/egress-cost-optimization.md) for the fix rules. Don't re-diagnose an already-registered problem — build on it.

## The two data sources (do not confuse them)

This is the single most important thing to get right. There are two sources and they answer different questions. Mixing them up leads to wrong conclusions (e.g. claiming a user "opened /organisasi" when they didn't).

| Question | Source | How |
|----------|--------|-----|
| **Which page / which user** | `activity_logs.page_path` | SQL via MCP `execute_sql` (see queries below) |
| **Which query / how much payload** | Supabase `api` logs | MCP `get_logs` service `api` (raw REST URLs) |
| **How many GB total** | Egress dashboard | User's screenshot (you can't query it) |

**Critical rules learned the hard way:**
- The page a user opened lives in the **`page_path` column** of `activity_logs`, NOT in `metadata` (metadata is `{}`). Querying `metadata->>'page'` returns null and looks like "tracking is broken" — it isn't.
- **Never infer the page from an api-log query signature.** Shared components (the DataFilter org-picker) fire `daerah/desa/kelompok?...count` queries from many pages. Seeing those in api-logs does NOT mean the user opened `/organisasi`. Cross-check `page_path` before naming a page. (See memory `api-logs-vs-tracking-page-path`.)
- `get_logs` returns only the **last ~100 entries project-wide**, not time-ranged — good for "what just happened", useless for "what happened at 2pm". For historical windows, rely on `activity_logs` (permanent).
- Dashboard buckets days by **UTC**; WIB = UTC+7. A "10 Jul" bar covers 10 Jul 00:00–24:00 UTC.

## Workflow

### 1. Check MCP connection
Run `mcp__generus-mandiri-v2__list_tables` first (per CLAUDE.md rule). If it fails, tell the user MCP isn't connected and stop.

### 2. Read the dashboard number from the user
If they shared a screenshot, note: total GB used, % of 5GB, day of cycle, and the per-source split (PostgREST / Auth / Realtime %). PostgREST should dominate — that's normal (it's row data). If Auth or Realtime is unusually high (>10%), that's a separate lead.

### 3. Per-user + per-page breakdown for the day
Run this (adjust the UTC date). This is the backbone of the analysis:

```sql
select
  al.user_id, p.full_name, p.username, p.role,
  count(*) as total_events,
  count(*) filter (where al.page_path like '/users/siswa/%/presensi') as detail_presensi,
  count(*) filter (where al.page_path like '/users/siswa/%/biodata')  as biodata,
  count(*) filter (where al.page_path = '/laporan')                    as laporan,
  count(*) filter (where al.page_path like '/presensi%')               as presensi,
  count(*) filter (where al.page_path = '/users/siswa')                as siswa_list,
  min(al.created_at) as first_seen, max(al.created_at) as last_seen
from activity_logs al
left join profiles p on p.id = al.user_id
where al.created_at >= 'YYYY-MM-DD 00:00:00+00' and al.action = 'open_page'
group by 1,2,3,4
order by total_events desc;
```

And the day totals:

```sql
select
  count(distinct user_id) as active_users,
  count(*) filter (where action='open_page') as total_page_views,
  count(*) filter (where page_path like '/presensi%')              as presensi,
  count(*) filter (where page_path like '/users/siswa/%/presensi') as detail_presensi,
  count(*) filter (where page_path = '/laporan')                   as laporan,
  count(*) filter (where page_path = '/users/siswa')               as siswa_list,
  count(*) filter (where page_path = '/organisasi')                as organisasi
from activity_logs
where created_at >= 'YYYY-MM-DD 00:00:00+00' and action='open_page';
```

Interpret: **egress usually scales with breadth of usage, not one abuser.** Many teachers doing attendance work can add up. But watch for a single user with a high count on a *heavy per-view page* (`/laporan`, `/users/siswa/<id>/presensi`) — those are the expensive ones.

### 4. Confirm the culprit query (optional, if a spike needs pinning)
If you need to see the actual bytes-heavy query for something that *just* happened, pull api-logs and count by table:

```
mcp__generus-mandiri-v2__get_logs  service=api
```

Then (get_logs output can exceed the token limit → it saves to a file; parse it):
```bash
rtk proxy python3 -c "
import json, re, urllib.parse
d=json.load(open('<saved-file-path>'))
rows=d['result']['result']
from collections import Counter
tables=Counter(); users=Counter()
for r in rows:
    m=re.search(r'/rest/v1/(\w+)\?', r['event_message'])
    if m: tables[m.group(1)]+=1
    u=re.search(r'id=eq\.([0-9a-f-]{36})', r['event_message'])
print('tables:', tables.most_common())
"
```
Match the heavy table (usually `attendance_logs` or `students` with nested joins) back to the page from step 3. A `meetings!inner(...)` join carrying `topic`/`description`/`student_snapshot`, or `attendance_logs` fetched in many small chunks, is the classic fat pattern.

### 4b. Verifikasi hasil fix (jangan salah baca dashboard)

Tiga jebakan saat menilai "apakah fix berhasil":

1. **Jebakan UTC.** Dashboard bucket per hari **UTC**. DB `now()` juga UTC. WIB = UTC+7 → jam 00:00–06:59 WIB masih hari UTC **kemarin**. Contoh: 05:25 WIB 11 Jul = 22:25 UTC 10 Jul → bar "hari ini" di dashboard masih **10 Jul**. Cek `select now()` sebelum menyimpulkan tanggal.
2. **Bar = kode lama.** Fix yang **baru** di-push HARI INI tidak mengubah bar hari itu — traffic hari itu jalan di kode lama. Efek fix baru kelihatan di hari-hari **setelah** deploy. Jangan bilang "fix gagal, egress masih tinggi" kalau bar-nya pra-deploy.
3. **Bandingkan user-asli vs user-asli.** Hari dev-session (hot-reload + testing manual pakai akun admin scope lebar) menggelembungkan egress dan TIDAK representatif — jangan jadikan baseline. Bandingkan hari user-asli-penuh sebelum fix vs hari user-asli-penuh sesudah fix, dengan **jumlah page-view sebanding** (normalisasi: MB ÷ view, bukan MB absolut — hari sepi otomatis lebih rendah tanpa fix apa pun).

### 5. Project and diagnose
- **Daily budget:** 5GB / 30 ≈ 167MB/day average. Compare today's GB (from dashboard) against day-of-cycle.
- **Separate dev-session days** from real-user days — hot-reload + manual testing on wide-scope admin accounts inflate egress and are NOT representative (see the register's dev-session note). If the heavy day coincides with your own coding, say so.
- **Name the biggest per-view pages** hit today and check whether a fix is already in flight (register table). The right targets are the heavy-per-view pages (`/laporan`, detail-presensi), not necessarily the highest-count page.

### 6. Catat — tambahkan snapshot bertanggal ke register
Tambahkan section baru `## Snapshot Aktivitas Harian — <tanggal>` di [`docs/claude/egress-register.md`](../../docs/claude/egress-register.md) berisi: GB + % dashboard, jumlah user aktif, tabel total per-jenis-halaman, tabel user teratas, dan "baca situasi" singkat. Kalau menemukan masalah BARU (belum ada di tabel register), tambahkan baris ke Register Masalah/Fix juga, lalu buat beads issue + plan sesuai SOP execution-mode proyek (CLAUDE.md).

**Bahasa file: Indonesia.** Semua isi yang ditulis/di-generate skill ini ke file (register snapshot, plan, issue body) WAJIB bahasa Indonesia — konsisten dengan `egress-register.md`. Istilah teknis (egress, PostgREST, RPC, chunk, query, jsonb) biarkan apa adanya, jangan diterjemahkan paksa.

## Output format

Give the user, in this order:
1. **Verdict line** — is today aman or jebol-risk, one sentence with the number.
2. **Who + what** — top 3-5 users with their heaviest page, from step 3.
3. **Biang kerok** — which page/query drives the bytes, tied to a register row (existing fix or new).
4. **Projection** — MB/day rate → month, noting dev-session vs real-user.
5. **Confirm** you appended the snapshot to the register (and filed any new issue).

Be honest about uncertainty and **cross-check page_path before naming a page** — a wrong culprit sends the user fixing the wrong thing.
