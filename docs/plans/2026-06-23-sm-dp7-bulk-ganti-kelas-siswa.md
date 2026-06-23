# Plan — sm-dp7 — Bulk Ganti Kelas Siswa

**Issue:** sm-dp7 · feat: bulk edit ganti kelas siswa
**Date:** 2026-06-23
**Author:** Claude Code (plan) → Antigravity (impl)

---

## 1. Goal

Di halaman `/users/siswa`: pilih multiple siswa via row multi-select di tabel → pilih kelas tujuan → konfirmasi → batch **ganti** kelas. Fokus satu field: `class_id`/kelas. Untuk naik kelas manual / reorganisasi.

## 2. CRITICAL distinction vs existing flow

Sudah ada `assignStudentsToClass(studentIds, classId)` + `AssignStudentsModal` + `assignStudentsStore` — TAPI itu **ADD** (insert `student_classes` junction, additive, siswa bisa multi-kelas; tidak hapus kelas lama, tidak sentuh `students.class_id`).

**sm-dp7 = GANTI (replace), bukan add.** Beda semantik:

| | Existing `assignStudentsToClass` | sm-dp7 (baru) |
|---|---|---|
| `student_classes` | insert (tambah) | **replace** (hapus lama → insert baru) ATAU pindah |
| `students.class_id` | tidak disentuh | **update ke kelas baru** |
| Entry point | dalam modal (list siswa sendiri) | dari **row tabel utama** (multi-select) |

⚠️ **DECISION untuk impl (CONFIRM ke user):** "ganti kelas" =
- **(A) Replace total**: hapus SEMUA `student_classes` siswa → insert 1 kelas baru + set `students.class_id`. (paling sesuai "ganti")
- **(B) Pindah single**: kalau siswa di banyak kelas, mana yang diganti? ambigu.
**Plan default: (A) Replace** — paling jelas untuk "ganti kelas". Tapi WAJIB konfirmasi, karena hapus junction = destruktif.

⚠️ Cek dulu: bagaimana `students.class_id` vs `student_classes` dipakai (single source mana?). Baca business-rules.md §Students sebelum implement. Jangan asumsi.

## 3. Reuse Map

| Need | Reuse | File |
|---|---|---|
| Row multi-select di tabel | shared DataTable `selectable` prop **dari sm-1jj** (kalau sm-1jj sudah merge; kalau belum, build di sini & sm-1jj reuse) | `src/components/table/Table.tsx` |
| Class dropdown (scope-aware) | `getAllClasses()` / `useClasses()` | `siswa/actions/classes/actions.ts`, `@/hooks/useClasses` |
| Class sort order | two-query pattern (NEVER nested PostgREST join) | `siswa/actions/classes.ts` (lihat CLAUDE.md §Class Sort Order) |
| Batch junction insert | `insertStudentClassesBatch` | `siswa/actions/students/...` |
| Modal/Button/InputFilter/Checkbox | existing components | `components/ui`, `components/form/input` |
| StudentsTable | extend existing | `siswa/components/StudentsTable.tsx` |
| useSiswaPage | add selection state | `siswa/hooks/useSiswaPage.ts` |

**Dependency note:** sm-1jj plan adds `selectable` to shared `Table.tsx`. sm-dp7 reuses it. If sm-dp7 runs FIRST, build the `selectable` prop here (same spec) and sm-1jj reuses. Coordinate to avoid double-build — whoever lands first owns the Table change.

## 4. Architecture decisions

- New **3-layer** action `bulkChangeStudentClass` under `siswa/actions/management/` (atau `students/`): replace-class logic.
  - Layer 2 logic: `buildClassChangePlan(studentIds, targetClassId)` (pure) — what to delete/insert.
  - Layer 1 queries: `deleteStudentClassMemberships(supabase, studentIds)`, reuse `insertStudentClassesBatch`, `updateStudentsClassId(supabase, studentIds, classId)`.
  - Layer 3 action: auth + permission (who can change class? admin + guru with class access — mirror `assignStudentsToClass` guard), orchestrate, `revalidatePath`, `logActivity` (`bulk_change_class`), return `{ success, data:{ changed, skipped, failed }, message }`. Partial success.
- New **BulkChangeClassModal**: header "{N} siswa dipilih", InputFilter kelas tujuan (scoped), confirm. On success → mutate + clearSelection.
- Bulk action bar di `page.tsx` muncul saat `selectedStudentIds.size > 0`: "{N} dipilih · [Ganti Kelas] · [Batal]".

## 5. Tasks (TDD per task)

### Task 0 — Read business rules
- Read `docs/claude/business-rules.md` §Students + §Transfers. Confirm `students.class_id` vs `student_classes` source-of-truth + whether "ganti kelas" should go through transfer flow or direct. **PAUSE → confirm decision (A/B in §2) with user before coding.**

### Task 1 — Class-change logic (TDD)
- `buildClassChangePlan(studentIds, targetClassId, existingMemberships)` → `{ toDelete, toInsert, toUpdateClassId }`. Pure.
- RED: logic.test.ts — empty studentIds → empty plan; replace removes old + inserts new; idempotent if already in target.
- GREEN. `npm run test:run` → PASS.

### Task 2 — Queries (TDD-light)
- `deleteStudentClassMemberships`, `updateStudentsClassId` (+ reuse `insertStudentClassesBatch`). Mock-supabase structure tests.
- GREEN.

### Task 3 — Bulk action
- `bulkChangeStudentClass(studentIds, targetClassId)` orchestrating Layer 1+2 with auth/permission, revalidate, logActivity. Return standardized shape. Re-export in `actions/index.ts`.

### Task 4 — DataTable selection (if not already from sm-1jj)
- Add `selectable` / `selectedIds` / `onSelectionChange` to `Table.tsx` (opt-in, default off). Skip if sm-1jj already merged it — just consume.

### Task 5 — StudentsTable + useSiswaPage wiring
- StudentsTable: pass-through selection props.
- useSiswaPage: `selectedStudentIds` Set state + `clearSelection`.

### Task 6 — BulkChangeClassModal + page bar
- New `BulkChangeClassModal.tsx` (InputFilter kelas tujuan scoped to selection's kelompok, Button). Submit → `bulkChangeStudentClass`; toast changed/failed; onSuccess → mutate + clearSelection.
- page.tsx: bulk action bar when selection > 0.

### Task 7 — Verify
- `npm run type-check` → 0. `npm run test:run` → PASS.
- Manual: select 3 siswa di kelas A → ganti ke kelas B → verify `students.class_id`=B, `student_classes` hanya B (kalau decision A), kelas A hilang. Re-run idempotent.

## 6. Out of scope
- Multi-class assignment (existing AssignStudentsModal handles add).
- Cross-kelompok transfer with approval (use TransferRequestModal flow).
- Bulk edit field lain (hanya class_id).

## 7. CLAUDE.md Check
- [ ] No new table/route.
- [ ] If `selectable` Table prop lands here (not sm-1jj) → note in `docs/claude/ui-components.md`.
- [ ] New action `bulkChangeStudentClass` — if "ganti kelas" semantics decided, document in business-rules.md §Students (replace vs add).
- [ ] Confirm no conflict with transfer-request flow.

## 8. Commit message template
```
feat(siswa): bulk change student class from table multi-select (fixes #XX)

Add row multi-select to StudentsTable + BulkChangeClassModal to move many
students to a target class in one action (replace membership + update
students.class_id). Partial success, scoped permission. Reuses opt-in
DataTable row selection.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
