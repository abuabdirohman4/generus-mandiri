CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-10-sm-4op-docs-auto-content.md

ISSUE: sm-4op / GH-#86
BRANCH: feat/sm-4op-docs-auto-content

REQUIREMENTS:
1. Ikuti plan fase-by-fase secara berurutan
2. Mulai dari Fase 1 (seed data demo) — konfirmasi org ID demo ke user dulu
3. Pilot Fase 3+4 dengan fitur Absensi dulu, validasi pipeline, baru batch sisanya
4. Terapkan TDD untuk komponen MDX baru (Fase 2)
5. Jangan modifikasi config Playwright existing (`screenshot: 'only-on-failure'` jangan diubah) — tambah project baru `docs-capture` saja
6. Output per fase: "✅ Fase N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-10-sm-4op-docs-auto-content.md
- Rules: @CLAUDE.md
- Playwright config: playwright.config.ts
- Auth helpers: tests/e2e/helpers/auth.ts
- MDX components (sekarang kosong): src/mdx-components.tsx
- Docs CSS (untuk referensi styling): src/app/docs/docs.css
- Existing E2E spec contoh: tests/e2e/presensi.spec.ts

CATATAN KHUSUS:
- Video slowMo 600ms — biarkan gerakan natural, tidak terlalu cepat
- Screenshot path: public/images/docs/<fitur>/NN-nama-langkah.png
- YouTubeEmbed: kalau id="" (kosong) tampilkan placeholder "Video segera hadir"
- Seed data: JANGAN pakai data production, perkaya akun demo existing saja

Mulai dari Fase 1 — tanya user org ID / kelompok ID akun demo sebelum mulai seed.
