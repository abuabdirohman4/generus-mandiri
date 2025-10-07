#### **Folder: `01_Autentikasi_dan_Middleware`**

**1. File: `app/login/page.jsx`**

  * **Tujuan:** Halaman login untuk guru.
  * **Logika:**
      * Gunakan `'use client'`.
      * Buat state untuk `username`, `password`, `loading`, dan `error`.
      * Buat fungsi `handleLogin` yang:
        1.  Mengambil `username` dan `password` dari form.
        2.  Membuat email dummy: ` const email =  `${username}@warlob.app`;`.
        3.  Memanggil `supabase.auth.signInWithPassword({ email, password })`.
        4.  Jika berhasil, arahkan ke halaman `/absensi`. Jika gagal, tampilkan pesan error.

**2. File: `app/admin/users/actions.js`**

  * **Tujuan:** Server Action untuk membuat pengguna (guru) baru oleh admin.
  * **Logika:**
      * Gunakan `'use server'`.
      * Buat fungsi `createUser(formData)` yang:
        1.  Mengambil `username`, `password`, `full_name` dari `formData`.
        2.  Membuat client Supabase admin khusus menggunakan `service_role` key.
        3.  Memanggil `supabaseAdmin.auth.admin.createUser()` dengan email dummy (`${username}@warlob.app`), password, dan `user_metadata`.
        4.  Setelah user dibuat di `auth`, masukkan data `full_name` dan `role` ke tabel `profiles`.

**3. File: `middleware.js` (di root proyek)**

  * **Tujuan:** Melindungi halaman-halaman yang memerlukan login.
  * **Logika:**
      * Mengecek sesi pengguna pada setiap request.
      * Jika pengguna belum login dan mencoba mengakses halaman selain `/login`, arahkan (redirect) ke `/login`.
      * Jika pengguna sudah login dan mencoba mengakses `/login`, arahkan ke `/absensi`.

-----