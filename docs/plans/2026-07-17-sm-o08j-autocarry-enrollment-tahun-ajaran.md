# Plan: Auto-Carry Enrollment saat Naik Kelas

**Issue:** sm-<TBD> / GH-#<TBD>
**Tanggal:** 2026-07-17
**Tipe:** feature
**Estimasi:** ~5 file, ~150 baris (mode A — Antigravity)

---

## Masalah

Wizard naik kelas hanya membuat `student_enrollments` tahun baru untuk siswa yang **dicentang naik**. Siswa yang **di-exclude** (ditahan di kelas sama — mis. Paud belum siap, Pra Nikah nunggu kampus) TIDAK dapat enrollment tahun ajaran baru sama sekali.

**Akibat:** siswa yang ditahan **hilang dari monitoring materi & rapot** di tahun ajaran baru, karena `monitoring.ts` & `materiQueries.ts` mengambil daftar siswa dari `student_enrollments` yang difilter `academic_year_id`. Contoh nyata: siswa Paud "Ubaidillah" di Brangsong — masih aktif ikut kegiatan tapi enrollment terakhirnya 2025/2026.

## Solusi

Saat eksekusi wizard, siswa yang **tidak naik** (excluded) tetap dibuatkan enrollment di tahun ajaran baru **di kelas yang SAMA** (auto-carry), TANPA `grade_promotion_log` (karena tidak naik tingkat).

### Aturan carry (via `category_group`)

Carry HANYA siswa yang `class_master.category_group IN ('caberawit', 'muda_mudi')`.
- `caberawit` (Paud–Kelas 6), `muda_mudi` (SMP 1–**Pra Nikah 4**) → **carry** (kelas akademik, perlu monitoring)
- `orang_tua` (Orang Tua), `null` (Lainnya) → **SKIP** (bukan kelas akademik)

> **PENTING:** Pra Nikah 4 adalah stopper (`promote_to_class_master_id = NULL`) TAPI tetap di-carry karena `category_group = 'muda_mudi'`. Aturan carry pakai `category_group`, BUKAN `promote_to NULL`. Stopper hanya menentukan "tidak naik tingkat", bukan "tidak termonitor".

### Idempotency

`upsertEnrollment` sudah pakai `onConflict: 'student_id,academic_year_id,semester'` (constraint `unique_enrollment`). Jadi siswa yang di-carry lalu belakangan dinaikkan → enrollment di-UPDATE ke kelas baru (bukan duplikat). Aman.

---

## Data existing (SUDAH dikerjakan via MCP — jangan ulang)

Backfill Kategori A (471 siswa di 29 kelompok yang SUDAH jalankan wizard) sudah dieksekusi langsung via MCP pada 2026-07-17. Enrollment ditandai `notes = 'auto-carry backfill: ...'`. **Task ini TIDAK perlu backfill lagi** — fokus fitur wizard saja. Kategori B (kelompok belum wizard) sengaja tidak di-backfill (biar admin proses via wizard).

---

## Tasks

### Task 1 — Helper filter category_group (Layer 1 query)

**File:** `src/app/(admin)/naik-kelas/actions/promotion/queries.ts`

Tambah helper untuk resolve `category_group` per class_id (dipakai untuk memutuskan carry/skip).

```typescript
/**
 * Ambil class_id → category_group untuk daftar class.
 * Dipakai auto-carry: hanya carry kelas caberawit/muda_mudi.
 */
export async function fetchCategoryGroupByClassIds(
    supabase: SupabaseClient,
    classIds: string[]
): Promise<Map<string, string | null>> {
    if (classIds.length === 0) return new Map()
    const { data } = await supabase
        .from('class_master_mappings')
        .select('class_id, class_masters:class_master_id(category_group)')
        .in('class_id', classIds)
    const map = new Map<string, string | null>()
    for (const row of (data as any[]) || []) {
        const cg = Array.isArray(row.class_masters) ? row.class_masters[0]?.category_group : row.class_masters?.category_group
        map.set(row.class_id, cg ?? null)
    }
    return map
}
```

**Test (RED→GREEN):** `queries.test.ts` — mock supabase, assert `.from('class_master_mappings')` dipanggil + map ter-bentuk.

### Task 2 — Type: tambah carry rows ke payload

**File:** `src/types/promotion.ts`

Tambah field untuk membedakan baris naik vs carry di payload eksekusi:

```typescript
export interface PromotionPayload {
    academic_year_id: string
    semester: number
    /** siswa yang NAIK — ada log promosi + pindah kelas */
    rows: { student_id: string; from_class_id: string; to_class_id: string }[]
    /** siswa yang TIDAK naik tapi di-carry ke tahun baru di kelas SAMA — tanpa log */
    carry_rows: { student_id: string; class_id: string }[]
}
```

### Task 3 — Logic: pisahkan carry-eligible (Layer 2)

**File:** `src/app/(admin)/naik-kelas/actions/promotion/logic.ts`

Tambah fungsi pure yang memisahkan siswa excluded jadi carry-eligible (caberawit/muda_mudi) vs skip.

```typescript
import { CARRY_ELIGIBLE_GROUPS } from '@/types/promotion' // atau inline const

/**
 * Dari daftar siswa excluded, pilih yang boleh di-carry (kelas akademik).
 * @param excluded siswa yang tidak dicentang naik
 * @param categoryByClassId map class_id → category_group
 */
export function buildCarryRows(
    excluded: { student_id: string; from_class_id: string }[],
    categoryByClassId: Map<string, string | null>
): { student_id: string; class_id: string }[] {
    return excluded
        .filter(r => {
            const cg = categoryByClassId.get(r.from_class_id)
            return cg === 'caberawit' || cg === 'muda_mudi'
        })
        .map(r => ({ student_id: r.student_id, class_id: r.from_class_id }))
}
```

**Test (RED→GREEN):** `logic.test.ts` — caberawit+muda_mudi ter-carry, orang_tua+null ter-skip.

### Task 4 — Actions: eksekusi carry (Layer 3)

**File:** `src/app/(admin)/naik-kelas/actions/promotion/actions.ts`

Di `executeGradePromotion`, setelah loop `valid` (naik) yang existing, tambah loop untuk `carry_rows`:

```typescript
// ... setelah loop promosi existing ...

// Auto-carry: siswa tidak naik → enrollment tahun baru, kelas SAMA, TANPA log
for (const c of payload.carry_rows ?? []) {
    try {
        const { error: enrErr } = await upsertEnrollment(supabase, {
            student_id: c.student_id,
            class_id: c.class_id,
            academic_year_id: academicYearId,
            semester: payload.semester,
            status: 'active' as const,
        })
        if (enrErr) throw new Error(enrErr.message)
        // TIDAK update students.class_id / student_classes (kelas tidak berubah)
        // TIDAK insert grade_promotion_log (tidak naik tingkat)
        result.success.push(c.student_id)
    } catch (e: any) {
        result.failed.push({ studentId: c.student_id, error: e?.message ?? 'Carry gagal' })
    }
}
```

> Catatan: `students.class_id` & `student_classes` TIDAK diubah untuk carry — kelas siswa memang tetap. Hanya enrollment tahun baru yang dibuat.

### Task 5 — Client: kirim carry_rows

**File:** `src/app/(admin)/naik-kelas/PromotionClient.tsx`

Di `handleExecute`, bangun `carry_rows` dari siswa excluded yang eligible. Butuh info `category_group` per baris — tambahkan ke `PromotionStudentRow` (via `getStudentsToPromote`) ATAU resolve di server.

**Pendekatan lebih bersih:** kirim SEMUA excluded rows ke server, server yang filter category_group (Task 3+4). Client cukup:

```typescript
const excludedRows = filteredRows.filter(r => r.excluded && r.from_class_id)

const res = await executeGradePromotion({
    academic_year_id: selectedYearId,
    semester: 1,
    rows: selectedRows.map(r => ({
        student_id: r.student_id,
        from_class_id: r.from_class_id,
        to_class_id: r.to_class_id as string,
    })),
    carry_rows: excludedRows.map(r => ({
        student_id: r.student_id,
        class_id: r.from_class_id,
    })),
})
```

Lalu di `actions.ts`, sebelum loop carry, filter `carry_rows` pakai `fetchCategoryGroupByClassIds` + `buildCarryRows` (Task 1+3) supaya orang_tua/Lainnya ter-skip di server (defense — jangan andalkan client).

**Update UI ringkasan (opsional):** tampilkan "{carryCount} siswa dipindahkan ke tahun ajaran baru (tetap di kelas)" di step konfirmasi.

### Task 6 — Buang label semester di Riwayat Kelas

**File:** `src/app/(admin)/users/siswa/[studentId]/components/EnrollmentHistory.tsx`

Hapus tampilan `· Sem {row.semester}` (baris ~42). Semester tidak informatif di riwayat kelas (selalu sem 1 untuk kenaikan, noise).

```tsx
// HAPUS block ini:
<span className="text-xs text-gray-400">· Sem {row.semester}</span>
```

> Catatan: kolom `semester` di data enrollment TIDAK dihapus (masih dipakai materi/rapot). Hanya display di komponen riwayat kelas yang dibuang.

---

## Verifikasi (setelah implementasi)

1. `npm run test:run` — semua test PASS (queries, logic).
2. `npm run type-check` — no error.
3. E2E manual: buka wizard, exclude 1 siswa Paud → proses → cek siswa itu punya enrollment tahun baru di kelas sama (via monitoring / halaman siswa).
4. Cek siswa Orang Tua yang di-exclude → TIDAK dapat enrollment (ter-skip).

## CLAUDE.md Check
- [ ] Pattern baru? Ya — auto-carry enrollment di grade promotion. Update §Grade Promotion di `docs/claude/architecture-patterns.md` (tambah paragraf auto-carry + aturan category_group).
- [ ] Tabel DB baru? Tidak.
- [ ] Route/page baru? Tidak.
- [ ] Permission baru? Tidak.
- [ ] Business rule baru? Ya — "siswa tidak naik tetap di-carry ke tahun ajaran baru (kelas akademik)". Update `docs/claude/business-rules.md` §Grade Promotion.

## Commit message (setelah selesai)

```
feat(naik-kelas): auto-carry enrollment untuk siswa tidak naik

Siswa yang di-exclude di wizard naik kelas (ditahan di kelas sama)
kini tetap dibuatkan student_enrollments di tahun ajaran baru, kelas
sama, tanpa grade_promotion_log. Hanya kelas akademik (category_group
caberawit/muda_mudi) — Orang Tua/Lainnya di-skip.

Fixes masalah siswa ditahan (Paud belum siap, Pra Nikah nunggu kampus)
hilang dari monitoring materi & rapot di tahun ajaran baru.

Juga: buang label semester di komponen Riwayat Kelas (noise).

fixes #<GH>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```
