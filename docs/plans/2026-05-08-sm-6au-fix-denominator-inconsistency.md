# Plan: Fix Denominator Inconsistency — 3 Bug Laporan Materi

**Branch:** `feat/sm-6au-laporan-materi-kumulatif` (lanjutan)
**Date:** 2026-05-08

---

## Context

Formula kumulatif grafik sudah diperbaiki (denominator FIXED = totalUnikSemester = 24). Namun 3 tempat lain masih pakai denominator lama (materi s.d. bulan dipilih = 21):

1. **Tabel Per Siswa** → `/21` bukan `/24` — `fetchMateriReportBySiswa` pakai `materialItemIds.length`
2. **Card "Total Materi"** → `21` bukan `24` — `fetchMateriReport` summary pakai `rows.length`
3. **Tab Semua / Dashboard** → `60%` bukan `53%` — `materiMonitoring.ts` pakai formula lama (denominator = materi kumulatif s.d. bulan, bukan totalUnikSemester; juga tidak include `hafal`)

---

## Bug 1 — Card "Total Materi": `21` → `24`

**File:** `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**Root cause:** Fungsi `fetchMateriReport`, baris 205:
```typescript
total_materials: rows.length,  // ❌ rows = materi s.d. bulan dipilih
```

`totalUnikSemester` sudah dihitung di baris 166 (query tanpa filter month). Tinggal dipakai.

**Fix — ubah baris 205:**
```typescript
// SEBELUM:
total_materials: rows.length,

// SESUDAH:
total_materials: totalUnikSemester,
```

**Test yang perlu diupdate:**
File: `src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts`
- Test `fetchMateriReport` (jika ada): verifikasi `summary.total_materials === totalUnikSemester` bukan `rows.length`

---

## Bug 2 — Tabel Per Siswa: `/21` → `/24`

**File:** `src/app/(admin)/laporan/actions/reports/materiQueries.ts`

**Root cause:** Fungsi `fetchMateriReportBySiswa` (baris 272–338):
```typescript
// Baris 292: materialItemIds = getMaterialItemIds(...) → hanya materi s.d. bulan dipilih = 21
const materialItemIds = await getMaterialItemIds(supabase, filters)

// Baris 333-334: dipakai sebagai denominator
total_materials: materialItemIds.length,              // ❌ 21
percentage: Math.round((tuntasCount / materialItemIds.length) * 100),  // ❌ X/21
```

**Fix — tambahkan setelah baris 293, gunakan helper `getClassMasterIds` yang sudah ada (baris 212):**

```typescript
// Hitung totalUnikSemester (denominator fixed = semua materi semester ini)
const classMasterIds = await getClassMasterIds(supabase, filters.classId)
const { data: allTargets } = await supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', filters.academicYearId)
    .eq('semester', filters.semester)
    // TANPA filter month — semua materi semester ini
const totalUnikSemester = new Set((allTargets || []).map((t: any) => t.material_item_id)).size
```

**Kemudian ubah return statement (baris 333-334):**
```typescript
// SEBELUM:
total_materials: materialItemIds.length,
percentage: Math.round((tuntasCount / materialItemIds.length) * 100),

// SESUDAH:
total_materials: totalUnikSemester,
percentage: totalUnikSemester > 0 ? Math.round((tuntasCount / totalUnikSemester) * 100) : 0,
```

**Catatan:** `getClassMasterIds` adalah private helper di baris 212 — sudah bisa digunakan karena `fetchMateriReportBySiswa` ada di file yang sama.

---

## Bug 3 — Tab Semua / Dashboard: `60%` → `53%`

**File:** `src/app/(admin)/dashboard/actions/materiMonitoring.ts`

**Root cause 1:** Query `progressList` (baris 195) hanya select `nilai` tanpa `hafal`:
```typescript
.select('student_id, material_item_id, nilai')  // ❌ hafal tidak di-fetch
```

**Root cause 2:** Formula kalkulasi (baris 202–228) pakai denominator = `materialItemIds.length` (materi s.d. bulan dipilih), bukan `totalUnikSemester`. Formula juga per-materi (bukan per-siswa):
```typescript
// Lama: per-materi average
for (const materialId of materialItemIds) {
    const tuntasCount = matProgress.filter(p => (p.nilai ?? 0) >= 70).length
    totalCompletionRate += (tuntasCount / studentIds.length) * 100
}
avg_completion_rate = totalCompletionRate / materialItemIds.length  // ❌ denominator tidak fixed
```

**Fix 1 — ubah baris 195, tambah `hafal`:**
```typescript
.select('student_id, material_item_id, nilai, hafal')
```

**Fix 2 — setelah fetch `targets` dan `materialItemIds` (baris 190), tambahkan query totalUnikSemester:**
```typescript
// Hitung totalUnikSemester (denominator fixed, tanpa filter month)
const { data: allTargets } = await supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', filters.academicYearId)
    .eq('semester', filters.semester)
    // TANPA filter month
const totalUnikSemester = new Set((allTargets || []).map((t: any) => t.material_item_id)).size
```

**Fix 3 — ganti loop kalkulasi (baris 202–228) dengan formula Per Siswa + denominator fixed:**
```typescript
// Formula Per Siswa dengan denominator fixed
let totalPctSum = 0
for (const studentId of studentIds) {
    const siswaCount = (progressList || []).filter((p: any) =>
        p.student_id === studentId &&
        materialItemIds.includes(p.material_item_id) &&
        ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
    ).length
    totalPctSum += totalUnikSemester > 0 ? (siswaCount / totalUnikSemester) * 100 : 0
}
const avgCompletionRate = studentIds.length > 0
    ? Math.round(totalPctSum / studentIds.length)
    : 0

// Hitung avg_nilai (pertahankan logika lama)
let totalNilaiSum = 0
let nilaiCount = 0
for (const materialId of materialItemIds) {
    const matProgress = (progressList || []).filter((p: any) => p.material_item_id === materialId)
    const scored = matProgress.filter((p: any) => (p.nilai ?? 0) > 0)
    if (scored.length) {
        totalNilaiSum += scored.reduce((s: number, p: any) => s + (p.nilai ?? 0), 0) / scored.length
        nilaiCount++
    }
}
```

**Fix 4 — update push ke results (baris 220–231):**
```typescript
results.push({
    class_id: cls.id,
    class_name: cls.name,
    kelompok_name: Array.isArray(cls.kelompok)
        ? (cls.kelompok[0] as any)?.name || ''
        : (cls.kelompok as any)?.name || '',
    total_materials: totalUnikSemester,   // ← fixed denominator
    avg_completion_rate: avgCompletionRate,
    avg_nilai: nilaiCount > 0 ? Math.round(totalNilaiSum / nilaiCount) : 0,
})
```

**Perlu cek:** Apakah `classMasterIds` sudah tersedia di scope saat fix ini diterapkan? Cek baris sebelum baris 190 di `materiMonitoring.ts`. Jika belum ada, tambahkan query `class_master_mappings` untuk mendapatkan `classMasterIds` dari `classId`.

---

## Urutan Eksekusi

1. **Bug 1** — `fetchMateriReport` summary: 1 baris ganti `rows.length` → `totalUnikSemester`
2. **Bug 2** — `fetchMateriReportBySiswa`: tambah query totalUnikSemester + fix denominator
3. **Bug 3** — `materiMonitoring.ts`: tambah `hafal`, query totalUnikSemester, ganti formula
4. `npm run type-check` → 0 error
5. `npm run test:run` → semua pass

---

## Verifikasi

1. Card "Total Materi" di tab Materi (mode Kumulatif, bulan Mei) → `24` ✓
2. Tabel Per Siswa → `X/24` (misalnya `13/24`) bukan `X/21` ✓
3. Persentase Per Siswa di tabel → sesuai formula baru ✓
4. Tab Semua (Overview/Dashboard) → `53%` bukan `60%` untuk Kelas 1 bulan Mei ✓
5. `npm run type-check` → 0 error ✓
6. `npm run test:run` → semua pass ✓

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini?
- [ ] Apakah ada tabel database baru yang perlu ditambahkan ke Key Tables?
- [ ] Apakah ada route/page baru yang perlu ditambahkan ke App Router Structure?
- [ ] Apakah ada permission pattern baru yang perlu didokumentasikan?
- [ ] Jika ada yang perlu diupdate → update `CLAUDE.md` atau file di `docs/claude/` setelah implementasi selesai
