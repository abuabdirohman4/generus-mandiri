CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-23-sm-4cy-sentry-error-tracking.md

ISSUE: sm-4cy / GH-#118
BRANCH: feat/sm-4cy-sentry-error-tracking

REQUIREMENTS:
1. Ikuti plan Task 1 → Task 4
2. Install @sentry/nextjs (user yang jalankan kalau Claude tak boleh). DSN-gated: enabled hanya kalau NEXT_PUBLIC_SENTRY_DSN ada (dev lokal tak spam).
3. tracesSampleRate rendah (~0.1) untuk free tier.
4. setUser({id,username,role}) setelah login, setUser(null) saat logout (cari titik userProfileStore / clearUserCache). Pure mapper buildSentryUser(profile) boleh di-test.
5. error.tsx + (admin)/error.tsx + global-error.tsx: client component, captureException di useEffect, tombol reset pakai Button existing. JANGAN raw HTML.
6. JANGAN kirim PII berlebih (id+role OK, jangan body sensitif).
7. npm run type-check 0; npm run build sukses (Sentry plugin).
8. Output per task: "✅ Task N complete: [ringkasan]"
9. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-23-sm-4cy-sentry-error-tracking.md
- Rules: @CLAUDE.md
- userProfileStore: @src/stores/userProfileStore.ts
- Login flow: @src/app/(full-width-pages)/(auth)/signin/page.tsx
- Env section: @CLAUDE.md (Environment & Configuration)

Mulai dari Task 1.
