CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-27-sm-5i0l-multi-kelas-custom-lainnya.md

ISSUE: sm-5i0l / GH-#155
BRANCH: feat/sm-5i0l-multi-kelas-custom-lainnya

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Task 1 (migrasi DB): jalankan SQL via MCP Supabase terlebih dahulu (production), lalu minta user jalankan di local dan VM
3. Task 2: TDD ketat — tulis test RED dulu, verifikasi fail, BARU implementasi (GREEN)
4. Jalankan test setelah Task 2: npm run test:run
5. Task 3 + 4: update kode
6. Task 5: npm run type-check
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user

REFERENCE FILES:
- Plan: @docs/plans/2026-07-27-sm-5i0l-multi-kelas-custom-lainnya.md
- GuruModal: @src/app/(admin)/users/guru/components/GuruModal.tsx
- Logic: @src/app/(admin)/users/guru/actions/teacher-class-masters/logic.ts
- Logic tests: @src/app/(admin)/users/guru/actions/teacher-class-masters/__tests__/logic.test.ts
- accessControlServer: @src/lib/accessControlServer.ts
- Rules: @CLAUDE.md

KEY PATTERNS:
- MultiSelectCheckbox ada di: src/components/form/input/MultiSelectCheckbox.tsx — pakai pola yang SAMA dengan "Batasan Tingkat Kelas" di GuruModal.tsx
- DB column setelah migrasi: custom_class_names (PLURAL, text[])
- accessControlServer line ~188 select custom_class_name → custom_class_names
- accessControlServer line ~243 filter: f.customClassName === className → f.customClassNames.includes(className)

Mulai dari Task 1 (migrasi DB via MCP Supabase).
