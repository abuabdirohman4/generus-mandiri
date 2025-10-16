"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface AdminData {
  username: string;
  full_name: string;
  email: string;
  password?: string;
  daerah_id: string;
  desa_id?: string;
  kelompok_id?: string;
}

export async function createAdmin(data: AdminData) {
  try {
    const supabase = await createClient();

    // First create the user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email || `${data.username}@example.com`,
      password: data.password!,
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

    // Then create the profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        role: 'admin',
        daerah_id: data.daerah_id,
        desa_id: data.desa_id,
        kelompok_id: data.kelompok_id
      }]);

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
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
    const supabase = await createClient();

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        daerah_id: data.daerah_id,
        desa_id: data.desa_id,
        kelompok_id: data.kelompok_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (profileError) {
      throw profileError;
    }

    // Update password if provided
    if (data.password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(id, {
        password: data.password
      });

      if (passwordError) {
        throw passwordError;
      }
    }

    // Update user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(id, {
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
    const supabase = await createClient();

    // Delete from auth.users (this will cascade to profiles due to foreign key)
    const { error } = await supabase.auth.admin.deleteUser(id);

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
    const supabase = await createClient();

    const { error } = await supabase.auth.admin.updateUserById(id, {
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

    let query = supabase
      .from('profiles')
      .select(`
        *,
        daerah:daerah_id(name),
        desa:desa_id(name),
        kelompok:kelompok_id(name)
      `)
      .in('role', ['admin', 'superadmin'])
      .order('username');
    
    // Apply filtering for admin users
    if (filter?.daerah_id) {
      query = query.eq('daerah_id', filter.daerah_id);
    } else if (filter?.desa_id) {
      query = query.eq('desa_id', filter.desa_id);
    } else if (filter?.kelompok_id) {
      query = query.eq('kelompok_id', filter.kelompok_id);
    }
    
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data admin');
  }
}
