CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-22-sm-aej4-optimistic-presensi-list.md

ISSUE: sm-aej4 / GH-#108
BRANCH: perf/sm-aej4-optimistic-presensi-list

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED -> GREEN -> REFACTOR
3. Jalankan test setelah setiap task: npm run test:run -- cache
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-06-22-sm-aej4-optimistic-presensi-list.md
- Rules: @CLAUDE.md
- Cache util target: @src/app/(admin)/presensi/utils/cache.ts
- handleSave target: @src/app/(admin)/presensi/[meetingId]/page.tsx
- SWR hook (shape data cache): @src/app/(admin)/presensi/hooks/useMeetings.ts

Mulai dari Task 1.
