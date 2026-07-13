CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-13-sm-20ba-persist-custom-field-values.md

ISSUE: sm-20ba / GH-#140
BRANCH: feat/sm-20ba-persist-custom-field-values

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah Task 3: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

BACKGROUND:
- Custom field QR card sudah diimplementasi (sm-20ba follow-up dari sesi cetak QR)
- Saat ini nilai hidup di React state saja — task ini menambah persistensi ke DB
- Tabel target: student_custom_field_values (student_id + template_id + value, UNIQUE constraint)
- Pattern: ikut 3-layer (queries.ts + actions.ts) di folder actions/customField/
- Akses via createAdminClient() saja (deny_all RLS), konsisten dengan id_card_templates

REFERENCE FILES:
- Plan: @docs/plans/2026-07-13-sm-20ba-persist-custom-field-values.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Pattern referensi: @src/app/(admin)/users/siswa/qr-cards/actions/template/queries.ts
- Pattern referensi: @src/app/(admin)/users/siswa/qr-cards/actions/template/actions.ts
- Target file: @src/app/(admin)/users/siswa/components/QrCardsTab.tsx

Mulai dari Task 1.
