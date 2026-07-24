# Diskusi: Konsep Penilaian & Pelaporan Pencapaian Materi

> Dokumen ini dibuat untuk didiskusikan dengan tim kurikulum sebelum implementasi laporan kumulatif.
> Data contoh diambil dari: Kelas 1, Kelompok Warlob 1, Desa Soreang — Semester 2 TA 2025/2026

---

## 1. Kondisi Data Saat Ini

### Struktur Target Materi per Bulan

Tim kurikulum menetapkan target materi di tabel `material_monthly_targets`. Setiap bulan ada ~7–8 materi yang ditargetkan. **Satu materi bisa muncul di lebih dari satu bulan.**

Contoh data Kelas 1, Semester 2:

| Materi | Jan | Feb | Mar | Apr | Mei | Jun |
|--------|-----|-----|-----|-----|-----|-----|
| Asmaul Husna 1-40 | ✓ | ✓ | | | | |
| Kemandirian dalam lingkungan | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Masyarakat | ✓ | ✓ | ✓ | | | |
| Menulis huruf sambung | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Pengertian Quran Hadis | ✓ | ✓ | | | | |
| Praktik buang air kecil & besar | ✓ | | | | | |
| Surat Al Fiil | ✓ | ✓ | | | | |
| Tata krama di masjid | ✓ | | | | | |
| Praktik mensucikan najis | | ✓ | ✓ | | | |
| Tata krama tempat pengajian | | ✓ | | | | |
| Do'a pagi dan sore | | | ✓ | | | |
| Surat Al Humazah | | | ✓ | ✓ | | |
| Tata krama terhadap lingkungan | | | ✓ | | | |
| Thoharoh dan Sholat | | | ✓ | ✓ | | |
| Do'a masuk dan keluar masjid | | | | ✓ | | |
| Lingkungan dan alam sekitar | | | | ✓ | ✓ | ✓ |
| Praktik Sholat berjamaah | | | | ✓ | ✓ | |
| Tata krama tidur | | | | ✓ | | |
| Do'a memakai pakaian | | | | | ✓ | |
| Puasa Ramadhan | | | | | ✓ | ✓ |
| Surat Al Asr | | | | | ✓ | ✓ |
| Do'a ketika berbuka puasa | | | | | | ✓ |
| Praktik doa-doa yang dihafal | | | | | | ✓ |
| Tata krama ketika bersin | | | | | | ✓ |

**Total materi unik semester 2 = 24 materi**

---

### Status Penilaian Saat Ini (Mei 2026)

| Materi | Status Nilai |
|--------|-------------|
| Asmaul Husna 1-40 | ✓ sudah ada nilai |
| Kemandirian dalam lingkungan | ✓ sudah ada nilai |
| Masyarakat | ✓ sudah ada nilai |
| Menulis huruf sambung | ✓ sudah ada nilai |
| Pengertian Quran Hadis | ✓ sudah ada nilai |
| Praktik buang air kecil & besar | ✓ sudah ada nilai |
| Surat Al Fiil | ✓ sudah ada nilai |
| Tata krama di masjid | ✓ sudah ada nilai |
| Lingkungan dan alam sekitar | ✓ sudah ada nilai |
| Praktik Sholat berjamaah | ✓ sudah ada nilai |
| Do'a memakai pakaian | ✓ sudah ada nilai |
| Puasa Ramadhan | ✓ sudah ada nilai |
| Surat Al Asr | ✓ sudah ada nilai |
| **Praktik mensucikan najis** | ✗ belum ada nilai |
| **Tata krama tempat pengajian** | ✗ belum ada nilai |
| **Do'a pagi dan sore** | ✗ belum ada nilai |
| **Surat Al Humazah** | ✗ belum ada nilai |
| **Tata krama terhadap lingkungan** | ✗ belum ada nilai |
| **Thoharoh dan Sholat** | ✗ belum ada nilai |
| **Do'a masuk dan keluar masjid** | ✗ belum ada nilai |
| **Tata krama tidur** | ✗ belum ada nilai |
| **Do'a ketika berbuka puasa** | ✗ belum ada nilai |
| **Praktik doa-doa yang dihafal** | ✗ belum ada nilai |
| **Tata krama ketika bersin** | ✗ belum ada nilai |

**13 materi sudah ada nilai, 11 materi belum ada nilai** (per Mei 2026)

---

## 2. Masalah yang Ditemukan di Sistem

Grafik "Trend Pencapaian Materi (Kumulatif)" menampilkan persentase yang **naik-turun**, padahal harapannya naik terus tiap bulan:

```
Jan: 100% → Feb: 80% → Mar: 57% → Apr: 54% → Mei: 60% → Jun: 53%
```

Kenapa bisa turun? Karena cara hitung saat ini:

> **% = materi tuntas / (jumlah materi kumulatif × jumlah siswa)**

Setiap bulan ada materi baru masuk ke akumulasi. Kalau materi baru itu belum ada nilainya, persentase **otomatis turun** walau tidak ada yang mundur.

Contoh: Januari 8 materi, semua ada nilai → 100%. Februari +2 materi baru (belum ada nilai) → akumulasi jadi 10 materi, tapi yang tuntas tetap 8 → turun ke 80%.

---

## 3. Pertanyaan untuk Tim Kurikulum

### Pertanyaan A: Mengapa satu materi muncul di beberapa bulan?

Contoh: "Kemandirian dalam lingkungan" muncul di **semua 6 bulan** (Januari–Juni).

Kemungkinan artinya:
- **A1.** Materi ini butuh waktu lama untuk dikuasai, jadi terus diulang setiap bulan
- **A2.** Materi ini adalah "materi berulang" yang memang selalu dievaluasi setiap bulan (bisa dapat nilai berbeda tiap bulan)
- **A3.** Artinya lain?

> **Jawaban tim kurikulum:** _______________

---

### Pertanyaan B: Kapan sebuah materi dianggap "selesai dievaluasi"?

Di sistem saat ini, setiap siswa hanya punya **satu nilai** per materi per semester. Tidak ada riwayat nilai per bulan.

Apakah ini sudah sesuai? Atau seharusnya setiap bulan bisa ada nilai yang berbeda untuk materi yang sama?

> **Jawaban tim kurikulum:** _______________

---

### Pertanyaan C: Apa arti "materi belum ada nilai" di bulan berjalan?

Untuk "Praktik mensucikan najis" yang ditargetkan di Februari dan Maret tapi sampai Mei belum ada nilainya — artinya:
- **C1.** Guru belum sempat input nilai (administrasi tertinggal)
- **C2.** Memang belum diajarkan / siswa belum mencapai target
- **C3.** Materi ini di-skip

> **Jawaban tim kurikulum:** _______________

---

### Pertanyaan D: Bagaimana idealnya grafik dibaca?

Tim kurikulum mengharapkan grafik naik terus. Untuk itu, kita perlu pilih salah satu pendekatan:

**Opsi 1 — Hanya hitung materi yang sudah ada nilainya**
- Materi yang belum diinput nilai = tidak dihitung (skip)
- Grafik pasti naik
- Risiko: menyembunyikan fakta ada materi yang belum dievaluasi

**Opsi 2 — Pakai bulan terakhir target sebagai "deadline"**
- Materi "Asmaul Husna" (target Jan–Feb) → baru masuk hitungan di Februari ke atas
- Materi "Kemandirian" (target Jan–Jun) → baru masuk hitungan di Juni
- Grafik bisa naik lebih wajar
- Risiko: materi yang deadline-nya jauh tidak kelihatan di laporan awal semester

**Opsi 3 — Pisahkan laporan bulanan dan laporan semester**
- Laporan bulanan: hanya materi yang ditargetkan bulan itu (bukan kumulatif)
- Laporan semester: semua materi yang sudah pernah dinilai
- Tidak ada grafik "kumulatif per bulan"

> **Pilihan tim kurikulum:** _______________

---

## 4. Konteks Teknis (untuk referensi)

- Setiap siswa punya **1 nilai** per materi per semester di tabel `student_material_progress`
- Target materi per bulan ada di tabel `material_monthly_targets`
- Nilai ≥ 70 = tuntas. Nilai < 70 = belum tuntas
- Tidak ada timestamp kapan nilai diinput per bulan — hanya ada tanggal selesai (`completion_date`) yang saat ini masih kosong di data

---

*Dokumen ini dibuat oleh sistem Generus Mandiri — 2026-05-08*
