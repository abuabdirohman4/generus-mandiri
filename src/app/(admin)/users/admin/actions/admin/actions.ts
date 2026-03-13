'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';
import { insertAdminProfile, updateAdminProfile, fetchAdmins } from './queries';
import {
  determineAdminLevel,
  validateAdminData,
  validateAdminLevelRequirements,
  validatePasswordForCreate,
  transformAdminList
} from './logic';
import type { AdminData } from '../types';

export async function createAdmin(data: AdminData) {
  try {
    // Validation (Layer 2)
    const validation = validateAdminData(data);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const passwordValidation = validatePasswordForCreate(data.password);
    if (!passwordValidation.ok) {
      throw new Error(passwordValidation.error);
    }

    const level = determineAdminLevel(data);
    const levelValidation = validateAdminLevelRequirements(data, level);
    if (!levelValidation.ok) {
      throw new Error(levelValidation.error);
    }

    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // First create the user in auth.users using admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: data.email, // Generated format from frontend
      password: data.password!,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        username: data.username,
        full_name: data.full_name
      }
    });

    if (authError) {
      throw authError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Then create the profile using regular client (Layer 1)
    const { error: profileError } = await insertAdminProfile(supabase, {
      id: authData.user.id,
      username: data.username,
      full_name: data.full_name,
      email: data.email,
      role: 'admin',
      daerah_id: data.daerah_id,
      desa_id: data.desa_id || null,
      kelompok_id: data.kelompok_id || null,
      can_manage_materials: data.can_manage_materials || false
    });

    if (profileError) {
      // If profile creation fails, clean up the auth user using admin client
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    revalidatePath('/users/admin');
    return { success: true };
  } catch (error) {
    console.error('Error creating admin:', error);
    throw handleApiError(error, 'menyimpan data', 'Gagal membuat admin');
  }
}

export async function updateAdmin(id: string, data: AdminData) {
  try {
    // Validation (Layer 2)
    const validation = validateAdminData(data);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Update profile using regular client (Layer 1)
    const { error: profileError } = await updateAdminProfile(supabase, id, {
      username: data.username,
      full_name: data.full_name,
      email: data.email,
      daerah_id: data.daerah_id,
      desa_id: data.desa_id || null,
      kelompok_id: data.kelompok_id || null,
      can_manage_materials: data.can_manage_materials || false,
      updated_at: new Date().toISOString()
    });

    if (profileError) {
      throw profileError;
    }

    // Update password if provided using admin client
    if (data.password) {
      const { error: passwordError } = await adminClient.auth.admin.updateUserById(id, {
        password: data.password
      });

      if (passwordError) {
        throw passwordError;
      }
    }

    // Update user metadata using admin client
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(id, {
      user_metadata: {
        username: data.username,
        full_name: data.full_name
      }
    });

    if (metadataError) {
      throw metadataError;
    }

    revalidatePath('/users/admin');
    return { success: true };
  } catch (error) {
    console.error('Error updating admin:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate admin');
  }
}

export async function deleteAdmin(id: string) {
  try {
    const adminClient = await createAdminClient();

    // Delete from auth.users (this will cascade to profiles due to foreign key)
    const { error } = await adminClient.auth.admin.deleteUser(id);

    if (error) {
      throw error;
    }

    revalidatePath('/users/admin');
    return { success: true };
  } catch (error) {
    console.error('Error deleting admin:', error);
    throw handleApiError(error, 'menghapus data', 'Gagal menghapus admin');
  }
}

export async function resetAdminPassword(id: string, newPassword: string) {
  try {
    // BUG FIX: Use createAdminClient instead of createClient
    // The original code incorrectly used supabase.auth.admin which doesn't exist
    const adminClient = await createAdminClient();

    const { error } = await adminClient.auth.admin.updateUserById(id, {
      password: newPassword
    });

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('Error resetting admin password:', error);
    throw handleApiError(error, 'reset', 'Gagal mereset password admin');
  }
}

export async function getAllAdmins() {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const filter = profile ? getDataFilter(profile) : null;

    // Fetch admins with filtering (Layer 1)
    const { data, error } = await fetchAdmins(supabase, filter || undefined);

    if (error) {
      throw error;
    }

    // Transform the data to flatten org names (Layer 2)
    const transformedData = transformAdminList(data || []);

    return transformedData;
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data admin');
  }
}
