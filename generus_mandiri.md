# Generus Mandiri - Penjelasan Proyek

## **Apa itu Generus Mandiri?**

**Generus Mandiri** adalah sistem manajemen digital untuk kegiatan pendidikan agama generus (generasi penerus) di LDII (Lembaga Dakwah Islam Indonesia). Ini bukan aplikasi untuk sekolah formal, melainkan untuk mengelola kegiatan belajar Al-Qur'an dan agama Islam yang diselenggarakan di setiap tingkatan organisasi LDII.

---

## **1. Fungsi Utama**

Aplikasi ini berfungsi untuk:
- ✅ **Manajemen Kehadiran** - Mencatat presensi santri di setiap pertemuan (Pembinaan, ASAD, Sambung Desa, dll.)
- ✅ **Laporan & Statistik** - Monitoring progress santri (tingkat kehadiran, pencapaian hafalan)
- ✅ **Rapot Digital** - Generate rapor untuk setiap jenjang kelas dengan template yang bisa dikustomisasi
- ✅ **Manajemen Kelas** - Organisasi kelas berdasarkan jenjang (PAUD, Kelas 1-6, Pra Remaja, Remaja, Pra Nikah, Orang Tua, Pengajar)
- ✅ **Materi Pembelajaran** - Repository materi pembelajaran dengan rich text editor (TipTap)
- 🚧 **Monitoring Hafalan** - Tracking hafalan surat, doa, dan bacaan Al-Qur'an/Hadist (dalam development)

---

## **2. Siapa Penggunanya?**

### **4 Role Utama:**

1. **Superadmin** - Akses penuh ke seluruh sistem
2. **Admin** (3 level berdasarkan struktur organisasi LDII):
   - **Admin Daerah** (setara DPD) - Akses data di tingkat daerah
   - **Admin Desa** (setara PC) - Akses data di tingkat desa
   - **Admin Kelompok** (setara PAC) - Akses data di tingkat kelompok
3. **Pengajar/Guru** - Mengelola kelas yang mereka ajar (input kehadiran, lihat rapor)
4. **Santri** - (Future) Melihat data pribadi, rapor, dan materi pembelajaran

---

## **3. Konteks Penggunaan**

### **Struktur Organisasi:**
```
Daerah (DPD)
  └─ Desa (PC)
      └─ Kelompok (PAC)
```

### **Jenjang Kelas:**
- 🧒 **PAUD** - Pra-sekolah
- 📚 **Kelas 1-6** (Caberawit) - Setara SD
- 🎒 **Pra Remaja** - Setara SMP
- 🎓 **Remaja** - Setara SMA
- 💍 **Pra Nikah** - Setara kuliah sampai belum menikah
- 👨‍👩‍👧 **Orang Tua** - Kelas untuk orang tua
- 👨‍🏫 **Pengajar** - Kelas pelatihan pengajar

### **Tipe Pertemuan:**
- **Pembinaan** - Pertemuan kelas reguler
- **ASAD** - Kegiatan ASAD (tidak termasuk PAUD & Pengajar)
- **Sambung Kelompok/Desa/Daerah/Pusat** - Pertemuan lintas kelas di berbagai level organisasi

---

## **4. Status Deployment**

### ✅ **Sudah digunakan di 4 kelompok:**
- 1 kelompok di Daerah Kendal
- 3 kelompok di Daerah Bandung Selatan 2

### 🎯 **Target**:
Memperluas ke seluruh kelompok LDII se-Indonesia

---

## **5. Teknologi & Fitur Unggulan**

- 🔐 **Row Level Security (RLS)** - Keamanan data berbasis role dan organisasi
- 📱 **Progressive Web App (PWA)** - Bisa diinstall di HP seperti aplikasi native
- 💾 **Offline-first** - Cache data untuk performa optimal di koneksi lambat
- 📊 **Real-time Reports** - Statistik kehadiran dan progress santri
- 📄 **PDF Export** - Generate rapor dalam format PDF
- ✅ **Test Coverage 90%+** - Kualitas kode terjaga dengan unit testing (Vitest)

### **Tech Stack:**
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Row Level Security)
- **State Management**: Zustand (persisted to localStorage) + SWR (data fetching)
- **UI Components**: Ant Design, Shadcn/ui, Recharts
- **Testing**: Vitest + @testing-library/react (126+ tests passing)
- **PDF Generation**: @react-pdf/renderer
- **Rich Text Editor**: TipTap

---

## **6. Nilai & Tujuan**

### 🤲 **Proyek Probono (Jariyah)**
- Dibuat dengan niat ibadah (pahala jariyah)
- Gratis untuk seluruh LDII, tidak diperjualbelikan
- Open source dengan fokus pada kualitas dan maintainability

### 🎯 **Tujuan:**
1. Memudahkan pengajar dalam mengelola kelas dan kehadiran
2. Membantu pengurus memantau progress generus di wilayahnya
3. Menyediakan data analytics untuk evaluasi program pendidikan
4. Mendigitalisasi proses raporan yang sebelumnya manual

### 🔒 **Khusus Internal LDII**
Tidak untuk publik/umum

---

## **7. Roadmap Fitur**

### **✅ Sudah Tersedia:**
- Manajemen siswa, kelas, pengajar, admin
- Input kehadiran multi-kelas
- Laporan kehadiran bulanan/tahunan
- Rapot digital dengan template builder
- Materi pembelajaran dengan rich text
- Filter data by organisasi (Daerah/Desa/Kelompok)
- Approval-based transfer workflow untuk siswa
- Soft delete & hard delete dengan permission system
- PWA support (install di HP seperti app native)

### **🚧 Dalam Pengembangan:**
- Monitoring hafalan surat & doa
- Tracking bacaan Al-Qur'an & Hadist
- Tahun ajaran otomatis
- Dashboard analytics yang lebih lengkap
- Notifikasi untuk orang tua (via WhatsApp?)
- Export data ke Excel/CSV

### **💡 Wishlist (Future):**
- Integrasi dengan sistem pembayaran (infaq/SPP)
- Mobile app native (React Native/Flutter)
- Gamification untuk motivasi santri
- Video conference untuk kelas online
- Library digital (e-book, audio murotal)

---

## **8. Keunggulan Kompetitif**

### **Dibanding Aplikasi Manajemen Sekolah Lain:**

| Fitur | Generus Mandiri | Aplikasi Umum |
|-------|-----------------|---------------|
| **Konteks LDII** | ✅ Disesuaikan dengan struktur organisasi & terminologi LDII | ❌ Generic, tidak spesifik |
| **Multi-level Org** | ✅ 3 level hierarki (Daerah/Desa/Kelompok) | ❌ Biasanya hanya 1 institusi |
| **Meeting Types** | ✅ ASAD, Pembinaan, Sambung (multi-class) | ❌ Hanya kelas reguler |
| **Rapot Custom** | ✅ Template builder drag-and-drop | ⚠️ Template fixed |
| **Probono** | ✅ Gratis selamanya | ❌ Berlangganan bulanan |
| **Open Source** | ✅ Kode terbuka, bisa di-customize | ❌ Proprietary |
| **Offline Support** | ✅ PWA dengan cache | ⚠️ Kadang tidak ada |
| **Test Coverage** | ✅ 90%+ (high quality) | ⚠️ Tidak tahu |

---

## **9. Kontribusi & Development**

### **Development Guidelines:**
- **TDD (Test-Driven Development)** - Wajib untuk business logic & permissions
- **Type Safety** - TypeScript strict mode
- **Code Quality** - ESLint + Prettier
- **Documentation** - Lengkap di CLAUDE.md

### **Cara Berkontribusi:**
1. Fork repository
2. Buat branch fitur baru
3. Tulis tests dulu (TDD)
4. Implement fitur
5. Pastikan semua tests passing (`npm run test`)
6. Submit pull request

### **Contact:**
- **Developer**: Abu Abdirohman
- **GitHub**: [Link repository jika ada]
- **Email**: [Email jika mau dishare]

---

## **10. License & Usage**

📜 **License**: [Tentukan: MIT / GPL / Custom for LDII only]

⚠️ **Batasan Penggunaan:**
- ✅ Gratis untuk semua kelompok LDII
- ✅ Boleh di-fork dan di-customize untuk kebutuhan kelompok
- ❌ TIDAK boleh dijual atau dikomersilkan
- ❌ TIDAK boleh digunakan di luar lingkungan LDII

---

## **Penutup**

**Generus Mandiri** adalah bukti bahwa teknologi dapat digunakan untuk mempermudah dakwah dan pendidikan agama. Dengan sistem yang terstruktur, pengajar dapat fokus pada pengajaran, bukan administrasi. Pengurus dapat memantau progress dengan data real-time, dan santri mendapat pengalaman belajar yang lebih terorganisir.

> *"Sebaik-baik manusia adalah yang paling bermanfaat bagi manusia lain."* (HR. Ahmad, ath-Thabrani)

Semoga aplikasi ini menjadi amal jariyah yang terus mengalir manfaatnya. Aamiin.

---

**Last Updated**: 16 Februari 2026