"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';

/**
 * Reset cache and logout user
 * This will clear server-side session and force user to login again
 */
export async function resetCacheAndLogout(): Promise<{ success: boolean }> {
  try {
    const supabase = await createClient();
    
    // Sign out user from Supabase (clears server-side session)
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Reset cache and logout error:', error);
    handleApiError(error, 'melakukan reset', 'gagal melakukan reset cache dan logout');
    throw error;
  }
}
