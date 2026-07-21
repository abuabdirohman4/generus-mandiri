# sm-iywv — chore: Sentry sourcemap upload

**Issue**: sm-iywv | **Priority**: P2 | **Type**: chore
**Blocks**: sm-d7zd, sm-dcb3 (both need readable stacktraces to pinpoint code)

## Context

Semua stacktrace production di Sentry masih **minified** — frame tampil sebagai
`app:///_next/static/chunks/2432-b1f136fc221ad748.js:14:44397 (MessagePort.x)`
alih-alih path file asli. Akibatnya 2 issue (sm-d7zd, sm-dcb3) tidak bisa
dilacak ke baris kode.

## Root Cause (verified)

`next.config.ts:82-93` sudah mengonfigurasi Sentry webpack plugin dengan benar:
```ts
org: "generus-mandiri",
project: "generus-mandiri",
widenClientFileUpload: true,
```

Tapi build production dijalankan di **GitHub Actions**, bukan di VM:

`.github/workflows/deploy.yml:15-20`
```yaml
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: ${{ secrets.NEXT_PUBLIC_UMAMI_WEBSITE_ID }}
          NEXT_PUBLIC_DATA_POSTGREST_URL: ${{ secrets.NEXT_PUBLIC_DATA_POSTGREST_URL }}
```

`SENTRY_AUTH_TOKEN` **tidak ada** di env block itu. Tanpa token, plugin
Sentry skip upload sourcemap (silent, karena `silent: !process.env.CI`).

`SENTRY_AUTH_TOKEN` memang ada di `/home/ubuntu/apps/generus-mandiri/.env` di VM,
tapi itu tidak terpakai — VM hanya menerima artifact hasil build, tidak build sendiri.

## Tasks

### Task 1 — Buat Sentry auth token khusus CI

Manual step (user, di browser):

1. Buka https://generus-mandiri.sentry.io/settings/auth-tokens/
2. Klik **Create New Token**
3. Name: `github-actions-sourcemaps`
4. Scopes yang WAJIB dicentang:
   - `project:releases`
   - `org:read`
5. Copy token (format `sntrys_...`)

> Gunakan token BARU khusus CI — jangan pakai ulang token personal.
> Token CI ini hanya butuh 2 scope di atas, jauh lebih sempit dari token personal.

**Expected output**: token string `sntrys_...` tersimpan.

### Task 2 — Simpan token sebagai GitHub Actions secret

```bash
gh secret set SENTRY_AUTH_TOKEN --repo abuabdirohman4/generus-mandiri
# paste token saat diminta, lalu Enter
```

Verifikasi:
```bash
gh secret list --repo abuabdirohman4/generus-mandiri | grep SENTRY_AUTH_TOKEN
```
**Expected output**: baris berisi `SENTRY_AUTH_TOKEN` + timestamp update.

### Task 3 — Tambah token ke env block workflow

File: `.github/workflows/deploy.yml`

Ubah baris 15-20 dari:
```yaml
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: ${{ secrets.NEXT_PUBLIC_UMAMI_WEBSITE_ID }}
          NEXT_PUBLIC_DATA_POSTGREST_URL: ${{ secrets.NEXT_PUBLIC_DATA_POSTGREST_URL }}
```
menjadi:
```yaml
      - run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          NEXT_PUBLIC_UMAMI_WEBSITE_ID: ${{ secrets.NEXT_PUBLIC_UMAMI_WEBSITE_ID }}
          NEXT_PUBLIC_DATA_POSTGREST_URL: ${{ secrets.NEXT_PUBLIC_DATA_POSTGREST_URL }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
```

Lakukan perubahan identik di `.github/workflows/deploy-staging.yml` (cek dulu
apakah file itu punya step `npm run build` dengan env block yang sama).

### Task 4 — Pastikan sourcemap tidak ikut ter-serve ke publik

Cek `next.config.ts` — pastikan opsi berikut ada di blok Sentry (tambahkan jika belum):
```ts
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
```
Tujuan: sourcemap di-upload ke Sentry lalu dihapus dari artifact, supaya
source code asli tidak bisa diunduh publik dari `/_next/static/`.

### Task 5 — Verifikasi

```bash
npm run type-check
```
**Expected**: exit 0, no errors.

Lalu commit + push ke master (trigger deploy). Setelah workflow selesai:

1. Buka Actions run terakhir, cari step `npm run build`
2. **Expected**: ada log `Successfully uploaded source maps to Sentry` (atau
   sejenisnya — plugin verbose di CI karena `silent: !process.env.CI`)
3. Buka https://generus-mandiri.sentry.io/settings/projects/generus-mandiri/source-maps/
   **Expected**: muncul entry release baru dengan artifact count > 0

### Task 6 — Konfirmasi stacktrace ter-resolve

Tunggu error baru masuk (atau trigger manual di staging). Buka issue di Sentry.

**Expected**: frame menampilkan path asli seperti
`src/app/(admin)/naik-kelas/PromotionClient.tsx:96:12`
bukan `chunks/2432-xxx.js:14:44397`.

Setelah ini terkonfirmasi → unblock sm-d7zd dan sm-dcb3:
```bash
bd update sm-iywv --status=closed
bd ready   # sm-d7zd dan sm-dcb3 harus muncul
```

## Rollback

Jika upload sourcemap bikin build gagal:
```bash
git revert <commit-sha>
```
Build akan kembali jalan tanpa upload (behaviour lama, non-breaking).

## Commit Message

```
chore(sentry): upload sourcemaps from CI build

Build runs in GitHub Actions but SENTRY_AUTH_TOKEN was missing from the
build env block, so the Sentry webpack plugin silently skipped sourcemap
upload. Every production stacktrace stayed minified, making two open bugs
untraceable to source.

Adds the token to the deploy workflows and deletes sourcemaps after upload
so source code is not publicly downloadable from /_next/static/.

fixes #<GH-NUMBER>
```

## CLAUDE.md Check
- [ ] Pattern baru? → Ya: sourcemap upload di CI. Tambahkan catatan singkat
      ke `docs/claude/` atau `CLAUDE.md` bagian observability/deployment.
- [ ] Tabel DB baru? → Tidak
- [ ] Route baru? → Tidak
- [ ] Permission pattern baru? → Tidak
