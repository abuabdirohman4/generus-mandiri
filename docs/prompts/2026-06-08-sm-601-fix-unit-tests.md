CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-06-08-sm-601-fix-180-unit-tests.md

ISSUE: sm-601 / GH-#XX
BRANCH: fix/sm-601-unit-test-drift

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Setiap task: jalankan targeted test dulu untuk lihat failures, lalu fix, lalu verify
3. Jalankan test per file setelah fix: `npx vitest run <file>`
4. Jangan lanjut ke task berikutnya jika ada test FAIL
5. Setelah semua task: `npm run test:run` harus 0 failures
6. Setelah itu: `npm run type-check` harus bersih
7. Output per task: "✅ Task N complete: [ringkasan berapa test difix]"
8. JANGAN deviate dari plan tanpa approval user

KEY RULE untuk fix:
- Cek return type fungsi di `actions.ts` sebelum fix test
- `{success, data}` return → update test assertion ke `expect(result).toEqual({success:true, data:...})`
- Throws → keep `rejects.toThrow` (jangan ubah)
- Plain array return + `(result as any).data` → ubah ke `result` (hapus `.data`)
- Error return `{success:false}` + test pakai `rejects` → ubah test ke `expect(result).toEqual({success:false,...})`

REFERENCE FILES:
- Plan: @docs/plans/2026-06-08-sm-601-fix-180-unit-tests.md
- Rules: @CLAUDE.md
- Testing guidelines: @docs/claude/testing-guidelines.md
- Server actions conventions: @docs/claude/server-actions-conventions.md

JANGAN ubah production code (actions.ts, logic.ts, queries.ts). Fix HANYA test files (*.test.ts).

Mulai dari Task 0 (baseline measurement).
