# Pola Penggunaan Section per Hari

Berdasarkan analisis file materi per bulan (Juli - Desember Semester 1), berikut adalah pola penggunaan 12 section yang berbeda untuk setiap hari dalam seminggu:

## Mapping Section ke Kode

1. **quran** - Baca Al-Qur'an
2. **hafalan** - Hafalan (Surat/Dalil/Do'a)
3. **akhlaq** - Akhlaqul Karimah
4. **hadits** - Hadits
5. **keilmuan** - Materi Dasar Keagamaan
6. **makna** - Makna Al-Qur'an
7. **pegon** - Nulis Pegon
8. **asma** - Asma'ul Husna
9. **tajwid** - Tajwid
10. **adab** - Adab/Tatakrama
11. **praktek** - Praktek Ibadah
12. **ekstrakurikuler** - Ekstrakurikuler

## Pola Per Hari

### 📅 SENIN

**Section yang digunakan:**
- **quran** - Baca Al-Qur'an (selalu ada)
- **hafalan** - Hafalan Dalil-dalil: Tri Sukses Generasi Penerus / Enam Thobiat Luhur Jama'ah
- **keilmuan** - Keilmuan: Materi Dasar Keagamaan (selalu ada)
- **akhlaq** - Akhlaqul Karimah (kadang-kadang, tergantung minggu/bulan)

**Format:**
```
#### Baca Al-Qur'an
- Baca Al-Qur'an: juz X
- Hafalan Dalil-dalil: [Topik]
- Keilmuan: Materi Dasar Keagamaan
[Konten keilmuan]
- Akhlaqul Karimah (opsional)
[Konten akhlaq]
```

**Ringkasan:**
- **SENIN** = quran + hafalan + keilmuan + (akhlaq) [opsional]

---

### 📅 SELASA

**Section yang digunakan:**
- **hafalan** - Hafalan Surat (selalu ada)
- **pegon** - Nulis Pegon (selalu ada)

**Format:**
```
#### Hafalan
- Hafalan Surat : Surat [Nama] ﴾[No]﴿
[Isi surat lengkap]
- Nulis Pegon
```

**Ringkasan:**
- **SELASA** = hafalan + pegon

---

### 📅 RABU

**Section yang digunakan:**
- **hafalan** - Hafalan Do'a (selalu ada)
- **akhlaq** - Akhlaqul Karimah (selalu ada)
- **hadits** - Hadits (selalu ada)

**Format:**
```
#### Do'a
- Hafalan Do'a: [Nama Do'a]
[Isi do'a]

#### Akhlaqul Karimah
- Akhlaqul Karimah; 헣헿헶헯헮헱헶
[Konten akhlaq]

#### Hadits
- Hadits : K. Adab
```

**Ringkasan:**
- **RABU** = hafalan + akhlaq + hadits

---

### 📅 KAMIS

**Section yang digunakan:**
- **quran** - Baca Al-Qur'an (selalu ada)
- **makna** - Makna Al-Qur'an (selalu ada)
- **pegon** - Terampil menulis makna pegon (selalu ada)
- **asma** - Asma'ul Husna (selalu ada)

**Format:**
```
#### Baca Al-Qur'an
- Baca Al-Qur'an: juz X

#### Kegiatan Harian
- Makna Al-Qur'an
- Terampil menulis makna pegon
- Asma'ul Husna: no 1 - 99.
```

**Ringkasan:**
- **KAMIS** = quran + makna + pegon + asma

---

### 📅 JUM'AT

**Section yang digunakan:**
- **tajwid** - Tajwid (selalu ada)
- **adab** - Adab/Tatakrama (selalu ada)
- **praktek** - Praktek Ibadah (selalu ada)

**Format:**
```
#### Kegiatan Harian
- Tajwid: Mempraktikkan tajwid yang sudah dipelajari dalam membaca Al-Qur'an juz X

- Adab/Tatakrama;
[Konten adab dengan berbagai sub-topik]

- Praktek Ibadah
[Konten praktek ibadah]
```

**Ringkasan:**
- **JUM'AT** = tajwid + adab + praktek

---

### 📅 SABTU

- **ekstrakurikuler** - Ekstrakurikuler

---

## Ringkasan Lengkap

| Hari | Section yang Digunakan | Jumlah |
|------|------------------------|--------|
| **Senin** | quran, hafalan, keilmuan, (akhlaq) | 3-4 |
| **Selasa** | hafalan, pegon | 2 |
| **Rabu** | hafalan, akhlaq, hadits | 3 |
| **Kamis** | quran, makna, pegon, asma | 4 |
| **Jum'at** | tajwid, adab, praktek | 3 |
| **Sabtu** | - ekstrakurikuler | 1 |

---

## Catatan Penting

1. **Pola konsisten**: Pola penggunaan section ini tampak sangat konsisten dari bulan Juli hingga Desember.

3. **Hafalan** muncul di 3 hari berbeda dengan konteks berbeda:
   - Senin: Hafalan Dalil-dalil
   - Selasa: Hafalan Surat
   - Rabu: Hafalan Do'a

4. **Pegon** muncul di 2 hari berbeda:
   - Selasa: Nulis Pegon (fokus pada menulis)
   - Kamis: Terampil menulis makna pegon (fokus pada makna)

5. **quran** muncul di 2 hari:
   - Senin: Baca Al-Qur'an dengan hafalan dalil dan keilmuan
   - Kamis: Baca Al-Qur'an dengan makna, pegon, dan asma

---

## Rekomendasi untuk Database/System

Jika akan membuat struktur database atau form untuk input materi:

### Hari Senin
- Required: quran, hafalan, keilmuan
- Optional: akhlaq

### Hari Selasa
- Required: hafalan, pegon

### Hari Rabu
- Required: hafalan, akhlaq, hadits

### Hari Kamis
- Required: quran, makna, pegon, asma

### Hari Jum'at
- Required: tajwid, adab, praktek

### Hari Sabtu
- Required: ekstrakurikuler

