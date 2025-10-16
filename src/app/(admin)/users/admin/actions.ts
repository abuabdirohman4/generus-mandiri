"use server";

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface AdminData {
  username: string;
  full_name: string;
  email: string;
  password?: string;
  daerah_id: string;
  desa_id?: string | null;
  kelompok_id?: string | null;
}

export async function createAdmin(data: AdminData) {
  try {
    // Validate required fields
    if (!data.username?.trim()) {
      throw new Error('Username harus diisi');
    }
    if (!data.full_name?.trim()) {
      throw new Error('Nama lengkap harus diisi');
    }
    if (!data.email?.trim()) {
      throw new Error('Email harus diisi');
    }
    if (!data.password) {
      throw new Error('Password harus diisi');
    }
    if (!data.daerah_id) {
      throw new Error('Daerah harus dipilih');
    }
    
    // Determine admin level by what's filled
    const isAdminKelompok = !!data.kelompok_id;
    const isAdminDesa = !data.kelompok_id && !!data.desa_id;
    const isAdminDaerah = !data.kelompok_id && !data.desa_id;
    
    // Validate based on level
    if (isAdminDesa && !data.desa_id) {
      throw new Error('Desa harus dipilih untuk Admin Desa');
    }
    if (isAdminKelompok && !data.kelompok_id) {
      throw new Error('Kelompok harus dipilih untuk Admin Kelompok');
    }

    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // First create the user in auth.users using admin client
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: data.email, // Generated format from frontend
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

    // Then create the profile using regular client
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        role: 'admin',
        daerah_id: data.daerah_id,
        desa_id: data.desa_id || null,
        kelompok_id: data.kelompok_id || null
      }]);

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
    // Validate required fields
    if (!data.username?.trim()) {
      throw new Error('Username harus diisi');
    }
    if (!data.full_name?.trim()) {
      throw new Error('Nama lengkap harus diisi');
    }
    if (!data.email?.trim()) {
      throw new Error('Email harus diisi');
    }
    if (!data.daerah_id) {
      throw new Error('Daerah harus dipilih');
    }

    const supabase = await createClient();
    const adminClient = await createAdminClient();

    // Update profile using regular client
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        daerah_id: data.daerah_id,
        desa_id: data.desa_id || null,
        kelompok_id: data.kelompok_id || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

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
    if (filter?.kelompok_id) {
      // Admin Kelompok: only see admins in their kelompok or lower
      query = query.eq('kelompok_id', filter.kelompok_id);
    } else if (filter?.desa_id) {
      // Admin Desa: only see admins in their desa (Admin Kelompok only)
      // Filter out Admin Daerah by ensuring they have a desa_id
      query = query
        .eq('desa_id', filter.desa_id)
        .not('desa_id', 'is', null);
    } else if (filter?.daerah_id) {
      // Admin Daerah: see Admin Desa and Admin Kelompok in their daerah
      // Filter out other Admin Daerah by ensuring they have a desa_id
      query = query
        .eq('daerah_id', filter.daerah_id)
        .not('desa_id', 'is', null);
    }
    // Superadmin: no filter, see all
    
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform the data to flatten org names
    const transformedData = data?.map(admin => ({
      ...admin,
      daerah_name: Array.isArray(admin.daerah) ? admin.daerah[0]?.name : admin.daerah?.name || '',
      desa_name: Array.isArray(admin.desa) ? admin.desa[0]?.name : admin.desa?.name || '',
      kelompok_name: Array.isArray(admin.kelompok) ? admin.kelompok[0]?.name : admin.kelompok?.name || ''
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching admins:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data admin');
  }
}
