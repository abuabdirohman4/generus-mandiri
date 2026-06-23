# Plan — sm-4cy — Integrasi Sentry Error Tracking

**Issue:** sm-4cy · Integrasi Sentry untuk error tracking di production
**Type:** feature / infra (P3)
**Date:** 2026-06-23

---

## 1. Goal

Uncaught client error (React Error Boundary) saat ini = halaman putih tanpa context. Tambah Sentry agar crash production dapat di-debug (stack trace, user context, repro). Scope: install `@sentry/nextjs`, konfigurasi DSN, custom `error.tsx` per route segment untuk UI lebih friendly daripada white screen.

## 2. Reuse / context

- Next.js 15 App Router → Sentry pakai `@sentry/nextjs` wizard (`npx @sentry/wizard@latest -i nextjs`) yang generate `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, instrument `next.config`.
- User context: ambil dari `userProfileStore` / supabase auth user → `Sentry.setUser({ id, ... })` setelah login, clear saat logout (`clearUserCache` hook point).
- DSN ke env: `NEXT_PUBLIC_SENTRY_DSN` (+ auth token untuk source maps di CI, opsional).

## 3. Architecture decisions

- **Free tier** cukup skala ini. Sampling rendah (tracesSampleRate ~0.1) supaya hemat quota.
- **error.tsx**: tambah/upgrade `app/error.tsx` global + per-segment penting (`(admin)/error.tsx`) → tampil pesan ramah + tombol "Coba lagi" (reset) + auto `Sentry.captureException(error)` di `useEffect`.
- **Jangan** kirim PII berlebih. User id + role OK; jangan body request sensitif.
- Env optional: kalau `NEXT_PUBLIC_SENTRY_DSN` kosong → Sentry no-op (dev lokal tak spam).

## 4. Tasks

### Task 1 — Install + wizard
- `npx @sentry/wizard@latest -i nextjs` ATAU manual `npm i @sentry/nextjs` + buat config files. (User jalankan kalau Claude tak boleh install.)
- Set `NEXT_PUBLIC_SENTRY_DSN` di `.env.local` + dokumentasikan di CLAUDE.md Env section.
- tracesSampleRate 0.1, gate `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN`.

### Task 2 — User context wiring
- Setelah login (cari titik set userProfile / `clearUserCache` counterpart) → `Sentry.setUser({ id, username, role })`.
- Saat logout → `Sentry.setUser(null)`.
- (Logic tipis; unit test opsional — pure mapper `buildSentryUser(profile)` boleh di-test.)

### Task 3 — error.tsx friendly UI
- Global `app/error.tsx` + `(admin)/error.tsx`: client component, `useEffect(() => Sentry.captureException(error), [error])`, render kartu error + tombol reset (`reset()`). Pakai komponen Button existing.
- `global-error.tsx` untuk root layout crash (Sentry pattern).

### Task 4 — Verify
- `npm run type-check` 0. `npm run build` sukses (Sentry plugin hook).
- Manual: lempar error sengaja di satu page (dev dgn DSN dummy/staging) → error.tsx muncul (bukan white screen) + event masuk Sentry dashboard.

## 5. Out of scope
- Performance monitoring penuh / session replay (bisa follow-up).
- Alerting rules (atur di Sentry dashboard, bukan kode).

## 6. CLAUDE.md Check
- [ ] Tambah `@sentry/nextjs` ke Key Technologies.
- [ ] Tambah `NEXT_PUBLIC_SENTRY_DSN` ke Environment & Configuration (Optional).
- [ ] Note error.tsx pattern di page-structure-conventions.md kalau jadi konvensi.

## 7. Commit message
```
feat(infra): integrate Sentry error tracking + friendly error boundaries (fixes #XX)

Add @sentry/nextjs (client/server/edge config), set user context on login,
and replace white-screen crashes with friendly error.tsx that captures the
exception. DSN-gated (no-op when unset). Low trace sampling for free tier.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
