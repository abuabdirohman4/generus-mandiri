# Plan: Bugfix Naik Kelas (3 Bug)

**Date:** 2026-06-24
**Issue:** sm-xxx (belum dibuat)
**GH Issue:** TBD

---

## Context

Fitur `/naik-kelas` ditemukan 3 bug setelah diuji:

1. **Bug #1 (Kelas bertambah, bukan pindah):** `executeGradePromotion` hanya upsert entry baru ke `student_classes` tapi TIDAK menghapus entry lama. Siswa jadi punya 2 entry (kelas lama + kelas baru). Root cause: `upsertStudentClass()` di `queries.ts` pakai `ignoreDuplicates: true` — tidak ada `deleteStudentClass()`.

2. **Bug #2 (Tombol "Selesai" tidak redirect ke beranda):** Step 4 (Hasil) punya tombol "Selesai / Naik Kelas Lagi" yang reset state ke Step 1, bukan navigate ke `/home`. Lebih baik redirect ke `/home` setelah selesai.

3. **Bug #3 (Mobile layout berantakan):** Row siswa di Step 2 pakai `flex items-center justify-between` horizontal. Nama panjang mendorong info kelas ("Kelas 1 → Kelas 2") ke baris berikutnya secara tidak konsisten. Fix: ubah layout menjadi **2 baris** — nama di atas (dengan `truncate`), info kelas di bawah dalam warna sekunder.

---

## Files to Modify

| File | Bug |
|---|---|
| `src/app/(admin)/naik-kelas/actions/promotion/queries.ts` | Bug #1 — tambah `deleteStudentClass()` |
| `src/app/(admin)/naik-kelas/actions/promotion/actions.ts` | Bug #1 — panggil delete sebelum upsert |
| `src/app/(admin)/naik-kelas/PromotionClient.tsx` | Bug #2 + Bug #3 |

---

## Task 1 — Bug #1: Delete old student_classes before insert new

### 1a. Tambah `deleteStudentClass()` di `queries.ts`

File: `src/app/(admin)/naik-kelas/actions/promotion/queries.ts`

Tambah setelah `updateStudentClassId`:

```typescript
/** Hapus relasi siswa-kelas lama sebelum naik kelas. */
export async function deleteStudentClass(supabase: SupabaseClient, studentId: string, classId: string) {
    return await supabase
        .from('student_classes')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', classId)
}
```

### 1b. Panggil `deleteStudentClass()` di `actions.ts`

File: `src/app/(admin)/naik-kelas/actions/promotion/actions.ts`

Import `deleteStudentClass` dari `./queries`.

Dalam loop `for (const row of valid)`, **setelah** `upsertEnrollment` sukses dan **sebelum** `upsertStudentClass`, tambah:

```typescript
// Hapus entry lama student_classes (kelas asal)
const { error: delErr } = await deleteStudentClass(supabase, row.student_id, row.from_class_id)
if (delErr) throw new Error(delErr.message)
```

Urutan per siswa menjadi:
1. `upsertEnrollment` ✓
2. `updateStudentClassId` ✓
3. `deleteStudentClass(from_class_id)` ← NEW
4. `upsertStudentClass(to_class_id)` ✓
5. `insertPromotionLog` ✓

### TDD Task 1

Test file: `src/app/(admin)/naik-kelas/actions/promotion/__tests__/logic.test.ts`

Tambah test untuk verifikasi `deleteStudentClass` dipanggil dengan `from_class_id`:

```typescript
it('should delete old student_classes before inserting new', async () => {
    // mock supabase dengan spy pada .delete()
    // pastikan delete dipanggil dengan from_class_id
    // pastikan upsert dipanggil dengan to_class_id
})
```

> Note: Ini integration test di layer actions — boleh defer. Core fix di queries + actions sudah cukup.

---

## Task 2 — Bug #2: Redirect ke /home setelah selesai

File: `src/app/(admin)/naik-kelas/PromotionClient.tsx`

### Perubahan

Tambah import `useRouter` dari `next/navigation`:

```typescript
import { useRouter } from 'next/navigation'
```

Di dalam komponen, tambah:

```typescript
const router = useRouter()
```

Di Step 4, ubah tombol "Selesai / Naik Kelas Lagi" menjadi **2 tombol**:

```tsx
<div className="flex justify-between mt-6">
    <Button
        variant="outline"
        onClick={() => {
            setStep(1)
            setSelectedIds(new Set())
            setSelectedCount(0)
            setRows([])
            setResult(null)
            setDataFilters(EMPTY_FILTERS)
            setSearch('')
            setSelectedYearId(defaultYearId)
        }}
    >
        Naik Kelas Lagi
    </Button>
    <Button variant="primary" onClick={() => router.push('/home')}>
        Selesai
    </Button>
</div>
```

> Rationale: "Naik Kelas Lagi" reset wizard, "Selesai" ke `/home`. User yang mau proses batch lagi bisa pakai tombol kiri.

---

## Task 3 — Bug #3: Mobile layout 2 baris

File: `src/app/(admin)/naik-kelas/PromotionClient.tsx`

### Perubahan di Step 2 — row siswa

Cari baris di `grouped.map(...)` → `g.rows.map(r => ...)`:

**Sebelum:**
```tsx
<div key={r.student_id} className="px-4 py-2 flex items-center justify-between text-sm">
    <Checkbox
        checked={!r.excluded && !!r.to_class_id}
        disabled={!r.to_class_id}
        onChange={() => toggleExclude(r.student_id)}
        label={r.student_name}
        className={r.excluded || !r.to_class_id ? 'line-through' : ''}
    />
    <span className="text-gray-500 dark:text-gray-400">
        {r.from_class_name} → {r.to_class_name ?? '(tidak ada)'}
    </span>
</div>
```

**Sesudah:**
```tsx
<div key={r.student_id} className="px-4 py-2 flex items-start gap-3 text-sm">
    <div className="pt-0.5 shrink-0">
        <Checkbox
            checked={!r.excluded && !!r.to_class_id}
            disabled={!r.to_class_id}
            onChange={() => toggleExclude(r.student_id)}
        />
    </div>
    <div className="min-w-0 flex-1">
        <div className={`truncate font-medium text-gray-900 dark:text-white ${r.excluded || !r.to_class_id ? 'line-through' : ''}`}>
            {r.student_name}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {r.from_class_name} → {r.to_class_name ?? '(tidak ada)'}
        </div>
    </div>
</div>
```

> Perubahan:
> - Checkbox pisah dari label (pakai `gap-3` + `flex items-start`)
> - Nama siswa: `truncate` + `font-medium` di baris sendiri
> - Info kelas: `text-xs` di baris bawah, selalu visible
> - `min-w-0 flex-1` mencegah overflow merusak layout

---

## Verification

1. Jalankan naik kelas untuk 1 siswa → cek `student_classes` di DB: harus ada 1 row saja (kelas baru), bukan 2.
2. Setelah submit Step 3, lihat Step 4 Hasil → klik "Selesai" → harus redirect ke `/home`.
3. Di mobile (atau DevTools narrow viewport), Step 2 student list → nama panjang harus truncate, info kelas selalu 1 baris di bawah.

SQL verify Bug #1 (setelah naik kelas):
```sql
SELECT student_id, class_id FROM student_classes WHERE student_id = '<student-uuid>';
-- Harus return 1 row saja (kelas baru)
```

---

## Execution Mode

3 file dimodifikasi, ~50 baris perubahan → **Mode B (direct)**.

---

## CLAUDE.md Check
- [ ] Pattern baru? Tidak — ini bugfix existing logic
- [ ] Tabel DB baru? Tidak
- [ ] Route baru? Tidak
- [ ] Permission pattern baru? Tidak
