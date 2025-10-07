#### **Folder: `00_Setup_dan_Konfigurasi`**

**1. File: `.env.local`**

  * **Tujuan:** Menyimpan semua kunci rahasia dan konfigurasi.
  * **Isi:**
    ```
    NEXT_PUBLIC_SUPABASE_URL=URL_PROYEK_SUPABASE_ANDA
    NEXT_PUBLIC_SUPABASE_ANON_KEY=ANON_KEY_SUPABASE_ANDA
    SUPABASE_SERVICE_ROLE_KEY=SERVICE_ROLE_KEY_SUPABASE_ANDA
    ```

**2. File: `lib/supabase/client.js`**

  * **Tujuan:** Membuat satu instance Supabase client yang bisa digunakan di seluruh komponen sisi klien (`'use client'`).
  * **Isi:**
    ```javascript
    import { createBrowserClient } from '@supabase/ssr'

    export function createClient() {
      return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
    }
    ```

**3. File: `lib/supabase/server.js`**

  * **Tujuan:** Membuat instance Supabase client untuk penggunaan di sisi server (Server Components, Server Actions, API Routes).
  * **Isi:**
    ```javascript
    import { createServerClient } from '@supabase/ssr'
    import { cookies } from 'next/headers'

    export function createClient() {
      const cookieStore = cookies()
      return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name) {
              return cookieStore.get(name)?.value
            },
          },
        }
      )
    }
    ```

-----

      * Berisi komponen `Sidebar` atau `Navbar` untuk navigasi.
      * Di dalamnya, render `{children}`.
      * Ini juga bisa menjadi tempat untuk mengambil data profil pengguna dari Supabase dan menyimpannya ke store Zustand saat aplikasi pertama kali dimuat.