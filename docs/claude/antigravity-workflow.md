# Google Antigravity Execution Workflow

This document defines the complete workflow combining GitHub Issues, Beads, and Google Antigravity for token-efficient development.

**Role separation:**
- **Claude Code** = Project Manager / Planner (Issue creation + planning only)
- **Google Antigravity** = Executor (TDD + implementation + test runs)
- **User** = Git operations (branch, commit, push, PR)

---

## When to Use Antigravity vs Direct Execution

| Kondisi | Mode | Alasan |
|---|---|---|
| ≤ 2 files DAN < 100 lines | Direct (Claude Code) | Lebih cepat, overhead setup tidak worth it |
| ≥ 3 files ATAU ≥ 100 lines | **Antigravity (default)** | Hemat token Claude Code secara signifikan |
| Hotfix darurat | Direct | Kecepatan > efisiensi |
| Antigravity tidak tersedia | Direct | Fallback |

---

## Full SOP (Standard Operating Procedure)

### PHASE 1: Issue Creation & Planning (Claude Code executes)

1. **Buat GitHub Issue**
   ```bash
   gh issue create --title "..." --body "..."
   ```
   Catat nomor issue (misal: #16).

2. **Update Beads Issue** — link ke GitHub Issue
   ```bash
   bd update <id> --notes "GitHub Issue: https://github.com/..../issues/16 (GH-#16)"
   ```

3. **Buat implementation plan** di `docs/plans/YYYY-MM-DD-<feature>.md`
   - Format ultra-detailed — lihat **Standard Plan Format** di bawah
   - Sertakan commit message template di akhir plan

4. **Update GitHub Issue** — paste ringkasan planning sebagai tasklist di body issue (satu kali saja)

5. **Output pilihan eksekusi** — lihat **Execution Mode Output Format** di bawah

---

### PHASE 2: Branching (User executes)

Claude Code memberi instruksi:

> "Silakan jalankan: `git checkout -b feature/gh-[issue_number]-[nama_fitur]`"

Setelah user konfirmasi, Claude Code verifikasi:
```bash
git branch --show-current
```

---

### PHASE 3: Implementation & TDD (Google Antigravity executes)

User paste prompt dari output Phase 1 ke Antigravity. Antigravity eksekusi plan task-by-task.

---

### PHASE 4: Pull Request (User executes)

Setelah Antigravity selesai dan semua test PASS, jalankan perintah dari plan:

```bash
git add <file1> <file2> ...
git commit -m "feat/fix/refactor: [deskripsi] (fixes #[issue_number])

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
git push origin feature/gh-[issue_number]-[nama_fitur]
gh pr create --title "..." --body "..."
```

---

### PHASE 5: Review & Iteration

Setelah PR dibuat, pause untuk review. Jika ada feedback:

1. User bawa feedback ke Antigravity untuk perbaikan
2. Antigravity perbaiki kode → semua test PASS
3. User jalankan `git add`, `git commit`, `git push` untuk update PR
4. Merge dilakukan manual oleh User
5. Tutup Beads issue: `bd close <id>`

---

## Execution Mode Output Format

**Setelah plan selesai, Claude Code WAJIB output ini:**

```
📋 Plan siap: docs/plans/YYYY-MM-DD-<feature>.md

━━━ PILIH MODE EKSEKUSI ━━━

✅ A) Google Antigravity — RECOMMENDED
   ([N] files diubah, ~[X] lines — melebihi threshold direct execution)

   Prompt untuk Antigravity (copy-paste siap):
   ─────────────────────────────────────────
   CONTEXT:
   Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

   CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints proyek ini.

   TASK:
   Eksekusi implementation plan di @docs/plans/YYYY-MM-DD-<feature>.md

   REQUIREMENTS:
   1. Ikuti plan task-by-task secara berurutan
   2. Terapkan TDD ketat: RED (tulis test gagal) → GREEN (implementasi minimal) → REFACTOR
   3. Jalankan test setelah setiap task: npm run test:run
   4. Jangan lanjut ke task berikutnya jika ada test yang FAIL
   5. Setelah semua task selesai, jalankan: npm run type-check
   6. Output setiap selesai task: "✅ Task N complete: [ringkasan]"
   7. JANGAN deviate dari plan tanpa approval user

   REFERENCE FILES:
   - Plan: @docs/plans/YYYY-MM-DD-<feature>.md
   - Rules: @CLAUDE.md
   - Architecture: @docs/claude/architecture-patterns.md

   Mulai dari Task 1.
   ─────────────────────────────────────────

⚡ B) Direct — Claude Code eksekusi sekarang
   Pilih ini jika Antigravity tidak tersedia atau task ≤ 2 files / < 100 lines

Ketik A atau B:
```

**Threshold auto-recommend:**
- Rekomendasi **A (Antigravity)** jika: ≥ 3 files ATAU ≥ 100 lines
- Rekomendasi **B (Direct)** jika: ≤ 2 files DAN < 100 lines

---

## Standard Plan Format (Ultra-detailed)

**Tujuan:** Plan harus cukup eksplisit agar executor (AI murah / junior dev) bisa jalan **100% mandiri tanpa bertanya**.

### Aturan Wajib

1. **Exact file path selalu** — bukan "edit the filter file", tapi `src/components/shared/DataFilter.tsx:160-184`
2. **Exact code snippet** — bukan "add teacherHasMultipleKelompok param", tapi tulis interface lengkap + implementasi
3. **Exact command + expected output** — executor harus tahu apakah hasilnya benar
4. **TDD per task** — setiap task: tulis test → run (verify FAIL) → implementasi → run (verify PASS)
5. **Tulis asumsi** — jika ada ambiguity, tulis `// ASSUMPTION: ...` di plan
6. **Commit template di akhir** — sertakan exact commit message yang harus dipakai

### Contoh Task yang SALAH (terlalu ambigu)

```markdown
### Task 1: Update filterKelompokList
- Tambah parameter teacherHasMultipleKelompok
- Handle kasus teacher dengan multiple kelompok
- Update test
```

### Contoh Task yang BENAR (ultra-detailed)

```markdown
### Task 1: Update filterKelompokList — teacher multi-kelompok case

**Files:**
- Modify: `src/components/shared/dataFilterHelpers.ts` (sekitar line 113-171)
- Test: `src/components/shared/__tests__/dataFilterHelpers.test.ts`

**Step 1: Tulis failing test**

Tambahkan ke `dataFilterHelpers.test.ts` setelah describe block `filterKelompokList`:

\```typescript
it('teacher multi-kelompok independent mode: builds list from classes', () => {
  const user = {
    role: 'teacher' as const,
    daerah_id: 'daerah-1',
    desa_id: 'desa-1',
    kelompok_id: 'kelompok-1',
    classes: [
      { id: 'cls-1', kelompok_id: 'k-1', kelompok: { id: 'k-1', name: 'Kelompok 1' } },
      { id: 'cls-2', kelompok_id: 'k-2', kelompok: { id: 'k-2', name: 'Kelompok 2' } },
    ],
  }
  const result = filterKelompokList({
    kelompokList: mockKelompokList,
    desaList: mockDesaList,
    filters: emptyFilters,
    userProfile: user,
    role: detectRole(user),
    cascadeFilters: false,
    teacherHasMultipleKelompok: true, // <-- param baru
  })
  expect(result.map(k => k.id)).toEqual(['k-1', 'k-2'])
})
\```

**Step 2: Run test — verify FAIL**

```bash
npm run test:run -- src/components/shared/__tests__/dataFilterHelpers.test.ts
```
Expected output: `FAIL` dengan error "Object literal may only specify known properties, 'teacherHasMultipleKelompok' does not exist"

**Step 3: Implementasi**

Di `dataFilterHelpers.ts`, update interface `FilterKelompokParams` (sekitar line 113):

\```typescript
interface FilterKelompokParams {
  // ... existing params ...
  /** Pass true when teacher has classes spanning multiple kelompok */
  teacherHasMultipleKelompok?: boolean  // TAMBAH INI
}
\```

Update function signature (sekitar line 127) — tambah destructuring:
\```typescript
export function filterKelompokList({
  kelompokList, desaList, filters, userProfile, role, cascadeFilters,
  teacherHasMultipleKelompok = false  // TAMBAH INI
}: FilterKelompokParams): KelompokBase[] {
\```

Tambah helper function di dalam body function (sebelum if blocks):
\```typescript
const buildFromClasses = (): KelompokBase[] => {
  const seen = new Set<string>()
  const result: KelompokBase[] = []
  userProfile?.classes?.forEach(cls => {
    if (cls.kelompok_id && cls.kelompok && !seen.has(cls.kelompok_id)) {
      seen.add(cls.kelompok_id)
      result.push({ id: cls.kelompok.id, name: cls.kelompok.name, desa_id: '' })
    }
  })
  return result
}
\```

Di blok `if (!cascadeFilters)`, tambah setelah branch `isAdminDaerah || isTeacherDaerah`:
\```typescript
if (isTeacher && teacherHasMultipleKelompok) {
  return buildFromClasses()
}
\```

Di cascade mode, tambah setelah branch `isAdminDaerah || isTeacherDaerah`:
\```typescript
if (isTeacher && teacherHasMultipleKelompok) {
  return buildFromClasses()
}
\```

**Step 4: Run test — verify PASS**

```bash
npm run test:run -- src/components/shared/__tests__/dataFilterHelpers.test.ts
```
Expected output: `✓ 30 tests passed`
```

---

## Review Checklist (Claude Code setelah Antigravity selesai)

```
Google Antigravity sudah selesai mengeksekusi @docs/plans/[NAMA_FILE_PLAN].md

Tolong verifikasi hasilnya:
1. git diff — apakah perubahan sesuai dengan plan?
2. npm run test:run — apakah semua test PASS?
3. npm run type-check — apakah tidak ada type error baru?
4. Apakah ada yang terlewat dari plan?
```

---

## Troubleshooting

**Antigravity skip beberapa step:**
→ Tambahkan `// MANDATORY: Do not skip this step` di plan untuk step kritis

**Test FAIL setelah Antigravity selesai:**
→ Bawa error log ke Claude Code untuk diagnosis, lalu buat iterasi plan

**Type error baru setelah eksekusi:**
→ Jalankan `npm run type-check`, bawa hasilnya ke Claude Code untuk fix cepat

**Antigravity deviate dari plan:**
→ Restart sesi dengan prompt lebih eksplisit, referensi plan yang sama
