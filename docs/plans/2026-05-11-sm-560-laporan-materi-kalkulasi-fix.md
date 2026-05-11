# Plan: Fix Kalkulasi Persentase + Total Materi di Laporan Tab Materi (v2 — setelah investigasi mendalam)

## Context

3 bug tersisa setelah fix pertama gagal. Root cause sudah diverifikasi melalui full code trace:

### Bug 1 — Total Materi 21 (seharusnya 24)
**File**: `materiQueries.ts` line 195  
Fix pertama membalik logika yang salah: `total_materials = materialItemIds.length` (21) → seharusnya `totalUnikSemester` (24). Alasan: summary card "Total Materi" menunjukkan total target materi seluruh semester, bukan s.d. bulan ini. Tabel `rows` tetap 21 item (s.d. bulan ini) — itu benar. Summary card = 24 = totalUnikSemester.

### Bug 2 — Chart Kumulatif Per Materi selalu 0%
**File**: `materiQueries.ts` line 412-424 (`getMateriCumulativeProgress`, mode `per_materi`)  
Masih pakai `studentIds.every(...)` — tidak diubah Antigravity. Harus ganti ke formula rata-rata per siswa (identik dengan block `per_siswa` di line 426-443).

### Bug 3 — Tab Materi 35% vs Tab Semua 40%
**File**: `materiMonitoring.ts` line 94-99  
`materiMonitoring.ts` (Tab Semua) fetch `student_enrollments` tanpa filter `students.status='active'` → siswa inactive masuk kalkulasi → inflates rata-rata ke 40%. Tab Materi sudah benar (filter siswa aktif → 35%). Fix: tambah filter `students.status='active'` di `materiMonitoring.ts` agar konsisten.

---

## Files yang Dimodifikasi

| File | Bug | Line |
|------|-----|------|
| `src/app/(admin)/laporan/actions/reports/materiQueries.ts` | Bug 1: total_materials | 195 |
| `src/app/(admin)/laporan/actions/reports/materiQueries.ts` | Bug 2: chart per_materi | 412-424 |
| `src/app/(admin)/dashboard/actions/materiMonitoring.ts` | Bug 3: students.status filter | 94-99 |

---

## TASK 1 — Fix Bug 1: total_materials di summary (materiQueries.ts line 195)

**SEBELUM (line 191-200):**
```ts
return {
    rows,
    siswaRows,
    summary: {
        total_materials: materialItemIds.length,
        avg_completion_rate: avgCompletionRate,
        class_name: className,
    }
}
```

**SESUDAH:**
```ts
return {
    rows,
    siswaRows,
    summary: {
        total_materials: totalUnikSemester,
        avg_completion_rate: avgCompletionRate,
        class_name: className,
    }
}
```

> `totalUnikSemester` sudah dihitung di line 161-167 (semua materi semester tanpa filter bulan = 24). Summary card "Total Materi" harus konsisten dengan denominator yang dipakai untuk kalkulasi rata-rata.

---

## TASK 2 — Fix Bug 2: chart per_materi 0% di getMateriCumulativeProgress (materiQueries.ts line 412-424)

Hapus logika `per_materi` yang pakai `studentIds.every`. Ganti ke formula yang sama dengan `per_siswa`.

**SEBELUM (line 412-424):**
```ts
if (viewMode === 'per_materi') {
    // Materi yang SEMUA siswa tuntas (nilai ≥70 atau hafal)
    tuntasCount = currentIds.filter(materialId =>
        studentIds.every(studentId => {
            const p = (progress || []).find((p: any) =>
                p.student_id === studentId && p.material_item_id === materialId
            )
            return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
        })
    ).length
    percentage = totalUnikSemester > 0
        ? Math.round((tuntasCount / totalUnikSemester) * 100)
        : 0
} else {
    // Per siswa: rata-rata dari totalUnikSemester
    let totalPctSum = 0
    for (const studentId of studentIds) {
        const siswaCount = currentIds.filter(materialId => {
            const p = (progress || []).find((p: any) =>
                p.student_id === studentId && p.material_item_id === materialId
            )
            return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
        }).length
        totalPctSum += totalUnikSemester > 0
            ? (siswaCount / totalUnikSemester) * 100
            : 0
    }
    percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
    tuntasCount = totalStudents > 0
        ? Math.round((totalPctSum / totalStudents / 100) * totalUnikSemester)
        : 0
}
```

**SESUDAH** — hapus if/else, selalu pakai formula rata-rata per siswa:
```ts
// Rata-rata per siswa untuk semua viewMode (per_materi dan per_siswa konsisten)
let totalPctSum = 0
for (const studentId of studentIds) {
    const siswaCount = currentIds.filter(materialId => {
        const p = (progress || []).find((p: any) =>
            p.student_id === studentId && p.material_item_id === materialId
        )
        return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
    }).length
    totalPctSum += totalUnikSemester > 0
        ? (siswaCount / totalUnikSemester) * 100
        : 0
}
percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
tuntasCount = totalStudents > 0
    ? Math.round((totalPctSum / totalStudents / 100) * totalUnikSemester)
    : 0
```

---

## TASK 3 — Fix Bug 3: filter students.status di materiMonitoring.ts (line 94-99)

**SEBELUM (line 94-99):**
```ts
const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id')
    .eq('class_id', cls.id)
    .eq('academic_year_id', filters.academicYearId)
    .eq('status', 'active')
```

**SESUDAH:**
```ts
const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, students!inner(status)')
    .eq('class_id', cls.id)
    .eq('academic_year_id', filters.academicYearId)
    .eq('status', 'active')
    .eq('students.status', 'active')
```

Ini menyebabkan Tab Semua menghitung persentase hanya dari siswa aktif — konsisten dengan Tab Materi dan halaman monitoring.

### Jalankan test

`npm run test:run` → PASS. `npm run type-check` → bersih.

---

## Verification

- [ ] Tab Materi Kumulatif: Summary card "Total Materi" = 24 (bukan 21)
- [ ] Tab Materi Per Siswa: Summary card "Total Materi" = 24
- [ ] Chart Kumulatif + Per Materi: semua bulan ada nilai (bukan 0% semua)
- [ ] Tab Materi dan Tab Semua menunjukkan persentase yang sama (atau sangat dekat)
- [ ] `npm run test:run` → pass
- [ ] `npm run type-check` → bersih

---

## Commit Message Template

```
fix(laporan): perbaiki total materi, chart per_materi, dan filter siswa inactive

- materiQueries.ts: total_materials = totalUnikSemester (bukan materialItemIds.length)
- materiQueries.ts: getMateriCumulativeProgress — hapus logika every() di per_materi, unifikasi ke rata-rata per siswa
- materiMonitoring.ts: tambah filter students.status='active' di enrollment query

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## CLAUDE.md Check
- [ ] Tidak ada pattern/arsitektur baru
- [ ] Tidak ada tabel baru
- [ ] Pattern `.eq('students.status', 'active')` konsisten dengan monitoring.ts
