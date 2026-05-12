# Plan: Fix Persentase Pencapaian Card Mismatch vs Chart di Tab Materi

**Issue**: sm-3ka  
**Priority**: P1 (Bug)  
**Date**: 2026-05-12

---

## Context & Problem

Di halaman `/laporan` Tab Materi, nilai "Persentase Pencapaian" di card tidak konsisten dengan nilai yang ditampilkan di chart untuk bulan yang sama:

- **Tab Kumulatif**: Card menampilkan **35%**, chart menampilkan **40%** untuk bulan Mei
- **Tab Bulanan**: Card menampilkan **62%**, chart menampilkan **71%** untuk bulan Mei

Ini membingungkan user karena ada dua angka berbeda di halaman yang sama untuk periode yang sama. Card dan chart seharusnya menampilkan nilai yang sama untuk bulan yang dipilih.

---

## Root Cause Analysis

### File yang bermasalah

`src/app/(admin)/laporan/actions/reports/materiQueries.ts`

### Bug 1: Tab Kumulatif (Card 35% vs Chart 40%)

**Card** dihitung di `fetchMateriReport()` line 188–200:

```typescript
// BUGGY: progress di-fetch untuk filteredTableItemIds (= allSemesterItemIds = 24 materi)
// tapi loop numerator pakai materialItemIds.includes() (= materi s.d. bulan ini = 21 materi)
const siswaCount = (progress || []).filter((p: any) =>
    p.student_id === studentId &&
    materialItemIds.includes(p.material_item_id) &&  // ← filter terlalu sempit (21 materi)
    ((p.nilai !== null && p.nilai >= 70) || p.done === true)
).length
totalPctSum += (siswaCount / totalUnikSemester) * 100  // ← denominator 24
```

**Chart** dihitung di `getMateriCumulativeProgress()` line 406–444:

```typescript
// CORRECT: fetch semua progress semester tanpa filter material
// Lalu iterate currentIds (accumulated s.d. bulan ini = 21 materi)
const { data: progress } = await supabase
    .from('student_material_progress')
    .select(...)
    .in('student_id', studentIds)
    // ← TIDAK ada filter .in('material_item_id', ...) ← KEY DIFFERENCE
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)

const siswaCount = currentIds.filter(materialId => {
    const p = (allProgress || []).find((p: any) =>
        p.student_id === studentId && p.material_item_id === materialId
    )
    return p && ((p.nilai !== null && p.nilai >= 70) || p.done === true)
}).length
totalPctSum += (siswaCount / totalUnikSemester) * 100  // denominator 24
```

**Perbedaan kunci**: Card menggunakan `progress` yang di-fetch dengan filter `materialItemIds` (dari `filteredTableItemIds`), tapi saat loop menggunakan `materialItemIds.includes()` sebagai filter tambahan → mengakibatkan siswa yang memiliki progress di materi bulan-bulan sebelumnya tapi tidak include di `materialItemIds` tidak terhitung.

Chart fetch semua progress semester tanpa filter material dan iterate `currentIds` secara eksplisit → lebih akurat.

### Bug 2: Tab Bulanan (Card 62% vs Chart 71%)

**Card** (line 202–204):

```typescript
// BUGGY: rata-rata per-MATERI
avgCompletionRate = rows.length > 0
    ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
    : 0
// Calculates: avg(tuntas_per_materi / total_siswa) → rata-rata antar materi
```

**Chart** `getMateriMonthlyChart()` line 511–523:

```typescript
// CORRECT: rata-rata per-SISWA
for (const studentId of studentIds) {
    const siswaCount = (progress || []).filter((p: any) =>
        p.student_id === studentId &&
        monthMaterialIds.includes(p.material_item_id) &&
        ((p.nilai !== null && p.nilai >= 70) || p.done === true)
    ).length
    totalPctSum += (siswaCount / monthMaterialIds.length) * 100
}
const percentage = Math.round(totalPctSum / totalStudents)
// Calculates: avg(tuntas_per_siswa / total_materi_bulan) → rata-rata antar siswa
```

Rata-rata per-materi vs rata-rata per-siswa menghasilkan angka berbeda (tidak commutative).

---

## Solution

Fix kalkulasi `avg_completion_rate` di `fetchMateriReport()` agar menggunakan metode yang sama persis dengan chart.

### Fix 1: Tab Kumulatif — fetch semua progress semester (konsisten dengan chart)

**File**: `src/app/(admin)/laporan/actions/reports/materiQueries.ts`  
**Lines**: 188–200

**BEFORE**:
```typescript
let avgCompletionRate: number
if (filters.reportMode === 'cumulative' && filters.month && totalUnikSemester > 0) {
    // Selalu pakai rata-rata per siswa — konsisten dengan per_siswa dan Tab Semua
    let totalPctSum = 0
    for (const studentId of studentIds) {
        const siswaCount = (progress || []).filter((p: any) =>
            p.student_id === studentId &&
            materialItemIds.includes(p.material_item_id) &&
            ((p.nilai !== null && p.nilai >= 70) || p.done === true)
        ).length
        totalPctSum += (siswaCount / totalUnikSemester) * 100
    }
    avgCompletionRate = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
} else {
    avgCompletionRate = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
        : 0
}
```

**AFTER**:
```typescript
let avgCompletionRate: number
if (filters.reportMode === 'cumulative' && filters.month && totalUnikSemester > 0) {
    // Fetch semua progress semester (konsisten dengan getMateriCumulativeProgress)
    const { data: allProgress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, done')
        .in('student_id', studentIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    let totalPctSum = 0
    for (const studentId of studentIds) {
        const siswaCount = materialItemIds.filter(materialId => {
            const p = (allProgress || []).find((p: any) =>
                p.student_id === studentId && p.material_item_id === materialId
            )
            return p && ((p.nilai !== null && p.nilai >= 70) || p.done === true)
        }).length
        totalPctSum += (siswaCount / totalUnikSemester) * 100
    }
    avgCompletionRate = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
} else {
    // Rata-rata per-siswa (konsisten dengan getMateriMonthlyChart)
    let totalPctSum = 0
    for (const studentId of studentIds) {
        const siswaCount = (progress || []).filter((p: any) =>
            p.student_id === studentId &&
            ((p.nilai !== null && p.nilai >= 70) || p.done === true)
        ).length
        totalPctSum += filteredTableItemIds.length > 0
            ? (siswaCount / filteredTableItemIds.length) * 100
            : 0
    }
    avgCompletionRate = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
}
```

---

## Tasks

### Task 1: TDD — Tulis failing tests dulu

File test: `src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts`

Jika belum ada, buat file test baru. Tambahkan test cases:

```typescript
// Test 1: cumulative mode card harus sama dengan nilai chart bulan terpilih
it('cumulative avg_completion_rate harus konsisten dengan getMateriCumulativeProgress untuk bulan yang sama', async () => {
    // Setup mock data: 2 students, 3 materials (Jan: 2, Feb: 1)
    // Student A: tuntas materi 1 (Jan), materi 3 (Feb)
    // Student B: tuntas materi 1 (Jan) saja
    // Bulan dipilih: Feb (totalUnikSemester = 3, materialItemIds untuk s.d. Feb = 3)
    // Expected card value: sama dengan chart value untuk Feb
    // ... mock supabase dan assert avgCompletionRate === chartPercentageForFeb
})

// Test 2: monthly mode card harus sama dengan nilai chart bulan terpilih
it('monthly avg_completion_rate harus konsisten dengan getMateriMonthlyChart untuk bulan yang sama', async () => {
    // Setup: 2 students, bulan Feb punya 2 materi
    // Expected: rata-rata per-siswa bukan rata-rata per-materi
})
```

**Command**: `npm run test:run -- --testPathPattern=materiQueries`  
**Expected**: Tests FAIL (RED phase)

### Task 2: Implementasi fix di materiQueries.ts

Edit `src/app/(admin)/laporan/actions/reports/materiQueries.ts`:

Ganti block `let avgCompletionRate: number` (line 188–205) dengan kode AFTER dari bagian Solution di atas.

**Command**: `npm run test:run -- --testPathPattern=materiQueries`  
**Expected**: Tests PASS (GREEN phase)

### Task 3: Verifikasi type-check

```bash
npm run type-check
```
**Expected**: No errors

### Task 4: Verifikasi manual di browser

1. Buka `/laporan` → Tab Materi → Tab Kumulatif
2. Pilih Kelas 1, bulan Mei 2026 → card harus menunjukkan **40%** (sama dengan titik Mei di chart)
3. Switch ke Tab Bulanan → card harus menunjukkan **71%** (sama dengan titik Mei di chart)
4. Test bulan lain (mis. Jan, Apr) → pastikan card = chart untuk setiap bulan
5. Test dengan kategori spesifik → pastikan konsisten

---

## Files Modified

| File | Perubahan |
|------|-----------|
| `src/app/(admin)/laporan/actions/reports/materiQueries.ts` | Fix kalkulasi `avg_completion_rate` di `fetchMateriReport()` line 188–205 |
| `src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts` | Tambah test cases untuk konsistensi card vs chart |

---

## Commit Message Template

```
fix(laporan): fix persentase pencapaian card mismatch vs chart di Tab Materi

- Tab Kumulatif: card fetch semua progress semester (konsisten dengan chart)
  sebelumnya: materialItemIds.includes() filter terlalu sempit → 35%
  sekarang: iterate materialItemIds dari allProgress → 40% (cocok chart)
- Tab Bulanan: ganti rata-rata per-materi ke rata-rata per-siswa
  sebelumnya: avg(tuntas/total_siswa per materi) → 62%
  sekarang: avg(tuntas/total_materi per siswa) → 71% (cocok chart)

fixes #GH_NUMBER

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Apakah ada pattern/arsitektur BARU yang diperkenalkan di task ini? **Tidak — bug fix saja**
- [ ] Apakah ada tabel database baru? **Tidak**
- [ ] Apakah ada route/page baru? **Tidak**
- [ ] Apakah ada permission pattern baru? **Tidak**
- [ ] Jika ada yang perlu diupdate → update `CLAUDE.md` atau file di `docs/claude/` setelah implementasi selesai
