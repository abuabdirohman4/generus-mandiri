"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/errorUtils';

export interface SoundSettings {
  soundId: string;
  volume: number;
  taskCompletionSoundId: string;
  focusSoundId: string;
}

export interface UserProfile {
  id: string;
  user_id: string;
  sound_settings: SoundSettings;
  created_at: string;
  updated_at: string;
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  soundId: 'children',
  volume: 0.5,
  taskCompletionSoundId: 'none',
  focusSoundId: 'none'
};

/**
 * Get user profile with sound settings
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found, return null (will create on first update)
        console.log('🎵 getUserProfile - No profile found');
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    console.error('🎵 getUserProfile error:', error);
    handleApiError(error, 'memuat data', 'gagal memuat profil user');
    return null;
  }
}

/**
 * Update sound settings for user
 */
export async function updateSoundSettings(settings: Partial<SoundSettings>): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('sound_settings')
      .eq('user_id', user.id)
      .single();

    const currentSoundSettings = existingProfile?.sound_settings || DEFAULT_SOUND_SETTINGS;
    const updatedSoundSettings = { ...currentSoundSettings, ...settings };
    

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          sound_settings: updatedSoundSettings,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    } else {
      // Create new profile
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          sound_settings: updatedSoundSettings
        });

      if (error) {
        throw error;
      }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/execution');
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'gagal menyimpan pengaturan suara');
    throw error;
  }
}

/**
 * Get sound settings for user (with fallback to default)
 */
export async function getSoundSettings(): Promise<SoundSettings> {
  try {
    const profile = await getUserProfile();
    const settings = profile?.sound_settings || DEFAULT_SOUND_SETTINGS;
    return settings;
  } catch (error) {
    console.error('🎵 getSoundSettings error:', error);
    handleApiError(error, 'memuat data', 'gagal memuat pengaturan suara');
    return DEFAULT_SOUND_SETTINGS;
  }
}


/**
 * Reset sound settings to default
 */
export async function resetSoundSettings(): Promise<void> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('user_profiles')
        .update({
          sound_settings: DEFAULT_SOUND_SETTINGS,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    } else {
      // Create new profile with default settings
      const { error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          sound_settings: DEFAULT_SOUND_SETTINGS
        });

      if (error) {
        throw error;
      }
    }

    // Revalidate relevant paths
    revalidatePath('/dashboard');
    revalidatePath('/execution');
  } catch (error) {
    handleApiError(error, 'mengupdate data', 'gagal mereset pengaturan suara');
    throw error;
  }
}
