CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi fix untuk sm-36mh — auto-logout saat deploy. Root cause sudah teridentifikasi di plan. Ada 2 fix: F2 (Service Worker, akar utama) + F1 (middleware hardening).

ISSUE: sm-36mh / GH-#97
BRANCH: fix/sm-36mh-auto-logout-deploy

---

## CONTEXT INVESTIGASI (baca sebelum mulai)

Root cause sudah terkonfirmasi via investigasi (plan v2):

### F2 — Service Worker (AKAR UTAMA, P1)
- `public/sw.js:4-5` — `CACHE_NAME = 'warlob-school-v1.0.0'` hardcoded, tak pernah berubah antar deploy
- `sw.js:28` `self.skipWaiting()` + `sw.js:55` `self.clients.claim()` → SW baru langsung ambil alih tab terbuka
- `sw.js:44-52` `activate` hanya hapus cache nama ≠ `v1.0.0` — karena nama tak pernah ganti, **HTML lama tak pernah terbuang**
- `sw.js:101-118` HTML = network-first dengan **fallback cache** → saat deploy, bisa saji HTML basi → chunk hash lama 404 → app crash → logout
- `src/components/PWA/index.tsx:51` — register SW tanpa `registration.update()`, tanpa `updatefound`/`controllerchange` listener
- `index.tsx:94-97` `handleServiceWorkerUpdate` hanya `console.log` — komentar sendiri: "For now, we'll just log it"

### F1 — Middleware `getSession()` (hardening, P2)
- `src/middleware.ts:37` pakai `getSession()` — hanya baca cookie, tak validasi/refresh
- Best practice `@supabase/ssr` = `getUser()` (hit Auth server → auto-refresh → tulis cookie baru)
- Token masih di-refresh lewat 60+ `getUser()` di server actions, jadi bukan akar tunggal
- Tapi tetap perlu difix sebagai hardening — middleware jadi jalur refresh yang konsisten

---

## TASK LIST

### Task 1 — Fix Service Worker: versioning cache

**File**: `public/sw.js`

Ganti cache name dari hardcoded ke versi yang bisa berubah. Karena `public/sw.js` adalah file statis (bukan diproses webpack/Next.js), kita pakai **timestamp build** yang di-inject saat deploy, ATAU pendekatan lebih sederhana: gunakan tanggal ISO sebagai versi yang diupdate manual tiap deploy signifikan.

Tapi solusi terbaik yang tidak butuh CI/CD change: **hapus caching HTML sama sekali di SW** — biarkan browser + server Next.js yang handle HTML. SW hanya cache asset statik (images, icons, audio). Ini eliminasi root cause tanpa kompleksitas build injection.

**Perubahan**:

```javascript
// BEFORE (sw.js:4-5)
const CACHE_NAME = 'warlob-school-v1.0.0';
const STATIC_CACHE = 'warlob-static-v1.0.0';

// AFTER — versi mengikuti tanggal build, mudah diupdate
const BUILD_VERSION = '2026-06-12';
const CACHE_NAME = `warlob-school-${BUILD_VERSION}`;
const STATIC_CACHE = `warlob-static-${BUILD_VERSION}`;
```

**Hapus HTML caching dari `handleRequest`** — ubah agar HTML selalu network-only (tidak di-cache, tidak ada fallback cache untuk HTML):

```javascript
// BEFORE (sw.js:88-118) — handleRequest dengan HTML caching
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For static assets, try cache first
    if (isStaticAsset(url)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // For HTML pages, try network first with cache fallback  ← MASALAH INI
    if (isHTMLPage(url)) {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());  // ← JANGAN cache HTML
        }
        return networkResponse;
      } catch (error) {
        const cachedResponse = await caches.match(request);  // ← JANGAN fallback cache HTML
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    }
    // ...
  }
}

// AFTER — HTML selalu network-only, tidak pernah di-cache
async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // For static assets, try cache first
    if (isStaticAsset(url)) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    // HTML pages: network-only, NEVER cache
    // Reason: caching HTML across deploys causes stale chunk references (404) → app crash → logout
    if (isHTMLPage(url)) {
      return await fetch(request);
    }

    // For other requests, try network first
    try {
      const networkResponse = await fetch(request);
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  } catch (error) {
    console.error('❌ Fetch failed:', error);
    if (isHTMLPage(url)) {
      return new Response(
        '<html><body><h1>Offline</h1><p>Please check your connection and try again.</p></body></html>',
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 503 
        }
      );
    }
    throw error;
  }
}
```

**Juga update `activate`** — karena BUILD_VERSION berubah tiap deploy, cache lama otomatis terhapus (nama berbeda). Tapi tetap pertahankan logic cleanup:

```javascript
// activate event — logika sudah benar, hanya nama variable yang perlu update
// Karena CACHE_NAME sekarang mengandung BUILD_VERSION, deploy baru = nama berbeda = cache lama terhapus ✅
```

### Task 2 — Fix PWA component: tambah update handler

**File**: `src/components/PWA/index.tsx`

Tambah listener `updatefound` + `controllerchange` agar saat SW baru aktif, user diberi tahu dan halaman di-reload terkendali (bukan diam-diam — ini mencegah tab lama pakai chunk lama).

```typescript
// Di dalam useEffect setelah navigator.serviceWorker.register(...)
navigator.serviceWorker.register('/sw.js', { scope: '/' })
  .then((registration) => {
    console.log('🔧 Warlob Service Worker registered:', registration);
    setIsAppReady(true);

    // Listen for SW updates — saat deploy baru, SW versi baru ditemukan
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        // SW baru sudah installed dan siap aktif
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // Ada versi baru — reload halaman agar pakai chunk terbaru
          // Ini mencegah "chunk 404" karena tab lama masih pakai hash lama
          console.log('🔄 New app version available, reloading...');
          window.location.reload();
        }
      });
    });
  })
  .catch((error) => {
    console.error('❌ Service Worker registration failed:', error);
    setIsAppReady(true);
  });

// Juga listen controllerchange untuk handle tab yang sudah buka sebelum reload
navigator.serviceWorker.addEventListener('controllerchange', () => {
  console.log('🔄 Service Worker controller changed, reloading...');
  window.location.reload();
});
```

**CATATAN**: `controllerchange` + reload bisa infinite loop kalau tidak di-guard. Tambah guard:

```typescript
// Guard reload — hanya reload sekali
let reloadPending = false;

navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (reloadPending) return;
  reloadPending = true;
  console.log('🔄 Service Worker updated, reloading for new version...');
  window.location.reload();
});
```

### Task 3 — Fix middleware: `getSession()` → `getUser()` (hardening)

**File**: `src/middleware.ts`

```typescript
// BEFORE (middleware.ts:34-42)
// Get session with timeout to prevent hanging
let session = null
try {
  const { data: { session: sessionData } } = await supabase.auth.getSession()
  session = sessionData
} catch (error) {
  console.error('Auth session error:', error)
  // Continue without session if auth fails
}

// AFTER — getUser() validasi ke Auth server + trigger refresh
let session = null
try {
  const { data: { user } } = await supabase.auth.getUser()
  // getUser() validates token with Supabase Auth server and refreshes if needed.
  // getSession() only reads cookie without validation — use getUser() per @supabase/ssr docs.
  session = user ? { user } : null
} catch (error) {
  console.error('Auth session error:', error)
  // Continue without session if auth fails
}
```

**Update semua referensi `session` di bawah** — `session` sekarang adalah `{ user }` bukan Supabase `Session`. Cek baris yang pakai `session`:

- `middleware.ts:70`: `if (session)` → cek user ada, tetap valid
- `middleware.ts:78`: `if (session && isPublicRoute)` → tetap valid  
- `middleware.ts:83`: `if (!session && isProtectedRoute)` → tetap valid

Tidak ada akses ke `session.user` atau field lain di middleware ini — hanya cek truthy. **Perubahan minimal, aman.**

### Task 4 — Update `sw.js` BUILD_VERSION

Setelah Task 1-3 selesai, pastikan `BUILD_VERSION` di `public/sw.js` = tanggal hari ini (`2026-06-12`) agar cache lama (versi `v1.0.0`) otomatis terbuang di semua client saat deploy.

---

## TDD NOTE

Fix ini adalah infrastruktur (SW + middleware) — sulit di-unit test langsung. Verifikasi dilakukan:

1. **Type check**: `npm run type-check` harus pass setelah Task 3 (middleware pakai `getUser()`)
2. **Manual smoke test** (user lakukan):
   - Build production: `npm run build` (harus sukses)
   - Cek di browser DevTools → Application → Service Workers → versi cache baru
   - Hard reload → pastikan tidak ada 404 di Network tab untuk chunk JS

---

## COMMIT MESSAGE TEMPLATE

```
fix(sw): prevent stale HTML caching across deploys to fix auto-logout

- sw.js: remove HTML caching (network-only for pages, cache only static assets)
- sw.js: add BUILD_VERSION to cache names so old caches purge on deploy
- PWA/index.tsx: add updatefound + controllerchange reload handler
- middleware.ts: getSession() → getUser() for proper token refresh (hardening)

Root cause: SW served stale HTML after deploy → chunk hash 404 → app crash → logout.

fixes #97

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Ada pattern baru? SW versioning via BUILD_VERSION — dokumentasi di `docs/claude/` kalau jadi pola yang diulang
- [ ] Tabel DB baru? Tidak
- [ ] Route baru? Tidak
- [ ] Permission pattern baru? Tidak
- [ ] Update CLAUDE.md? Tidak perlu — perubahan infrastruktur, bukan arsitektur app

## SETELAH SELESAI
```bash
bd close sm-36mh --reason="Fixed: SW HTML caching removed + BUILD_VERSION versioning + updatefound handler + middleware getUser() hardening"
```
