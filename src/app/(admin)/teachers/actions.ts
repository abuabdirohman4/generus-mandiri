"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { handleApiError } from "@/lib/errorUtils";

export interface CreateTeacherData {
  username: string;
  password: string;
  fullName: string;
  classId: string;
}

/**
 * Membuat guru baru oleh admin
 */
export async function createTeacher(formData: FormData) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Cek apakah user adalah admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can create teachers');
    }

    // Extract form data
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();
    const fullName = formData.get('fullName')?.toString();
    const classId = formData.get('classId')?.toString();

    // Validation
    if (!username || !password || !fullName || !classId) {
      throw new Error('All fields are required');
    }

    // Cek apakah username sudah ada
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (existingProfile) {
      throw new Error('Username already exists');
    }

    // Cek apakah classId valid
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .single();

    if (!classData) {
      throw new Error('Invalid class selected');
    }

    // Buat email dummy dari username
    const email = `${username}@warlob.app`;

    // Buat user di Supabase Auth menggunakan service role
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      throw authError;
    }

    if (!authUser.user) {
      throw new Error('Failed to create user');
    }

    // Buat profile di database
    const { data: newProfile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authUser.user.id,
        username,
        email,
        full_name: fullName,
        role: 'teacher',
        class_id: classId,
      })
      .select()
      .single();

    if (profileError) {
      // Jika gagal membuat profile, hapus user yang sudah dibuat
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw profileError;
    }

    revalidatePath('/admin/teachers');
    return { success: true, profile: newProfile };
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'Gagal membuat guru');
    throw error;
  }
}

/**
 * Mendapatkan daftar semua guru
 */
export async function getTeachers() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Cek apakah user adalah admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can view teachers');
    }

    const { data: teachers, error } = await supabase
      .from('profiles')
      .select(`
        id,
        full_name,
        role,
        created_at,
        classes!classes_teacher_id_fkey (
          id,
          name
        )
      `)
      .eq('role', 'teacher')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return teachers || [];
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar guru');
    throw error;
  }
}

/**
 * Mendapatkan daftar kelas untuk dropdown
 */
export async function getClasses() {
  try {
    const supabase = await createClient();
    
    const { data: classes, error } = await supabase
      .from('classes')
      .select('id, name, grade')
      .order('grade', { ascending: true });

    if (error) {
      throw error;
    }

    return classes || [];
  } catch (error) {
    handleApiError(error, 'memuat data', 'Gagal memuat daftar kelas');
    throw error;
  }
}

/**
 * Menghapus guru
 */
export async function deleteTeacher(teacherId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Cek apakah user adalah admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      throw new Error('Unauthorized: Only admin can delete teachers');
    }

    // Hapus dari Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(teacherId);
    
    if (authError) {
      throw authError;
    }

    // Hapus dari profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', teacherId);

    if (profileError) {
      throw profileError;
    }

    revalidatePath('/admin/teachers');
    return { success: true };
  } catch (error) {
    handleApiError(error, 'menghapus data', 'Gagal menghapus guru');
    throw error;
  }
}
