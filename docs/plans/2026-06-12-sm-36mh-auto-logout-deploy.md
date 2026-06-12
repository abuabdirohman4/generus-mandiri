# sm-36mh — Investigasi Auto-Logout Saat Deploy

**Tanggal**: 2026-06-12
**Tipe**: Investigasi + rencana fix
**Status**: Findings report v2 (revisi setelah verifikasi ulang — RED belum ditulis, fix belum diimplementasi)

> **Revisi v2 (2026-06-12)**: setelah telusur lanjutan, urutan root cause DIBALIK. Service Worker (dulu #2) naik jadi **akar utama** karena paling konsisten dgn gejala "pas deploy". `getSession()` di middleware (dulu #1) **diturunkan** jadi hardening, bukan akar tunggal — terbukti token MASIH di-refresh lewat 60+ `getUser()` di server actions. Env vars terkonfirmasi BUKAN penyebab.

## Keluhan
User sering ter-logout otomatis saat ada perubahan/deploy baru.

## Metode
Telusuri area sesuai issue: middleware, clearUserCache, Supabase auth persistence, env vars. Plus PWA service worker + registrasi SW (suspect utama).

---

## TEMUAN

### 🔴 ROOT CAUSE #1 (UTAMA): Service Worker saji HTML basi lintas-versi saat deploy
File: `public/sw.js`, registrasi `src/components/PWA/index.tsx`

Bukti terkumpul:
- `sw.js:4-5` — `CACHE_NAME = 'warlob-school-v1.0.0'`, `STATIC_CACHE = 'warlob-static-v1.0.0'`. **Di-hardcode, TAK PERNAH berubah antar deploy.**
- `sw.js:28` `self.skipWaiting()` + `sw.js:55` `self.clients.claim()` → SW baru langsung ambil alih semua tab terbuka, tanpa konfirmasi.
- `sw.js:44-52` `activate` cuma hapus cache yg namanya **≠** `v1.0.0`. Karena nama tak pernah ganti, **HTML lama di `CACHE_NAME` tak pernah terbuang antar deploy.**
- `sw.js:101-118` HTML = network-first **dgn fallback cache**. Saat deploy, kalau network lambat/gagal sesaat → saji HTML lama dari cache.
- HTML lama mereferensikan chunk Next.js hash lama (`_next/static/...`). Setelah deploy, hash itu **sudah hilang di server → 404** → app crash / re-init.
- `src/components/PWA/index.tsx:51` register SW **tanpa** `registration.update()`, **tanpa** listener `updatefound`/`controllerchange`/`waiting`.
- `index.tsx:94-97` `handleServiceWorkerUpdate` **cuma `console.log`** — komentar sendiri akui *"For now, we'll just log it"*. Tak ada mekanisme prompt/reload terkendali saat versi baru.

**Mekanisme logout (terkonfirmasi end-to-end)**:
deploy → SW saji HTML/asset basi → chunk hash lama 404 → `AdminLayoutProvider` (`:41` `getUser()`) gagal / app re-init → emit `SIGNED_OUT` atau fetch user gagal → `clearUserCache()` (`userUtils.ts:94`) `window.location.reload()` → middleware redirect `/signin`. **Pas deploy** cocok karena deploy = momen chunk lama invalid.

**Fix (F2, naik P1)**:
- Versi cache SW ikut build id (jangan hardcode `v1.0.0`) supaya cache lama benar-benar terbuang tiap deploy.
- Jangan saji HTML lintas-versi. Pertimbangkan **tidak** `skipWaiting()` buta; tampilkan prompt "Versi baru, muat ulang?" + reload terkendali (`controllerchange`).
- Atau paling minimal: jangan cache HTML di SW sama sekali (biarkan browser+server handle), cuma cache asset statik.

---

### 🟡 KONTRIBUTOR #2 (hardening, BUKAN akar tunggal): Middleware pakai `getSession()`
`src/middleware.ts:37`

```ts
const { data: { session: sessionData } } = await supabase.auth.getSession()
```

- `getSession()` cuma baca cookie, tak memvalidasi & tak memicu refresh token. Pola `@supabase/ssr` yang benar = `getUser()` (hit Auth server → auto-refresh → `set` cookie callback `lib/supabase/middleware.ts:20-37` tulis cookie baru ke response).
- **KOREKSI dari v1**: token TIDAK "tak pernah di-refresh". Terbukti **60+ panggilan `getUser()`** tersebar di server actions (`accessControlServer.ts:62`, presensi/siswa/rapot/notifikasi/monitoring) + `AdminLayoutProvider.tsx:41`. `getUser()` di server action MEMICU refresh & tulis cookie via `server.ts:15-23`. Jadi user aktif → token ter-refresh terus.
- Implikasi: middleware `getSession()` = celah best-practice (middleware tak ikut refresh), tapi **bukan penjelas "logout pas deploy"** — kalau token-expiry akarnya, logout terjadi tiap ~1 jam idle, bukan "pas deploy".

**Fix (F1, P2)**: ganti `getSession()` → `getUser()` di middleware. Tetap dikerjakan (hardening + best practice), tapi framing-nya bukan akar utama.

---

### 🟡 KONTRIBUTOR #3: `clearUserCache()` full `window.location.reload()`
`src/lib/userUtils.ts:94`, dipanggil `AdminLayoutProvider.tsx:155,184` saat `SIGNED_OUT` / account-switch.

- Bukan akar, tapi **amplifier**: begitu app re-init gagal (efek #1) atau sesi invalid → `SIGNED_OUT` → reload → middleware → `/signin`. Loop ini bikin logout terasa tegas & seketika.
- Akan reda otomatis setelah #1 (SW) & #2 (middleware) dibereskan. Tak perlu diubah sendiri dulu.

---

### ✅ Auth persistence (storage mode) — TIDAK bermasalah (terverifikasi)
- Browser: `createBrowserClient` (`client.ts:9`) — `@supabase/ssr ^0.6.1` simpan sesi di **cookie**, `autoRefreshToken` default ON.
- Tak ada override `storageKey`/`persistSession`/`autoRefreshToken` (grep kosong).
- Server & middleware client cookie-based via `@supabase/ssr`. Konsisten.
- Callback OAuth: `(auth)/callback/route.ts` pakai `exchangeCodeForSession` — standar, benar.

### ✅ Env vars saat deploy — TERKONFIRMASI BUKAN penyebab (3 bukti konvergen, DEFINITIF)
- **Vercel dashboard (bukti definitif)**: `NEXT_PUBLIC_SUPABASE_URL` & `NEXT_PUBLIC_SUPABASE_ANON_KEY` label **"Added 10/13/25"**, TANPA "Updated" setelahnya → **tak pernah diubah sejak 8 bulan lalu** (sekarang 2026-06-12). Kalau pernah diubah, Vercel ganti label jadi "Updated <tgl baru>". Gejala "sering logout" terjadi di rentang env stabil ini.
- **Supabase API Keys dashboard**: anon/service_role di tab **"Legacy"** = auto-generate saat project dibuat.
- **`.env.local` ada 2 anon key, TAPI beda PROJECT (bukan rotate)**: decode JWT payload → `_V1` (commented) `ref=bcmcsvxuhwefgcahrcya` iat 2025-10-07 = **project LAMA, tak dipakai**; aktif `ref=eahntxowlefjaizjoqys` iat 2025-10-12 = **project SEKARANG (generus-mandiri-v2)**. Artinya user **migrasi project Supabase sekali ~2025-10-12/13** (cocok Vercel "Added 10/13/25"), bukan rotate key berulang.
- Migrasi project = logout massal **serentak SEKALI** (Okt 2025), bukan pola "sering logout berulang" yg dikeluhkan. Project lama `_V1` di-comment → tak ada konflik runtime. **Env-vars tetap DICORET untuk gejala ini.**

> **🔴 TEMUAN KEAMANAN (tak terkait logout, follow-up terpisah)**: screenshot user ekspos `SUPABASE_SERVICE_ROLE_KEY` AKTIF lengkap (project eahntxo) ke chat. Service role = bypass RLS, akses penuh DB. **Rekomendasi: rotate JWT secret project aktif + update di Vercel & .env.local.** Buat issue terpisah, JANGAN campur ke sm-36mh.
- Git: `.env*.local` di-gitignore (`.gitignore:69-71,171`). `git ls-files` cuma `.env.example` & `.env.test.example`. `git log -- '*.env*'` cuma sentuh file `.example` — **nilai asli tak pernah ke-git**.
- Pola gejala: env berubah = logout **massal serentak SEKALI**, bukan "sering" berulang. Gejala user = berulang → **tak cocok** env-vars.
- **Faktor env-vars RESMI DICORET.**

> **Catatan tak terkait logout** (cleanup opsional): ada var duplikat `*_V1` (`ANON_KEY_V1`, `URL_V1`, `SERVICE_ROLE_KEY_V1`) — sisa lama, kode tak pakai (cuma baca non-`_V1`), bisa dihapus. 2 var "Needs Attention" (`SUPABASE_SERVICE_ROLE_KEY` + `_V1`) — service role server-only, bukan jalur auth user, tak relevan logout; cek pas senggang.

---

## RINGKASAN ROOT CAUSE (urutan dampak, REVISI)
1. **Service Worker saji HTML/asset basi lintas-versi + skipWaiting + cache hardcoded `v1.0.0`** → deploy = chunk lama 404 → app crash/re-init → logout. **AKAR UTAMA, paling cocok "pas deploy".**
2. **Middleware `getSession()`** → tak ikut refresh token. Hardening, bukan akar tunggal (token masih di-refresh lewat server actions).
3. `clearUserCache()` reload = amplifier (gejala).

Auth storage mode & env vars = **bukan** penyebab (terverifikasi).

---

## RENCANA FIX (untuk issue lanjutan, TDD)

| # | Fix | File | Prioritas |
|---|-----|------|-----------|
| **F0** | **Reproduksi**: deploy/build baru → buka tab lama → reload → amati apakah logout. Capture Network (chunk 404) + Application→Service Worker (versi cache). Konfirmasi mekanisme #1 sebelum fix. | — | **P1, lakukan dulu** |
| **F2** | SW cache versioning ikut build id + jangan saji HTML lintas-versi (atau jangan cache HTML); opsi prompt update terkendali (`controllerchange`), jangan skipWaiting buta. | `public/sw.js`, `src/components/PWA/index.tsx` | **P1** |
| F1 | `getSession()` → `getUser()` di middleware, kembalikan cookie refresh via `response`. | `src/middleware.ts` | P2 |
| F3 | (opsional) Audit `SIGNED_OUT` handler agar tak reload untuk transient. | `AdminLayoutProvider.tsx` | P3 |

**TDD note**:
- F2 sulit unit-test (SW butuh browser). Reproduksi manual (F0) + E2E skenario deploy adalah verifikasi realistis. Regression guard: cek versi cache SW berubah antar build (bisa unit-test string versioning kalau di-extract).
- F1 sulit reproduksi RED (token-expiry di E2E susah). Akui sebagai best-practice hardening, bukan fix yg punya RED jelas.
- Lihat memory `postgrest-select-not-typechecked`: jalur yg tak ter-cover unit wajib E2E/smoke.

## Aksi berikut
1. ✅ Env vars — TUNTAS dicoret (Vercel timestamp "Added 10/13/25" tak pernah Updated + git bersih + pola gejala = 3 bukti konvergen).
2. **F0 dulu**: reproduksi mekanisme SW (butuh deploy/build baru + tab lama). Ini menentukan apakah F2 benar akar utama sebelum nulis fix.
3. Putuskan scope: F2 (akar utama) + F1 (hardening) sekalian, atau F2 dulu.
4. Buat issue fix terpisah → implementasi via TDD.
