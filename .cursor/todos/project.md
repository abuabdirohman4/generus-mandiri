**Judul Proyek:** Pembangunan Aplikasi Absensi "Warlob App"

**Tujuan Utama:** Anda ditugaskan untuk membangun aplikasi web absensi siswa bernama "Warlob App". Aplikasi ini bertujuan untuk menyediakan sistem absensi digital yang cepat, mudah, dan efisien bagi para guru. Fase pertama ini fokus pada fungsionalitas absensi inti.

**1. Spesifikasi Teknologi**

  * **Framework:** Next.js 15.2.3 (menggunakan App Router)
  * **Database & Backend:** Supabase
  * **Styling:** Tailwind CSS (integrasikan dengan template TailAdmin yang sudah dimodifikasi)
  * **Data Fetching:** SWR
  * **State Management Global:** Zustand

**2. Pengaturan Database (Supabase)**
Gunakan skrip SQL berikut untuk membuat skema tabel yang diperlukan di Supabase.

```sql
-- 1. Tabel untuk menyimpan data pengguna (guru, admin)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'teacher'
);

-- 2. Tabel kelas
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL -- Tidak ada UNIQUE constraint
);

-- 3. Tabel siswa
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gender TEXT, -- "Laki-laki" atau "Perempuan"
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE
);

-- 4. Tabel untuk mencatat log absensi
CREATE TABLE attendance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  -- 'H': Hadir, 'I': Izin, 'S': Sakit, 'A': Alpha
  status CHAR(1) NOT NULL,
  reason TEXT, -- Alasan jika status 'I'
  recorded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('Asia/Singapore'::text, now()) NOT NULL,
  -- Tambahkan constraint agar satu siswa hanya punya satu entri per hari
  UNIQUE(student_id, date)
);
```

**3. Alur Autentikasi & Manajemen Pengguna**

  * **Tanpa Pendaftaran Publik:** Tidak ada halaman `/register`. Pengguna (guru) tidak bisa mendaftar sendiri.
  * **Login dengan Username:** Halaman login (`/login`) hanya meminta **Username** dan **Password**.
  * **Konvensi Username-Email:** Di backend, konversikan username menjadi email dengan format `[username]@warlob.app` untuk berkomunikasi dengan Supabase Auth.
  * **Pendaftaran oleh Admin:**
      * Buat halaman khusus admin, misalnya `/admin/users/create`, yang dilindungi.
      * Form di halaman ini akan mengirim data (username, password, nama lengkap) ke sebuah **Next.js API Route** atau **Server Action**.
      * Di dalam server-side logic, gunakan **`service_role` key** Supabase untuk menginisialisasi client admin.
      * Gunakan fungsi `supabase.auth.admin.createUser()` untuk membuat akun guru baru. Akun akan langsung aktif.

**4. Rincian Implementasi Fitur per Halaman**

**4.1. Halaman Absensi (Route: `/absensi`)**

  * **Tampilan Utama:** Tampilkan daftar siswa dari kelas yang diajar oleh guru yang sedang login. Data siswa diambil menggunakan SWR.
  * **Input Absensi:** Untuk setiap siswa, sediakan 4 radio button: **H** (Hadir), **S** (Sakit), **I** (Izin), **A** (Alpha).
  * **Status Default:** Secara default, semua siswa untuk tanggal hari ini harus ditandai sebagai **'A' (Alpha)**.
  * **Logika Izin:** Jika guru memilih **'I'**, tampilkan sebuah modal/popup yang berisi input teks untuk mengisi alasan izin.
  * **Bottom Navigation Bar (Fixed di bagian bawah):**
      * **Kiri:** Tampilkan persentase kehadiran (`Kehadiran: [N]%`). Nilai ini harus update secara real-time saat guru mengubah status siswa.
      * **Tengah:** Sebuah tombol besar bertuliskan **"Simpan"**.
      * **Kanan:** Tampilkan tanggal hari ini (`Tanggal: 06-10-2025`).
  * **Fungsi Tombol "Simpan":** Saat diklik, kumpulkan semua status absensi siswa dari state lokal halaman dan lakukan operasi **`upsert`** ke tabel `attendance_logs` di Supabase. Ini memastikan data bisa diperbarui jika guru menyimpan lebih dari sekali pada hari yang sama.

**4.2. Halaman Daftar Siswa (Route: `/siswa`)**

  * Tujuan halaman ini adalah untuk menampilkan data master semua siswa.
  * Buat sebuah tabel yang menampilkan kolom: **No.**, **Nama Siswa**, **Gender**, dan **Kelas**.
  * Data diambil dari tabel `students` dan `classes` (join) menggunakan SWR.

**4.3. Halaman Laporan (Route: `/laporan`)**

  * **Filter:** Sediakan filter berdasarkan **Kelas** dan **Periode** (pilihan: Minggu Ini, Bulan Ini).
  * **Tampilan Data:** Tampilkan tabel rekapitulasi kehadiran siswa berdasarkan filter yang dipilih.
  * **Visualisasi:** Di bagian atas halaman, tampilkan **Pie Chart** yang memvisualisasikan persentase total dari status Hadir, Sakit, Izin, dan Alpha untuk data yang terfilter. Gunakan library seperti `Recharts` atau `Chart.js`.

**4.4. Halaman Manajemen Kelas (Hanya Admin)**

  * Buat UI di mana admin bisa membuat kelas baru atau mengedit kelas yang ada.
  * Saat menugaskan guru ke kelas, terapkan aturan **"1 guru 1 kelas" di level frontend**. Artinya, dropdown untuk memilih guru hanya boleh menampilkan guru-guru yang belum ditugaskan ke kelas manapun.

**5. Data Awal (Seeding)**

  * Setelah tabel dibuat, masukkan data awal untuk 7 kelas berikut ke dalam tabel `classes`:
      * `Kelas Paud`
      * `Kelas 1`
      * `Kelas 2`
      * `Kelas 3`
      * `Kelas 4`
      * `Kelas 5`
      * `Kelas 6`
  * Buat setidaknya 1 akun admin dan 2 akun guru dummy untuk testing.

**6. Instruksi Tambahan**

  * Gunakan **environment variables** (`.env.local`) untuk semua kunci Supabase (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
  * Gunakan **Zustand** untuk menyimpan state sesi pengguna yang sedang login (ID, nama, role, class\_id).
  * Buat komponen UI yang reusable (misalnya: Tombol, Modal, Kartu) untuk menjaga konsistensi.

-----