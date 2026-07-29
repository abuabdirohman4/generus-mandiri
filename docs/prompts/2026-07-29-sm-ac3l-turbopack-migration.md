CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-29-sm-ac3l-turbopack-migration.md

ISSUE: sm-ac3l / GH-#159
BRANCH: perf/sm-ac3l-turbopack

TUJUAN: dev lokal lambat (Webpack cold-compile /users/siswa 39s). Aktifkan Turbopack untuk dev — 5-10x lebih cepat. Produksi (next build) TETAP Webpack, jangan diubah.

PRASYARAT (WAJIB CEK DULU):
- sm-9fnc (13 error type-check implicitly-any pre-existing) HARUS sudah beres. Jalankan `npm run type-check` — kalau ADA error, STOP, beresi sm-9fnc dulu (atau lapor). Verifikasi Turbopack tak valid kalau type-check belum bersih.

REQUIREMENTS:
1. Ikuti plan PERSIS — 3 task: (1) package.json + next.config turbopack.rules top-level, (2) hapus export type dari 10 file use-server + alihkan barrel/konsumer ke source type, (3) verifikasi.
2. JANGAN sentuh Sentry config (sentry.*.config.ts, instrumentation-client.ts) — sudah benar, sudah commit.
3. JANGAN rename type apapun (mis. Class→KelasItem) — itu SALAH, bukan solusi. Root cause = export type di use-server file, bukan nama type.
4. Aturan kunci: `export type` DILARANG di file 'use server' (segala bentuk). Pindahkan ke barrel non-server / konsumer import dari @/types/* langsung. `import type` di body file TETAP dipertahankan kalau body pakai type-nya.
5. Setelah tiap task: verifikasi dengan scan script di plan (0 export type di use-server).
6. Selesai: `npm run type-check` (0 error) + `npm run dev` cek log "(Turbopack)" + buka /signin /users/siswa /kelas /dashboard /presensi (icon tampil, no error).
7. Tidak ada TDD (perubahan config + import refactor, bukan business logic).

REFERENCE FILES:
- Plan: @docs/plans/2026-07-29-sm-ac3l-turbopack-migration.md
- Rules: @CLAUDE.md
- Type source of truth: @src/types/ (class.ts, dashboard.ts, student.ts)

CATATAN: ini kerjaan refactor lintas ~25 file (10 action + barrel + konsumer). Mekanis tapi teliti — satu export type kelewat = 1 route error saat dibuka. Pakai scan otomatis untuk pastikan tuntas.

Mulai dari Task 1.
