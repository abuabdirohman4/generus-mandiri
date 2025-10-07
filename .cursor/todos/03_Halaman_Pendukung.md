#### **Folder: `03_Halaman_Pendukung`**

**1. File: `src/app/(admin)/siswa/page.jsx`**

  * **Tujuan:** Menampilkan daftar semua siswa dalam sistem.
  * **Logika:**
      * Ini bisa menjadi **Server Component** (tanpa `'use client'`).
      * Langsung `await` pemanggilan data dari Supabase di dalam komponen untuk mengambil semua siswa beserta nama kelasnya (join).
      * Render data dalam sebuah komponen tabel.

**2. File: `src/app/(admin)/laporan/page.jsx`**

  * **Tujuan:** Halaman laporan kehadiran.
  * **Logika:**
      * Gunakan `'use client'` karena interaktif (filter).
      * Buat state untuk filter: `const [filters, setFilters] = useState({ period: 'monthly' })`.
      * Gunakan SWR untuk mengambil data laporan yang sudah diagregasi dari Supabase berdasarkan state `filters`.
      * Tampilkan data dalam bentuk tabel dan teruskan data ringkasan ke komponen chart.

**3. File: `components/charts/AttendancePieChart.jsx`**

  * **Tujuan:** Menampilkan visualisasi data laporan.
  * **Logika:**
      * Gunakan `'use client'`.
      * Gunakan library seperti `Recharts`.
      * Menerima `data` sebagai props (misal: `[{ name: 'Hadir', value: 80 }, ...]`).
      * Render komponen PieChart berdasarkan data tersebut.

-----