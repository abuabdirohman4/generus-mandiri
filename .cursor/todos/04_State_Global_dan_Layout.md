#### **Folder: `04_State_Global_dan_Layout`**

**1. File: `stores/userStore.ts`**

  * **Tujuan:** Store Zustand untuk data sesi pengguna global.
  * **Logika:**
    ```javascript
    import { create } from 'zustand';

    const useUserStore = create((set) => ({
      profile: null, // Akan berisi { id, full_name, role }
      setProfile: (profileData) => set({ profile: profileData }),
      clearProfile: () => set({ profile: null }),
    }));

    export default useUserStore;
    ```

**2. File: `src/app/(admin)/layout.tsx`**

  * **Tujuan:** Layout utama untuk halaman-halaman setelah login.
  * **Logika:**