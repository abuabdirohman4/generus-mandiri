#### **Folder: `02_Fitur_Utama_Absensi`**

**1. File: `src/app/(admin)/absensi/page.jsx`**

  * **Tujuan:** Halaman utama untuk melakukan absensi. Tanda `(admin)` adalah route group untuk halaman yang dilindungi middleware.
  * **Logika:**
      * Gunakan `'use client'`.
      * **Fetch Data:** Ambil data siswa untuk kelas guru yang sedang login. Anda bisa pass data ini dari Server Component parent atau fetch di client dengan SWR.
      * **State Management:** Gunakan `useState` untuk menyimpan status absensi semua siswa, misal: `const [attendance, setAttendance] = useState({})`. Inisialisasi state ini dengan status default 'A' untuk setiap siswa.
      * **UI:** Render daftar siswa. Setiap baris memiliki nama siswa dan 4 radio button.
      * **Event Handling:** Buat fungsi `handleStatusChange(studentId, status)` untuk memperbarui state `attendance`.
      * **Modal Izin:** Jika status diubah menjadi 'I', panggil komponen modal untuk memasukkan alasan.
      * **Tombol Simpan:** Panggil Server Action `saveAttendance` saat diklik.

**2. File: `src/app/(admin)/absensi/actions.js`**

  * **Tujuan:** Server Action untuk menyimpan data absensi ke database.
  * **Logika:**
      * Gunakan `'use server'`.
      * Buat fungsi `saveAttendance(attendanceData)` yang menerima data absensi dari client.
      * Loop melalui data tersebut dan lakukan operasi `supabase.from('attendance_logs').upsert(...)` untuk setiap siswa. `upsert` penting agar data bisa diubah-ubah pada hari yang sama.

**3. File: `components/ui/ReasonModal.jsx`**

  * **Tujuan:** Komponen modal reusable untuk memasukkan alasan izin.
  * **Logika:**
      * Gunakan `'use client'`.
      * Menerima props seperti `isOpen`, `onClose`, dan `onSubmit`.
      * Berisi sebuah `textarea` dan tombol "Simpan Alasan".

-----