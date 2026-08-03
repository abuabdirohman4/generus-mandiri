CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-08-03-sm-vxna-pwa-offline-shell.md

ISSUE: sm-vxna / GH-#161
BRANCH: feat/sm-vxna-pwa-offline-shell

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat jika ada logic (Tier ini mostly SW config + halaman statis — test = verifikasi manual offline)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. WAJIB bump BUILD_VERSION di public/sw.js (konvensi file)
9. JANGAN cache HTML app dinamis — hanya /offline statis (anti stale-chunk, lihat komentar sw.js existing)

REFERENCE FILES:
- Plan: @docs/plans/2026-08-03-sm-vxna-pwa-offline-shell.md
- Rules: @CLAUDE.md
- Service worker: @public/sw.js
- Manifest: @public/manifest.json

Mulai dari Task 1.
