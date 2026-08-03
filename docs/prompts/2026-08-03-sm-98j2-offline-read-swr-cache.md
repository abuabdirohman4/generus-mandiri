CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-08-03-sm-98j2-offline-read-swr-cache.md

ISSUE: sm-98j2 / GH-#162 (DEPENDS ON sm-vxna — pastikan Tier 1 offline shell sudah merged/ada)
BRANCH: feat/sm-98j2-offline-read-swr-cache

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR (useOnline hook)
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user
8. JANGAN raw HTML/SVG — pakai komponen existing + ikon dari src/lib/icons.tsx
9. Reuse SWRProvider + revalidateOnReconnect existing — JANGAN bangun ulang cache

REFERENCE FILES:
- Plan: @docs/plans/2026-08-03-sm-98j2-offline-read-swr-cache.md
- Rules: @CLAUDE.md
- SWR config: @src/lib/swr.ts
- SWR provider: @src/components/common/SWRProvider.tsx
- Admin layout: @src/app/(admin)/layout.tsx
- Icons: @src/lib/icons.tsx

Mulai dari Task 1.
