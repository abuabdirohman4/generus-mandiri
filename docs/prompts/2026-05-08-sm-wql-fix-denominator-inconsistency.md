CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Fix 3 bug denominator inconsistency di laporan materi. Formula kumulatif grafik sudah benar (denominator FIXED = totalUnikSemester = 24), tapi 3 tempat lain masih pakai denominator lama (materi s.d. bulan dipilih = 21).

ISSUE: sm-wql / GH-#64
BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan, branch yang sudah ada)

===== BUG 1: Card "Total Materi" menampilkan 21 bukan 24 =====

File: src/app/(admin)/laporan/actions/reports/materiQueries.ts
Fungsi: fetchMateriReport, sekitar baris 201-209

Root cause: summary.total_materials = rows.length (materi s.d. bulan dipilih)
Fix: totalUnikSemester sudah dihitung di baris 166. Tinggal dipakai di summary.

Ubah baris 205:
```typescript
// SEBELUM:
total_materials: rows.length,

// SESUDAH:
total_materials: totalUnikSemester,
```

===== BUG 2: Tabel Per Siswa menampilkan /21 bukan /24 =====

File: src/app/(admin)/laporan/actions/reports/materiQueries.ts
Fungsi: fetchMateriReportBySiswa, baris 272-338

Root cause: materialItemIds dari getMaterialItemIds() = materi s.d. bulan dipilih (21).
Dipakai sebagai total_materials dan denominator percentage.

Fix: Setelah baris 293 (const materialItemIds = await getMaterialItemIds...), tambahkan:
```typescript
// Hitung totalUnikSemester (denominator fixed = semua materi semester ini)
const classMasterIds = await getClassMasterIds(supabase, filters.classId)
const { data: allTargets } = await supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', filters.academicYearId)
    .eq('semester', filters.semester)
const totalUnikSemester = new Set((allTargets || []).map((t: any) => t.material_item_id)).size
```

Kemudian ubah return statement (baris 333-334):
```typescript
// SEBELUM:
total_materials: materialItemIds.length,
percentage: Math.round((tuntasCount / materialItemIds.length) * 100),

// SESUDAH:
total_materials: totalUnikSemester,
percentage: totalUnikSemester > 0 ? Math.round((tuntasCount / totalUnikSemester) * 100) : 0,
```

Catatan: getClassMasterIds adalah private helper yang sudah ada di baris 212 file ini.

===== BUG 3: Tab Semua/Dashboard menampilkan 60% bukan 53% =====

File: src/app/(admin)/dashboard/actions/materiMonitoring.ts
Fungsi: getMateriDashboardSummary (atau nama fungsinya yang ada di file ini)
Bagian yang perlu diubah: baris 190-231 (setelah const materialItemIds = [...])

Root cause 1: Query progressList (baris 195) hanya select nilai tanpa hafal
Root cause 2: Formula pakai denominator = materialItemIds.length (tidak fixed)
Root cause 3: Formula per-materi, bukan per-siswa

Fix 1 — ubah baris 195:
```typescript
// SEBELUM:
.select('student_id, material_item_id, nilai')

// SESUDAH:
.select('student_id, material_item_id, nilai, hafal')
```

Fix 2 — setelah baris 190 (const materialItemIds = [...new Set(targets.map(...))]), tambahkan:
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

Catatan: classMasterIds sudah tersedia di scope (query sebelum baris 140).

Fix 3 — ganti loop kalkulasi (baris 201-218) dengan:
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

// Pertahankan kalkulasi avg_nilai (refactor dari loop lama)
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

Fix 4 — update results.push (baris 220-231):
```typescript
results.push({
    class_id: cls.id,
    class_name: cls.name,
    kelompok_name: Array.isArray(cls.kelompok)
        ? (cls.kelompok[0] as any)?.name || ''
        : (cls.kelompok as any)?.name || '',
    total_materials: totalUnikSemester,
    avg_completion_rate: avgCompletionRate,
    avg_nilai: nilaiCount > 0 ? Math.round(totalNilaiSum / nilaiCount) : 0,
})
```

===== REQUIREMENTS =====

1. Ikuti urutan: Bug 1 → Bug 2 → Bug 3
2. Jalankan npm run type-check setelah selesai
3. Jalankan npm run test:run setelah selesai
4. Output per bug: "✅ Bug N fixed: [ringkasan]"
5. JANGAN ubah logika selain yang disebutkan di atas

===== VERIFIKASI =====

Setelah implementasi, hasil yang diharapkan untuk Kelas 1, Semester 2, bulan Mei:
- Card "Total Materi" → 24 (bukan 21)
- Tabel Per Siswa → X/24 (bukan X/21)
- Tab Semua / Dashboard → ~53% (bukan 60%)

===== REFERENCE FILES =====

- Plan: @docs/plans/2026-05-08-sm-6au-fix-denominator-inconsistency.md
- Rules: @CLAUDE.md
- Queries file: @src/app/(admin)/laporan/actions/reports/materiQueries.ts
- Dashboard: @src/app/(admin)/dashboard/actions/materiMonitoring.ts
- Tests: @src/app/(admin)/laporan/actions/reports/__tests__/materiQueries.test.ts
