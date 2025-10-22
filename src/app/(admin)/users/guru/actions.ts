"use server";

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter, canAccessFeature } from '@/lib/accessControlServer';

export interface TeacherData {
  username: string;
  full_name: string;
  email: string;
  password?: string;
  daerah_id: string;
  desa_id?: string | null;
  kelompok_id?: string;
}

export async function createTeacher(data: TeacherData) {
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
    if (!data.kelompok_id) {
      throw new Error('Kelompok harus dipilih');
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

    // Then create the profile using regular client
    const { error: profileError } = await supabase
      .from('profiles')
      .insert([{
        id: authData.user.id,
        username: data.username,
        full_name: data.full_name,
        email: data.email,
        role: 'teacher',
        daerah_id: data.daerah_id,
        desa_id: data.desa_id || null,
        kelompok_id: data.kelompok_id
      }]);

    if (profileError) {
      // If profile creation fails, clean up the auth user using admin client
      await adminClient.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    revalidatePath('/users/guru');
    return { success: true, teacher: { id: authData.user.id, username: data.username, full_name: data.full_name, email: data.email, role: 'teacher', daerah_id: data.daerah_id, desa_id: data.desa_id, kelompok_id: data.kelompok_id } };
  } catch (error) {
    console.error('Error creating teacher:', error);
    throw handleApiError(error, 'menyimpan data', 'Gagal membuat guru');
  }
}

export async function updateTeacher(id: string, data: TeacherData) {
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
    if (!data.kelompok_id) {
      throw new Error('Kelompok harus dipilih');
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
        kelompok_id: data.kelompok_id,
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

    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    console.error('Error updating teacher:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate guru');
  }
}

export async function deleteTeacher(id: string) {
  try {
    const adminClient = await createAdminClient();

    // Delete from auth.users (this will cascade to profiles due to foreign key)
    const { error } = await adminClient.auth.admin.deleteUser(id);

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
        teacher_classes(
          class:class_id(id, name)
        )
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

    // Transform the data to include class names and flattened org names
    const transformedData = data?.map(teacher => ({
      ...teacher,
      class_names: teacher.teacher_classes?.map((tc: any) => tc.class?.name).filter(Boolean).join(', ') || '-',
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

// Get classes for a specific teacher
export async function getTeacherClasses(teacherId: string) {
  try {
    const supabase = await createClient();
    
    const { data, error } = await supabase
      .from('teacher_classes')
      .select(`
        id,
        class_id,
        class:class_id (
          id,
          name,
          kelompok_id
        )
      `)
      .eq('teacher_id', teacherId);
    
    if (error) throw error;
    
    return data?.map((tc: any) => ({
      id: tc.id,
      class_id: tc.class_id,
      class_name: tc.class?.name || '',
      kelompok_id: tc.class?.kelompok_id || ''
    })) || [];
  } catch (error) {
    throw handleApiError(error, 'memuat data', 'Gagal memuat kelas guru');
  }
}

// Update teacher class assignments
export async function updateTeacherClasses(teacherId: string, classIds: string[]) {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    
    if (!profile || !canAccessFeature(profile, 'users')) {
      throw new Error('Anda tidak memiliki akses untuk mengubah kelas guru');
    }
    
    // Delete existing assignments
    const { error: deleteError } = await supabase
      .from('teacher_classes')
      .delete()
      .eq('teacher_id', teacherId);
    
    if (deleteError) throw deleteError;
    
    // Insert new assignments
    if (classIds.length > 0) {
      const mappings = classIds.map(classId => ({
        teacher_id: teacherId,
        class_id: classId
      }));
      
      const { error: insertError } = await supabase
        .from('teacher_classes')
        .insert(mappings);
      
      if (insertError) throw insertError;
    }
    
    revalidatePath('/users/guru');
    return { success: true };
  } catch (error) {
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate kelas guru');
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
