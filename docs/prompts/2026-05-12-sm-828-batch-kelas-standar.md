CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-05-05-sm-828-batch-kelas-standar.md

ISSUE: sm-828 / GH-#48
BRANCH: feature/sm-828-batch-kelas-standar

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 7)
2. Terapkan TDD ketat: RED → GREEN → REFACTOR
3. Jalankan test setelah setiap task: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. Setelah semua task: npm run type-check
6. Output per task: "✅ Task N complete: [ringkasan]"
7. JANGAN deviate dari plan tanpa approval user

TASK OVERVIEW:
- Task 1: logic.ts (TDD) — STANDARD_SORT_ORDERS, filterStandardMasters(), buildBatchPlan() + unit tests
- Task 2: queries.ts (TDD) — fetchExistingClassesForKelompoks(), insertClassWithMasterMapping() + unit tests
- Task 3: actions.ts (TDD) — createBatchStandardClasses() server action + unit tests
- Task 4: kelasStore.ts — tambah 3 state: isBatchStandardModalOpen, open/closeBatchStandardModal
- Task 5: useKelasPage.ts — expose 3 state baru dari store
- Task 6: BatchStandardKelasModal.tsx — modal dua kolom (kelompok + kelas standar) dengan result view
- Task 7: ClassesKelompokTab.tsx — tombol "Kelas Standar" + mount modal

REFERENCE FILES:
- Plan: @docs/plans/2026-05-05-sm-828-batch-kelas-standar.md
- Rules: @CLAUDE.md
- Architecture: @docs/claude/architecture-patterns.md
- Existing kelas actions (pola 3-layer): @src/app/(admin)/kelas/actions/
- Store yang ada: @src/app/(admin)/kelas/stores/kelasStore.ts
- Hook yang ada: @src/app/(admin)/kelas/hooks/useKelasPage.ts
- Tab yang dimodifikasi: @src/app/(admin)/kelas/components/ClassesKelompokTab.tsx
- Type ClassMaster: @src/types/class.ts
- Type Kelompok: @src/types/organization.ts

KEY TECHNICAL NOTES:
- 20 kelas standar diidentifikasi via hardcoded Set of sort_order (1-7, 9-11, 13-15, 17-23) — BUKAN nama
- Duplikat dideteksi dua cara: nama kelas (case-insensitive) ATAU class_master_id sudah terpetakan
- Setiap kelompok dievaluasi secara independen — skip di kelompok A tidak mempengaruhi kelompok B
- fetchExistingClassesForKelompoks() fetch semua kelompok sekaligus (.in()), bukan per kelompok
- Admin kelompok: filter daerah/desa hidden, kelompok auto-selected dari userProfile.kelompok_id
- Modal menampilkan result view (inline) setelah submit — tidak close otomatis
- onClose callback juga trigger mutate() untuk refresh tabel kelas

Mulai dari Task 1.
