import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearUserCache } from '@/lib/userUtils';

interface UserProfile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  kelompok_id?: string | null;
  desa_id?: string | null;
  daerah_id?: string | null;
  kelompok?: { id: string; name: string } | null;
  desa?: { id: string; name: string } | null;
  daerah?: { id: string; name: string } | null;
  classes?: Array<{
    id: string;
    name: string;
  }>;
}

interface UserProfileState {
  profile: UserProfile | null;
  avatarUrl: string | null;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setAvatarUrl: (avatarUrl: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearProfile: () => void;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      avatarUrl: null,
      loading: false,
      error: null,
      isInitialized: false,

      setProfile: (profile: UserProfile | null) => set({ 
        profile, 
        loading: false, 
        error: null,
        isInitialized: true 
      }),

      setAvatarUrl: (avatarUrl: string) => set({ avatarUrl }),

      setLoading: (loading: boolean) => set({ loading }),

      setError: (error: string | null) => set({ 
        error, 
        loading: false 
      }),

      clearProfile: () => {
        // Clear all user-related cache when logging out
        clearUserCache()
        set({ 
          profile: null, 
          avatarUrl: null,
          loading: false, 
          error: null 
        })
      },
    }),
    {
      name: 'user-profile-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
        }
      },
    }
  )
);

// Hook for easy access to user profile
export const useUserProfile = () => {
  const store = useUserProfileStore();
  
  return {
    profile: store.profile,
    avatarUrl: store.avatarUrl,
    loading: store.loading,
    error: store.error,
    isInitialized: store.isInitialized,
    setProfile: store.setProfile,
    setAvatarUrl: store.setAvatarUrl,
    setLoading: store.setLoading,
    setError: store.setError,
    clearProfile: store.clearProfile,
  };
};
