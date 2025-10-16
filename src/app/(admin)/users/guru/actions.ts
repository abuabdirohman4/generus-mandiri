"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface TeacherData {
  username: string;
  full_name: string;
  email: string;
  password?: string;
  daerah_id: string;
  desa_id?: string;
  kelompok_id?: string;
}

export async function createTeacher(data: TeacherData) {
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
        role: 'teacher',
        daerah_id: data.daerah_id,
        desa_id: data.desa_id,
        kelompok_id: data.kelompok_id
      }]);

    if (profileError) {
      // If profile creation fails, clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw handleApiError(error, 'menyimpan data', 'Gagal membuat guru');
  }
}

export async function updateTeacher(id: string, data: TeacherData) {
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

    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate guru');
  }
}

export async function deleteTeacher(id: string) {
  try {
    const supabase = await createClient();

    // Delete from auth.users (this will cascade to profiles due to foreign key)
    const { error } = await supabase.auth.admin.deleteUser(id);

    if (error) {
      throw error;
    }

    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    console.error('Error deleting teacher:', error);
    throw handleApiError(error, 'menghapus data', 'Gagal menghapus guru');
  }
}

export async function resetTeacherPassword(id: string, newPassword: string) {
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
    console.error('Error resetting teacher password:', error);
    throw handleApiError(error, 'reset', 'Gagal mereset password guru');
  }
}

export async function getAllTeachers() {
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
        kelompok:kelompok_id(name),
        teacher_classes(count)
      `)
      .eq('role', 'teacher')
      .order('username');
    
    // Apply filtering for admin users
    if (filter?.kelompok_id) {
      // Admin Kelompok: only see teachers in their kelompok
      query = query.eq('kelompok_id', filter.kelompok_id);
    } else if (filter?.desa_id) {
      // Admin Desa: only see teachers in their desa
      query = query.eq('desa_id', filter.desa_id);
    } else if (filter?.daerah_id) {
      // Admin Daerah: see teachers in their daerah
      query = query.eq('daerah_id', filter.daerah_id);
    }
    // Superadmin: no filter, see all
    
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform the data to include classes count and flattened org names
    const transformedData = data?.map(teacher => ({
      ...teacher,
      classes_count: teacher.teacher_classes?.[0]?.count || 0,
      daerah_name: Array.isArray(teacher.daerah) ? teacher.daerah[0]?.name : teacher.daerah?.name || '',
      desa_name: Array.isArray(teacher.desa) ? teacher.desa[0]?.name : teacher.desa?.name || '',
      kelompok_name: Array.isArray(teacher.kelompok) ? teacher.kelompok[0]?.name : teacher.kelompok?.name || ''
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching teachers:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data guru');
  }
}

export async function assignTeacherToKelompok(teacherId: string, kelompokId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('profiles')
      .update({
        kelompok_id: kelompokId,
        updated_at: new Date().toISOString()
      })
      .eq('id', teacherId);

    if (error) {
      throw error;
    }

    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher to kelompok:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengassign guru ke kelompok');
  }
}

export async function assignTeacherToClass(teacherId: string, classId: string) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('teacher_classes')
      .insert([{
        teacher_id: teacherId,
        class_id: classId
      }]);

    if (error) {
      throw error;
    }

    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    console.error('Error assigning teacher to class:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengassign guru ke kelas');
  }
}
