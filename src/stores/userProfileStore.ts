import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearUserCache } from '@/lib/userUtils';
import type { UserProfile, UserProfileState } from '@/types/user'

export type { UserProfile }

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
