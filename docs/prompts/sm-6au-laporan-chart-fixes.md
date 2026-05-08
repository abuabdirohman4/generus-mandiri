CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Fix 2 masalah pada chart di Tab Materi Laporan (file: `src/app/(admin)/laporan/actions/reports/materiQueries.ts`).

BRANCH: feat/sm-6au-laporan-materi-kumulatif (lanjutan)

===== ISSUE 1: Chart hanya tampil bulan s.d. bulan yang dipilih =====

ROOT CAUSE:
`src/app/(admin)/laporan/actions/reports/materiQueries.ts` baris 353-358:

```typescript
const relevantMonths = semesterMonths.filter(m => {
    if (semester === 1) return m <= upToMonth
    return m <= upToMonth
})
```

Ini menyebabkan chart hanya tampil titik dari awal semester s.d. `upToMonth`.
Contoh: user pilih Februari (Semester 2), chart hanya tampil Jan-Feb.
User ingin: chart selalu tampil 6 bulan penuh semester, bulan setelah `upToMonth` tampil sebagai titik kosong (percentage 0).

FIX:
Ganti `relevantMonths` dengan `semesterMonths` (seluruh 6 bulan), lalu untuk bulan setelah `upToMonth` kembalikan data kosong:

```typescript
// Selalu iterasi semua 6 bulan semester
for (const m of semesterMonths) {
    // Bulan setelah upToMonth: tampil sebagai titik kosong
    if (m > upToMonth) {
        result.push({
            month: m,
            month_label: getMonthName(m as any).substring(0, 3),
            target_count: 0,
            tuntas_count: 0,
            percentage: 0,
            tercapai: '0/0'
        })
        continue
    }

    // Logika akumulasi tetap sama untuk m <= upToMonth
    targets
        .filter(t => t.month === m)
        .forEach(t => accumulatedMaterialIds.add(t.material_item_id))
    
    // ... (sisa logika tidak berubah)
}
```

Hapus baris `const relevantMonths = ...` dan ganti loop `for (const m of relevantMonths)` dengan `for (const m of semesterMonths)`.

VERIFY: User pilih Februari (Semester 2) → grafik tampil 6 titik: Jan, Feb, Mar, Apr, Mei, Jun. Mar-Jun = 0%.

===== ISSUE 2: Chart kumulatif naik-turun (tidak wajar) =====

ROOT CAUSE + KONTEKS:
Grafik kumulatif seharusnya trend naik atau flat — tidak mungkin turun karena data kumulatif (begitu materi tuntas, tidak bisa "un-tuntas"). Tapi kenyataannya grafik tampil 100%→80%→57%→54%→60%, yang naik-turun.

Kenapa bisa turun? Ini terjadi karena `target_count` (denominator) bertambah setiap bulan saat materi baru ditambahkan ke akumulasi, sementara `tuntas_count` (numerator) tidak ikut naik proporsional.

Contoh:
- Januari: 3 siswa × 5 materi = 15 total possible. 15 tuntas → 100%
- Februari: 3 siswa × 10 materi = 30 total possible (5 materi baru ditambah). Tapi hanya 15 tuntas (materi baru belum ada progress) → 50%

Ini **bukan bug logika** — ini adalah cara kalkulasi yang valid. Yang menjadi masalah adalah **interpretasi visual**: user mengira grafik harus monoton naik, padahal kenyataannya persentase bisa turun saat target baru ditambahkan.

**Solusi: Ganti label axis dan tooltip agar menjelaskan bahwa persentase dihitung dari target kumulatif s.d. bulan itu.**

FIX di `MateriTrendChart.tsx`:

Tambahkan keterangan di `fullDate` yang menjelaskan konteks kumulatif:

```typescript
const totalPossible = point.tercapai ? Number(point.tercapai.split('/')[1]) : 0
const siswaCount = point.target_count > 0 && totalPossible > 0
    ? Math.round(totalPossible / point.target_count)
    : 0
const avgPerSiswa = siswaCount > 0
    ? Math.round(point.tuntas_count / siswaCount)
    : 0

const detailLine = point.target_count === 0
    ? 'Belum ada target'
    : siswaCount > 0
        ? `Rata-rata ${avgPerSiswa} dari ${point.target_count} materi per siswa (${siswaCount} siswa)`
        : `${point.target_count} materi ditargetkan`

return {
    date: point.month_label,
    fullDate: `${getMonthName(point.month as any)} — ${detailLine}`,
    percentage: point.percentage,
    // Tidak pass details
}
```

Ini sudah benar seperti di `sm-6au-laporan-ui-fixes-2.md` — pastikan `details` dihapus dari transformedData, dan `fullDate` menggunakan format di atas.

**CATATAN PENTING untuk bulan kosong (percentage = 0, target_count = 0):**
Untuk titik bulan setelah `upToMonth` (kosong), `detailLine` akan jadi 'Belum ada target' — itu sudah cukup baik. Tooltip akan tampil:
```
Maret — Belum ada target
0% rata-rata per siswa
```

VERIFY: Hover bulan dengan data → tooltip bersih tanpa baris presensi. Hover bulan kosong → tampil "Belum ada target".

===== REFERENCE FILES =====
- @src/app/(admin)/laporan/actions/reports/materiQueries.ts (baris 301-392: fungsi getMateriCumulativeProgress)
- @src/app/(admin)/laporan/components/MateriTrendChart.tsx

===== URUTAN FIX =====
1. Fix Issue 1 di `materiQueries.ts`: ubah loop `relevantMonths` → `semesterMonths`, tambah early-return untuk m > upToMonth
2. Fix Issue 2 di `MateriTrendChart.tsx`: hapus `details`, update `fullDate` format (handle target_count === 0)
3. `npm run type-check` → 0 error
4. `npm run test:run` → semua pass

===== VERIFIKASI =====
1. User pilih Semester 2 + Februari → grafik tampil 6 titik (Jan, Feb, Mar, Apr, Mei, Jun). Mar-Jun = 0% ✓
2. User pilih Desember + Semester 1 → grafik tampil 6 titik (Jul, Agu, Sep, Okt, Nov, Des) ✓
3. Hover bulan dengan data → tooltip: "Februari — Rata-rata 2 dari 10 materi per siswa (3 siswa) / 20% rata-rata per siswa" ✓
4. Hover bulan kosong → tooltip: "Maret — Belum ada target / 0% rata-rata per siswa" ✓
5. Tidak ada baris "Pertemuan", "Peserta", "hadir/alfa", "izin/sakit" di tooltip ✓
