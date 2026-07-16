# Plan: Public PostgREST URL + Staging Clone — prasyarat cutover Phase 2

## Context

Dua temuan saat Step 1/2 `docs/prompts/2026-07-14-sm-91yt-cutover-vm-phase2.md`, keduanya
**blocker cutover** dan belum tercakup dokumen manapun.

### Temuan 1 — `NEXT_PUBLIC_DATA_POSTGREST_URL=http://127.0.0.1:3001` rusak di produksi 🚨

`selfhost/README.md:28` dan prompt sm-91yt L164 menginstruksikan nilai
`http://127.0.0.1:3001`. **Benar di laptop, salah di server.**

`NEXT_PUBLIC_*` di-inline ke bundle browser saat build. Browser user membaca
`http://127.0.0.1:3001` sebagai **mesin user sendiri**, bukan VM → connection refused.
Di laptop dev tidak ketahuan karena browser & PostgREST kebetulan satu mesin.

Terkonfirmasi terpakai — **7 file `'use client'`** memanggil `createClient()` dari
`@/lib/supabase/client`:

| File | Dampak kalau flip sesuai dokumen lama |
|---|---|
| `src/app/(admin)/laporan/page.tsx` | Laporan mati (justru halaman biang HeadersOverflow) |
| `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx` | Rapot detail mati |
| `src/app/(admin)/rapot/settings/components/SettingsPageClient.tsx` | Settings rapot mati |
| `src/stores/usePresenceStore.ts` | Presence store mati |
| `src/components/layouts/AdminLayoutProvider.tsx` | Layout admin mati |
| `src/lib/userUtils.ts`, `src/hooks/useAttendanceRealtimeCloud.ts` | ikut |

Sisi server (`src/lib/supabase/server.ts:11`) baca `DATA_POSTGREST_URL` **non-public** →
tetap `http://127.0.0.1:3001`, **sudah benar, jangan diubah**.

### Temuan 2 — `generus-staging` bukan clone, cuma alias

Nginx site `generus-staging.abuabdirohman.com` **sudah ada + cert Let's Encrypt valid**,
tapi `proxy_pass http://127.0.0.1:3000` — **port yang sama dengan prod**. Dua domain, satu
instance. Belum bisa dipakai tes cutover.

### Kenapa sekarang

User memilih gate (a) = **a2** (terima stale + reconcile manual) dan gate (b) = **pre-build**.
Staging clone menutup celah a2: data plane baru diuji dengan data nyata **sebelum** ada user
yang kena.

## Outcome yang diharapkan

- Browser bisa capai PostgREST lewat URL publik same-origin; 7 file client di atas jalan.
- `generus-staging.abuabdirohman.com` = instance terpisah (port 3002) dengan env self-host
  aktif, melawan Postgres+PostgREST VM yang sama.
- Prod **tidak berubah sama sekali** sampai Step 4 — nol risiko cutover tak sengaja.

## Desain

### A. Ekspos PostgREST via Nginx (same-origin path)

Tambah ke **kedua** server block (`generus` dan `generus-staging`):

```nginx
location /pgrst/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Env yang dipakai:

| Var | Nilai | Dibaca oleh |
|---|---|---|
| `NEXT_PUBLIC_DATA_POSTGREST_URL` | `https://generus.abuabdirohman.com/pgrst` (prod)<br>`https://generus-staging.abuabdirohman.com/pgrst` (staging) | browser |
| `DATA_POSTGREST_URL` | `http://127.0.0.1:3001` (tetap) | server (`server.ts:11`) |

**Tidak perlu ubah kode.** `src/lib/supabase/restFetch.ts` sudah generic terhadap base
ber-path: base `…/pgrst` → prefix `…/pgrst/rest/v1` → stripped `…/pgrst/students?…` →
Nginx map ke `127.0.0.1:3001/students?…`. Trailing slash di `proxy_pass` wajib.

**Bonus: CORS tidak diperlukan.** Same-origin (app & PostgREST satu domain), jadi
`PGRST_SERVER_CORS_ALLOWED_ORIGINS` tidak relevan di VM. Ini alasan memilih path
(`/pgrst`) ketimbang subdomain terpisah.

### B. Staging clone (tanpa branch)

**Tidak bikin branch `staging`.** Yang diuji adalah *perpindahan data plane*, bukan kode
berbeda — kode staging **wajib identik** dengan yang akan dikirim ke prod. Branch terpisah
= drift = tes yang menguji kode yang salah.

Sebagai gantinya: **1 workflow baru**, jalan dari `master`, dipicu manual.

```yaml
# .github/workflows/deploy-staging.yml
name: Deploy Staging (self-host data plane)
on:
  workflow_dispatch:        # manual only — JANGAN on.push
```

Beda dari `deploy.yml` hanya 3 hal:

| | prod (`deploy.yml`) | staging (`deploy-staging.yml`) |
|---|---|---|
| trigger | `push: [master]` | `workflow_dispatch` |
| env build | 3 var existing | + `NEXT_PUBLIC_DATA_POSTGREST_URL` |
| rsync target | `apps/generus-mandiri/` | `apps/generus-mandiri-staging/` |
| pm2 app | `generus-mandiri` (:3000) | `generus-mandiri-staging` (:3002) |

`ecosystem.config.js` staging: sama polanya, `PORT: 3002`, **pertahankan**
`NODE_OPTIONS: '--max-http-header-size=65536'`.

### C. 🚨 Urutan yang tidak boleh dibalik

| Aksi | Efek |
|---|---|
| Tambah GitHub secret saja | ✅ Aman, inert — belum ada yang baca |
| Tambah var ke `deploy-staging.yml` | ✅ Aman — manual trigger, folder & port terpisah |
| **Tambah var ke `deploy.yml` prod** | 🔴 **Push apa pun ke `master` → CI build prod mode self-host.** Kalau Postgres/PostgREST belum siap → **prod mati total**, dipicu PR yang tak berhubungan |

**Aturan: `deploy.yml` prod TIDAK disentuh sampai Step 4 (detik cutover), dengan
persetujuan eksplisit user.** Var self-host masuk ke prod sekali saja, sengaja, diawasi.

Catatan: `deploy.yml` yang tanpa var → `NEXT_PUBLIC_DATA_POSTGREST_URL` undefined →
`client.ts:37` `if (!dataUrl) return createAuthClient()` → fallback Cloud. Aman.

### D. Artifact staging ≠ artifact prod

Karena `NEXT_PUBLIC_DATA_POSTGREST_URL` beda host (staging vs prod), artifact staging
**tidak bisa dipromosikan apa adanya** — pre-build prod (gate b) tetap build tersendiri.
Staging membuktikan *data plane + kode*, bukan menghasilkan artifact prod.

(URL relatif `/pgrst` akan bikin artifact identik, tapi **tidak dipakai**: supabase-js
mem-parse base URL sebagai absolut, dan `stripRestPrefixFetch` mencocokkan prefix terhadap
URL absolut dari `fetch` → relatif tidak match.)

## Pembagian kerja

| Bagian | Pemilik | Catatan |
|---|---|---|
| GitHub secret `NEXT_PUBLIC_DATA_POSTGREST_URL` | **VM Claude** (`gh secret set`) | gh authed sbg `abuabdirohman4`. Nilainya URL publik, bukan kredensial. **Butuh approval user** |
| `.github/workflows/deploy-staging.yml` | **Claude laptop** (PR) | Guardrail sm-91yt: no commit/push dari VM |
| Nginx `location /pgrst/` (2 site) | **VM Claude** | Step 3, di belakang approval gate |
| `ecosystem.config.js` staging + pm2 app | **VM Claude** | idem |
| Edit `deploy.yml` prod | **Claude laptop** (PR) | **Step 4 saja**, jangan lebih awal |

## Guardrails

- **ufw tidak berubah** — tetap `OpenSSH + Nginx Full`. Postgres 5432 & PostgREST 3001 tetap
  bind `127.0.0.1`. Nginx yang proxy dari dalam; port tidak pernah terbuka ke publik.
- **Postur keamanan setara Supabase Cloud.** PostgREST Cloud juga publik; pelindungnya
  **anon role + RLS**, dan RLS dipertahankan identik (approach B1, jangan di-drop). Ekspos via
  Nginx tidak menurunkan postur — tapi **RLS jadi satu-satunya pelindung, jadi verifikasi RLS
  sebelum staging dibuka** (lihat `docs/checklists/sm-5ago-rls-verification.md`).
- **`authenticator` `statement_timeout=15s` wajib** (`selfhost/sql/00_roles.sql`) — tanpa itu
  introspeksi schema-cache hang → PGRST002 → semua 503.
- **`PGRST_JWT_SECRET` harus JWK-Set-wrapped** (snippet python di `run-postgrest.sh`) — token
  GoTrue bawa `kid`; secret polos → "No suitable key" → 401.
- **Prod tak tersentuh** sampai Step 4. Staging boleh dimatikan kapan saja (`pm2 delete
  generus-mandiri-staging`) tanpa efek ke prod.
- Data tulis di staging **dibuang** — cutover asli dump ulang dari Cloud, bukan lanjut dari
  hasil tes.

## Verifikasi

1. `curl -s -o /dev/null -w '%{http_code}' https://generus-staging.abuabdirohman.com/pgrst/students`
   → `401` (bukan 502/404). 401 = PostgREST hidup & menolak anon tanpa token = benar.
2. Login di `generus-staging.abuabdirohman.com` → DevTools Network: request data menuju
   `/pgrst/...` (bukan `*.supabase.co`), status 200, **tanpa error CORS**.
3. Auth tetap ke `*.supabase.co` (GoTrue) — konfirmasi split berjalan.
4. Buka **Laporan → Materi untuk daerah ≥700 siswa** → render, tanpa
   `UND_ERR_HEADERS_OVERFLOW`, tanpa 414/431 dari PostgREST.
5. Halaman ke-7 file client di tabel Temuan 1 → semua render.
6. Prod (`generus.abuabdirohman.com`) → DevTools: data **masih** ke `*.supabase.co`.
   Membuktikan prod belum ikut ke-flip.
7. `free -h` → available tidak di bawah ~0.5Gi dengan staging + Postgres + PostgREST hidup.
8. `sudo ufw status` → tetap `OpenSSH + Nginx Full`; 5432/3001 tidak terdaftar.

## Rollback

Staging murni aditif — tidak ada yang perlu di-rollback dari prod. Bongkar:

```bash
pm2 delete generus-mandiri-staging
rm -rf /home/ubuntu/apps/generus-mandiri-staging
# kembalikan proxy_pass generus-staging ke :3000, atau biarkan
```

Hapus `deploy-staging.yml` via PR. Secret boleh ditinggal (inert).

## Relasi ke dokumen lain

- `docs/prompts/2026-07-14-sm-91yt-cutover-vm-phase2.md` — **L164 keliru** (`127.0.0.1:3001`
  untuk `NEXT_PUBLIC_`). Plan ini yang benar; perbaiki prompt itu saat Step 3.
- `selfhost/README.md:28` — benar **hanya untuk dev lokal**; beri catatan bahwa nilai ini
  tidak berlaku di server.
- `docs/plans/2026-07-15-materiqueries-batch-in-headers-overflow.md` — terpisah & tetap
  berlaku; staging adalah tempat memverifikasinya lawan PostgREST asli (verifikasi #4).
- Gate (a)=a2, gate (b)=pre-build — sudah diputuskan user 2026-07-16.
