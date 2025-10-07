import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { updateSoundSettings, getSoundSettings, resetSoundSettings as resetServerSettings } from '@/app/(admin)/settings/profile/actions/userProfileActions';

export interface SoundSettings {
  soundId: string;
  volume: number;
  taskCompletionSoundId: string;
  focusSoundId: string;
}


interface SoundStoreState {
  settings: SoundSettings;
  taskCompletionSettings: { soundId: string; volume: number };
  focusSettings: { soundId: string; volume: number };
  isLoading: boolean;
  updateSettings: (settings: Partial<SoundSettings>) => Promise<void>;
  updateTaskCompletionSettings: (settings: Partial<{ soundId: string; volume: number }>) => Promise<void>;
  updateFocusSettings: (settings: Partial<{ soundId: string; volume: number }>) => Promise<void>;
  resetSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  soundId: 'children',
  volume: 0.5,
  taskCompletionSoundId: 'none',
  focusSoundId: 'none'
};

export const useSoundStore = create<SoundStoreState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SOUND_SETTINGS,
      taskCompletionSettings: {
        soundId: DEFAULT_SOUND_SETTINGS.taskCompletionSoundId,
        volume: DEFAULT_SOUND_SETTINGS.volume
      },
      focusSettings: {
        soundId: DEFAULT_SOUND_SETTINGS.focusSoundId,
        volume: DEFAULT_SOUND_SETTINGS.volume
      },
      isLoading: false,
      
      updateSettings: async (newSettings) => {
        set({ isLoading: true });
        
        try {
          // Update local state immediately (optimistic update)
          set((state) => ({
            settings: { ...state.settings, ...newSettings }
          }));
          
          // Sync to server
          await updateSoundSettings(newSettings);
          
          // Re-sync from server to ensure consistency (with small delay)
          setTimeout(async () => {
            await get().loadSettings();
          }, 100);
        } catch (error) {
          console.error('Failed to update sound settings:', error);
          // Revert local state on error
          const currentSettings = get().settings;
          set({ settings: { ...currentSettings } });
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateTaskCompletionSettings: async (newSettings) => {
        set({ isLoading: true });
        
        try {
          // Update local state immediately (optimistic update)
          set((state) => ({
            taskCompletionSettings: { ...state.taskCompletionSettings, ...newSettings }
          }));
          
          // Sync task completion sound ID to server via main settings
          if (newSettings.soundId) {
            await updateSoundSettings({ taskCompletionSoundId: newSettings.soundId });
          }
          
          // Re-sync from server to ensure consistency (with small delay)
          setTimeout(async () => {
            await get().loadSettings();
          }, 100);
        } catch (error) {
          console.error('Failed to update task completion sound settings:', error);
          // Revert local state on error
          const currentSettings = get().taskCompletionSettings;
          set({ taskCompletionSettings: { ...currentSettings } });
        } finally {
          set({ isLoading: false });
        }
      },
      
      updateFocusSettings: async (newSettings) => {
        set({ isLoading: true });
        
        try {
          // Update local state immediately (optimistic update)
          set((state) => ({
            focusSettings: { ...state.focusSettings, ...newSettings }
          }));
          
          // Sync focus sound settings to server via main settings
          const updateData: any = {};
          if (newSettings.soundId !== undefined) {
            updateData.focusSoundId = newSettings.soundId;
          }
          if (newSettings.volume !== undefined) {
            updateData.volume = newSettings.volume;
          }
          
          if (Object.keys(updateData).length > 0) {
            await updateSoundSettings(updateData);
          }
          
          // Re-sync from server to ensure consistency (with small delay)
          setTimeout(async () => {
            await get().loadSettings();
          }, 100);
        } catch (error) {
          console.error('Failed to update focus sound settings:', error);
          // Revert local state on error
          const currentSettings = get().focusSettings;
          set({ focusSettings: { ...currentSettings } });
        } finally {
          set({ isLoading: false });
        }
      },
      
      resetSettings: async () => {
        set({ isLoading: true });
        
        try {
          // Update local state
          set({ 
            settings: DEFAULT_SOUND_SETTINGS,
            taskCompletionSettings: {
              soundId: DEFAULT_SOUND_SETTINGS.taskCompletionSoundId,
              volume: DEFAULT_SOUND_SETTINGS.volume
            },
            focusSettings: {
              soundId: DEFAULT_SOUND_SETTINGS.focusSoundId,
              volume: DEFAULT_SOUND_SETTINGS.volume
            }
          });
          
          // Sync to server
          await resetServerSettings();
        } catch (error) {
          console.error('Failed to reset sound settings:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      loadSettings: async () => {
        set({ isLoading: true });
        
        try {
          const serverSettings = await getSoundSettings();
          
          set({ 
            settings: serverSettings,
            taskCompletionSettings: { 
              soundId: serverSettings.taskCompletionSoundId,
              volume: serverSettings.volume 
            },
            focusSettings: {
              soundId: serverSettings.focusSoundId,
              volume: serverSettings.volume
            }
          });
        } catch (error) {
          console.error('Failed to load sound settings:', error);
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'sound-settings',
      partialize: (state) => ({
        settings: state.settings
      }),
    }
  )
);
