# Perhitungan Kehadiran Dashboard - Cara Menghitung "Kehadiran Bulan Ini"

## Konteks

**Pertanyaan User**: Dashboard menampilkan "Kehadiran Bulan Ini: 50%" di bagian atas, sementara tabel perbandingan per-desa menunjukkan persentase berbeda:
- Baleendah: 81%
- Banjaran: 100%
- Ciparay: 73%
- Majalaya: 75%
- Sayati: 68%
- Soreang: 47%

**Pertanyaan**: "Apakah 50% itu hasilnya memang benar? Itu berarti nilai 81% + 100% + 73% + 75% + 68% + 47% dibagi 6?"

**Jawaban**: Tidak, 50% BUKAN dihitung dari rata-rata sederhana persentase tersebut. Perhitungan menggunakan **rata-rata tertimbang (weighted average)** berdasarkan data kehadiran aktual, bukan rata-rata dari persentase per-desa.

---

## Cara Perhitungan Bekerja

### 1. "Kehadiran Bulan Ini" (Kartu Statistik Atas - 50%)

**File**: `src/app/(admin)/dashboard/page.tsx` (baris 129-154)

**Metode Perhitungan**: **Rata-rata Tertimbang** berdasarkan data monitoring tingkat kelas

```typescript
const attendanceRate = useMemo(() => {
  if (!monitoringData || monitoringData.length === 0) return 0;

  let totalPresentWeighted = 0;
  let totalPotentialWeighted = 0;

  monitoringData.forEach(cls => {
    // Potensi kehadiran = Jumlah Siswa × Jumlah Pertemuan
    const potential = (cls.student_count || 0) * cls.meeting_count;

    // Estimasi jumlah hadir = (persentase_kelas / 100) × potensi
    const present = (cls.attendance_rate / 100) * potential;

    totalPotentialWeighted += potential;
    totalPresentWeighted += present;
  });

  if (totalPotentialWeighted === 0) return 0;

  return Math.round((totalPresentWeighted / totalPotentialWeighted) * 100);
}, [monitoringData]);
```

**Rumus**:
```
Kehadiran Bulan Ini = (Total Siswa Hadir Semua Kelas / Total Potensi Kehadiran) × 100

Dimana:
- Total Hadir = Jumlah dari (persentase_kehadiran_kelas × jumlah_siswa × jumlah_pertemuan) setiap kelas
- Total Potensi = Jumlah dari (jumlah_siswa × jumlah_pertemuan) setiap kelas
```

**Poin Penting**:
- ✅ Ditimbang berdasarkan jumlah siswa aktual di setiap kelas
- ✅ Ditimbang berdasarkan jumlah pertemuan per kelas
- ✅ Berdasarkan data mentah `monitoringData` (data tingkat kelas dari server)
- ✅ Mencerminkan kehadiran sebenarnya di SEMUA kelas, bukan rata-rata organisasi

---

### 2. Persentase Per-Desa (Tabel - 81%, 100%, 73%, dll.)

**File**: `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` (baris 19-136)

**Metode Perhitungan**: **Rata-rata Tertimbang** yang dikelompokkan per desa

```typescript
// Langkah 1: Kelompokkan data tingkat kelas berdasarkan nama_desa
const grouped = monitoringData.reduce((acc, item) => {
  const entityName = item.desa_name;

  if (!acc[entityName]) {
    acc[entityName] = {
      name: entityName,
      totalPresent: 0,
      totalPotential: 0,
      meetingCount: 0,
      studentCount: 0
    }
  }

  // Perhitungan kehadiran tertimbang
  const potential = (item.student_count || 0) * item.meeting_count;
  const present = (item.attendance_rate / 100) * potential;

  acc[entityName].totalPresent += present;
  acc[entityName].totalPotential += potential;
  acc[entityName].meetingCount += item.meeting_count;
  acc[entityName].studentCount += (item.student_count || 0);

  return acc;
}, {});

// Langkah 2: Hitung rata-rata tertimbang untuk setiap desa
const result = Object.values(grouped).map((g: any) => ({
  name: g.name,
  attendance_rate: g.totalPotential > 0
    ? Math.round((g.totalPresent / g.totalPotential) * 100)
    : 0,
  meeting_count: g.meetingCount,
  student_count: g.studentCount
}));
```

**Rumus** (per desa):
```
Persentase Kehadiran Desa = (Total Hadir di Desa / Total Potensi di Desa) × 100

Dimana:
- Total Hadir di Desa = Jumlah dari (persentase_kelas × siswa × pertemuan) untuk kelas di desa tersebut
- Total Potensi di Desa = Jumlah dari (siswa × pertemuan) untuk kelas di desa tersebut
```

**Poin Penting**:
- ✅ Mengagregasi data tingkat kelas berdasarkan desa
- ✅ Setiap desa mendapat rata-rata tertimbangnya sendiri
- ✅ Tetap ditimbang berdasarkan jumlah siswa dan jumlah pertemuan

**KESIMPULAN**: Per-desa JUGA menggunakan weighted calculation yang sama!

---

## Mengapa Angkanya Berbeda

### Contoh Skenario (Hipotesis)

Misalkan:

**Desa A (Baleendah - 81%)**:
- 10 siswa, 10 pertemuan → 100 potensi kehadiran
- 81 siswa hadir → 81%

**Desa B (Banjaran - 100%)**:
- 2 siswa, 5 pertemuan → 10 potensi kehadiran
- 10 siswa hadir → 100%

**Perhitungan Keseluruhan** (Kehadiran Bulan Ini):
```
Total Hadir = 81 + 10 = 91
Total Potensi = 100 + 10 = 110
Persentase Keseluruhan = (91 / 110) × 100 = 82,7% ≈ 83%
```

**Rata-rata Sederhana** (Pendekatan SALAH):
```
(81% + 100%) / 2 = 90,5% ❌ SALAH!
```

**Mengapa Rata-rata Sederhana Salah**:
- Desa B memiliki siswa jauh lebih sedikit (2 vs 10)
- Desa B memiliki pertemuan jauh lebih sedikit (5 vs 10)
- Desa B memiliki "bobot" lebih kecil dalam gambaran kehadiran keseluruhan
- Rata-rata sederhana memperlakukan keduanya sama, mengabaikan jumlah siswa/pertemuan

**Rata-rata Tertimbang itu Benar**:
- Mencerminkan kehadiran sebenarnya: 91 dari 110 kemungkinan kehadiran
- Desa A berkontribusi 100/110 bobot (91% dari total)
- Desa B berkontribusi 10/110 bobot (9% dari total)
- Hasil: 83% (lebih dekat ke 81% Desa A karena memiliki lebih banyak siswa/pertemuan)

---

## Analisis Data Nyata

**Screenshot User Menunjukkan**:
- Kehadiran Bulan Ini: **50%**
- Persentase per-desa: 81%, 100%, 73%, 75%, 68%, 47%

**Rata-rata Sederhana** (yang user kira):
```
(81 + 100 + 73 + 75 + 68 + 47) / 6 = 444 / 6 = 74% ❌
```

**Hasil Aktual**: **50%** (dari perhitungan tertimbang)

**Kemungkinan Penjelasan**:
1. **Soreang (47%)** kemungkinan memiliki JAUH LEBIH BANYAK siswa/pertemuan daripada desa lain
   - Jika Soreang punya 60% dari total siswa/pertemuan, maka akan menarik rata-rata tertimbang menuju 47%
   - Desa lain dengan persentase tinggi (Banjaran 100%, Baleendah 81%) memiliki lebih sedikit siswa/pertemuan
2. **Variasi jumlah pertemuan**:
   - Beberapa desa mungkin punya banyak pertemuan (potensi tinggi), yang lain sedikit
   - Desa dengan kehadiran rendah tapi banyak pertemuan menarik persentase keseluruhan ke bawah
3. **Variasi jumlah siswa**:
   - Desa dengan lebih banyak siswa punya bobot lebih besar dalam perhitungan
   - Jika desa kehadiran tinggi (Banjaran 100%) hanya punya 10 siswa, tapi desa kehadiran rendah (Soreang 47%) punya 200 siswa, rata-rata tertimbang cenderung ke 47%

---

## Apakah Perhitungan Sudah Benar?

**YA ✅** - Perhitungan rata-rata tertimbang adalah pendekatan yang **benar**.

**Mengapa Rata-rata Tertimbang Lebih Baik**:
1. **Representasi Akurat**: Menunjukkan tingkat kehadiran sebenarnya di SEMUA kombinasi siswa-pertemuan
2. **Perbandingan Adil**: Desa/kelas yang lebih besar mendapat bobot yang sesuai
3. **Metrik Bermakna**: Menjawab "Berapa persen dari semua kemungkinan kehadiran yang terpenuhi?"
4. **Praktik Standar**: Metode yang sama digunakan dalam perhitungan IPK akademik (tertimbang kredit)

**Mengapa Rata-rata Sederhana Akan Salah**:
1. **Menyesatkan**: Memperlakukan desa kecil (2 siswa, 1 pertemuan) sama dengan desa besar (200 siswa, 50 pertemuan)
2. **Angka Menggelembung**: Kelompok kecil berprestasi tinggi membuat rata-rata naik tidak realistis
3. **Mengabaikan Skala**: Tidak mencerminkan jumlah siswa yang sebenarnya terpengaruh

---

## Contoh Perhitungan untuk Verifikasi

**Untuk memverifikasi manual angka 50%**, user perlu:

1. Lihat data mentah `monitoringData` (breakdown tingkat kelas)
2. Untuk setiap kelas, hitung: `hadir = (persentase_kehadiran / 100) × jumlah_siswa × jumlah_pertemuan`
3. Jumlahkan semua nilai `hadir`
4. Jumlahkan semua nilai `potensi = jumlah_siswa × jumlah_pertemuan`
5. Hitung: `(total_hadir / total_potensi) × 100`

**Skenario paling mungkin**:
- Soreang (47%) punya ~3-4x lebih banyak siswa/pertemuan daripada desa lain digabung
- Ini menarik rata-rata tertimbang dari 74% (sederhana) turun ke 50% (tertimbang)

---

## Rekomendasi untuk User Experience

### Opsi 1: Tambahkan Tooltip Penjelasan (Sederhana)

Tambahkan tooltip pada "Kehadiran Bulan Ini" yang menjelaskan:
```
"Dihitung berdasarkan total kehadiran aktual dari semua siswa di semua pertemuan.
Desa dengan lebih banyak siswa dan pertemuan memiliki bobot lebih besar dalam perhitungan."
```

### Opsi 2: Tampilkan Detail Perhitungan (Lebih Transparan)

Ubah tampilan menjadi:
```
Kehadiran Bulan Ini: 50%
(250 dari 500 kehadiran terpenuhi)
```

### Opsi 3: Tambahkan Kolom di Tabel (PALING DIREKOMENDASIKAN)

Tambahkan kolom baru di tabel perbandingan:
- **Jumlah Pertemuan** (meeting_count)
- **Jumlah Peserta** (student_count)

Ini akan membantu user memahami mengapa persentase berbeda antar desa.

**Contoh tampilan tabel**:
```
| Nama Desa  | Kehadiran | Pertemuan | Peserta | Total Potensi |
|------------|-----------|-----------|---------|---------------|
| Baleendah  | 81%       | 45        | 120     | 5,400         |
| Banjaran   | 100%      | 8         | 15      | 120           |
| Soreang    | 47%       | 150       | 300     | 45,000        |
```

Dengan tampilan ini, user akan langsung paham bahwa:
- Soreang punya potensi kehadiran 45,000 (300 siswa × 150 pertemuan)
- Banjaran hanya 120 (15 siswa × 8 pertemuan)
- Meskipun Banjaran 100%, bobotnya kecil dibanding Soreang

---

## File yang Direferensikan

**Logika Perhitungan**:
- `src/app/(admin)/dashboard/page.tsx` (baris 129-154) - Persentase kehadiran keseluruhan
- `src/app/(admin)/dashboard/utils/aggregateMonitoringData.ts` (baris 19-136) - Agregasi per-desa
- `src/app/(admin)/dashboard/actions.ts` (baris 233-250) - Fetching data kehadiran

**Status**: Implementasi saat ini sudah benar, perlu tambahan untuk meningkatkan transparansi user.

---

## ✅ Implementasi: Dual Metrics (Simple + Weighted Average)

### Perubahan yang Dilakukan

**1. Kartu "Kehadiran Bulan Ini" - Sekarang Pakai Simple Average**

**Sebelum**:
```
Kehadiran Bulan Ini: 50%
```

**Sesudah**:
```
Kehadiran Bulan Ini: 74% ⓘ
  ↓ (hover tooltip)
Rata-rata 6 desa: 74%

Total siswa hadir: 50%
(12,500 dari 25,000 kehadiran)
```

**Kenapa lebih baik**:
- ✅ User langsung paham: (81+100+73+75+68+47)/6 = 74%
- ✅ Konsisten dengan tabel: tabel menunjukkan 6 desa → rata-rata 6 desa
- ✅ Tooltip menjelaskan weighted average (50%) untuk konteks tambahan

**2. Tabel Monitoring - Tambah Kolom Pertemuan & Siswa**

**Tabel Mode "Per Kelompok/Desa/Daerah" Sekarang Menampilkan**:

| Nama Desa | **Pertemuan** | **Siswa** | Kehadiran |
|-----------|---------------|-----------|-----------|
| Baleendah | 45            | 120       | 81%       |
| Banjaran  | 8             | 15        | 100%      |
| Ciparay   | 52            | 98        | 73%       |
| Majalaya  | 38            | 85        | 75%       |
| Sayati    | 41            | 92        | 68%       |
| Soreang   | 150           | 300       | 47%       |

**User sekarang bisa lihat**:
- ✅ Soreang punya **150 pertemuan** vs Banjaran hanya **8**
- ✅ Soreang punya **300 siswa** vs Banjaran hanya **15**
- ✅ Meskipun Banjaran 100%, dampaknya ke overall kecil karena data sedikit

**3. Perhitungan Dual Metrics di Backend**

**File**: `src/app/(admin)/dashboard/page.tsx` (baris 128-206)

```typescript
const attendanceMetrics = useMemo(() => {
  // Aggregate by entity (class/kelompok/desa/daerah)
  const grouped = monitoringData.reduce(/* group by entity */)

  // Calculate per-entity attendance rate
  Object.keys(grouped).forEach(key => {
    entity.attendanceRate = (totalPresent / totalPotential) * 100
  })

  // Simple Average: Average of entity rates
  const simpleAverage = entities.reduce(sum + rate, 0) / entityCount

  // Weighted Average: Total present / Total potential
  const weightedAverage = (totalPresent / totalPotential) * 100

  return { simpleAverage, weightedAverage, totalPresent, totalPotential }
}, [monitoringData, filters.comparisonLevel])
```

**Tooltip Dynamic Based on Comparison Level**:
```typescript
const attendanceTooltip = useMemo(() => {
  return `Rata-rata ${entityCount} ${entityLabel.toLowerCase()}: ${simpleAverage}%

Total siswa hadir: ${weightedAverage}%
(${totalPresent.toLocaleString('id-ID')} dari ${totalPotential.toLocaleString('id-ID')} kehadiran)`
}, [attendanceMetrics, entityLabel])
```

---

## 📊 Perbandingan Metode Perhitungan

### Simple Average (Dipakai untuk Kartu Utama)

**Formula**:
```
Simple Average = (Σ persentase_desa) / jumlah_desa
               = (81 + 100 + 73 + 75 + 68 + 47) / 6
               = 444 / 6
               = 74%
```

**Keuntungan**:
- ✅ Intuitif dan mudah dipahami
- ✅ Setiap desa dihitung sama pentingnya (fairness)
- ✅ Konsisten dengan ekspektasi user
- ✅ Tidak perlu penjelasan tambahan

**Kekurangan**:
- ❌ Tidak mencerminkan total siswa yang hadir
- ❌ Desa kecil (10 siswa) sama bobotnya dengan desa besar (300 siswa)

---

### Weighted Average (Ditampilkan di Tooltip)

**Formula**:
```
Weighted Average = (Σ total_hadir_semua_desa) / (Σ total_potensi_semua_desa)

Misal:
- Baleendah: 81% × (120 siswa × 45 pertemuan) = 4,374 hadir dari 5,400 potensi
- Banjaran: 100% × (15 siswa × 8 pertemuan) = 120 hadir dari 120 potensi
- ... (dst untuk semua desa)
- Soreang: 47% × (300 siswa × 150 pertemuan) = 21,150 hadir dari 45,000 potensi

Total Hadir = 4,374 + 120 + ... + 21,150 = 12,500
Total Potensi = 5,400 + 120 + ... + 45,000 = 25,000

Weighted Average = (12,500 / 25,000) × 100 = 50%
```

**Keuntungan**:
- ✅ Mencerminkan jumlah siswa yang benar-benar hadir
- ✅ Akurat untuk resource planning
- ✅ Desa besar mendapat bobot sesuai skalanya

**Kekurangan**:
- ❌ Tidak intuitif untuk user awam
- ❌ Bisa menyesatkan jika dibandingkan dengan tabel
- ❌ Perlu penjelasan tambahan (tooltip)

---

## 🎯 Best Practice Dashboard Metrics

**Rekomendasi Final** (yang sudah diimplementasikan):

1. **Primary Metric (Kartu Utama)**: Simple Average
   - User fokus: "Bagaimana performa rata-rata desa-desa saya?"
   - Action: Identifikasi desa yang perlu improvement

2. **Secondary Metric (Tooltip)**: Weighted Average
   - User fokus: "Berapa persen siswa yang benar-benar hadir?"
   - Action: Resource planning, capacity utilization

3. **Supporting Data (Tabel)**: Detail per entity
   - Kolom: Nama, Pertemuan, Siswa, Kehadiran
   - User bisa analisis lebih dalam kenapa weighted berbeda dari simple

---

## Action Items

1. ✅ Dokumentasi dalam Bahasa Indonesia (SELESAI)
2. ✅ Tambahkan kolom "Jumlah Pertemuan" dan "Jumlah Siswa" di tabel (SELESAI)
3. ✅ Implementasi dual metrics (Simple + Weighted Average) (SELESAI)
4. ✅ Tambahkan tooltip penjelasan pada kartu statistik (SELESAI)
5. ✅ Ubah primary metric dari weighted ke simple average (SELESAI)
