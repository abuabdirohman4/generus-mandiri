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
  permissions?: {
    can_archive_students?: boolean;
    can_transfer_students?: boolean;
    can_soft_delete_students?: boolean;
    can_hard_delete_students?: boolean;
  };
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

    // Conditional validation based on teacher level
    // Teacher Kelompok: needs kelompok_id (and implicitly desa_id)
    if (data.kelompok_id && !data.desa_id) {
      throw new Error('Desa harus dipilih untuk guru dengan kelompok');
    }

    // Teacher Desa: needs desa_id (and implicitly daerah_id)
    if (data.desa_id && !data.daerah_id) {
      throw new Error('Daerah harus dipilih untuk guru dengan desa');
    }

    // At least daerah_id must be present
    if (!data.daerah_id) {
      throw new Error('Minimal daerah harus dipilih');
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
        kelompok_id: data.kelompok_id,
        permissions: data.permissions || {
          can_archive_students: false,
          can_transfer_students: false,
          can_soft_delete_students: false,
          can_hard_delete_students: false
        }
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

    // Conditional validation
    if (data.kelompok_id && !data.desa_id) {
      throw new Error('Desa harus dipilih untuk guru dengan kelompok');
    }

    if (data.desa_id && !data.daerah_id) {
      throw new Error('Daerah harus dipilih untuk guru dengan desa');
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
        permissions: data.permissions || {
          can_archive_students: false,
          can_transfer_students: false,
          can_soft_delete_students: false,
          can_hard_delete_students: false
        },
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
    // Admin Kelompok: role === 'admin' && memiliki kelompok_id (bisa juga memiliki desa_id)
    const isAdminKelompok = profile?.role === 'admin' && !!profile?.kelompok_id;

    let query = supabase
      .from('profiles')
      .select(`
        *,
        daerah:daerah_id(name),
        desa:desa_id(name),
        kelompok:kelompok_id(name),
        teacher_classes(
          class_id
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

    // For Admin Kelompok: fetch classes separately to bypass RLS filter on nested select
    // This allows them to see all classes assigned to teachers in their kelompok, even if classes are from other kelompok
    let classesMap = new Map<string, any>();
    if (isAdminKelompok && data && data.length > 0) {
      // Get all class_ids from teacher_classes
      const allClassIds = new Set<string>();
      data.forEach(teacher => {
        const teacherClasses = Array.isArray(teacher.teacher_classes) ? teacher.teacher_classes : (teacher.teacher_classes ? [teacher.teacher_classes] : []);
        teacherClasses.forEach((tc: any) => {
          const classId = Array.isArray(tc.class_id) ? tc.class_id[0] : tc.class_id;
          if (classId) allClassIds.add(classId);
        });
      });

      // Fetch classes with kelompok info separately using admin client to bypass RLS
      // This allows Admin Kelompok to see all classes assigned to teachers in their kelompok,
      // even if classes are from other kelompok (assigned by Admin Desa/Daerah)
      if (allClassIds.size > 0) {
        try {
          const adminSupabase = await createAdminClient();
          
          if (!adminSupabase) {
            // Fallback: try with regular client (will be filtered by RLS but better than nothing)
            const { data: classesData, error: classesError } = await supabase
              .from('classes')
              .select(`
                id,
                name,
                kelompok_id
              `)
              .in('id', Array.from(allClassIds));
            
            if (!classesError && classesData && classesData.length > 0) {
              // Get unique kelompok_ids and fetch kelompok separately
              const kelompokIds = [...new Set(classesData.map((cls: any) => cls.kelompok_id).filter(Boolean))];
              let kelompokMap = new Map<string, any>();
              
              if (kelompokIds.length > 0) {
                const { data: kelompokData, error: kelompokError } = await supabase
                  .from('kelompok')
                  .select('id, name')
                  .in('id', kelompokIds);
                
                if (!kelompokError && kelompokData) {
                  kelompokData.forEach((k: any) => {
                    kelompokMap.set(k.id, { id: k.id, name: k.name });
                  });
                }
              }
              
              classesData.forEach((cls: any) => {
                const kelompok = kelompokMap.get(cls.kelompok_id);
                classesMap.set(cls.id, {
                  name: cls.name,
                  kelompok_id: cls.kelompok_id,
                  kelompok: kelompok || null
                });
              });
            }
          } else {
            // Fetch classes without nested select (to avoid RLS on nested select)
            const { data: classesData, error: classesError } = await adminSupabase
              .from('classes')
              .select(`
                id,
                name,
                kelompok_id
              `)
              .in('id', Array.from(allClassIds));

            if (classesError) {
              // Fallback to regular client if admin client fails
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('classes')
                .select(`
                  id,
                  name,
                  kelompok_id
                `)
                .in('id', Array.from(allClassIds));
              
              if (!fallbackError && fallbackData && fallbackData.length > 0) {
                // Get unique kelompok_ids and fetch kelompok separately
                const kelompokIds = [...new Set(fallbackData.map((cls: any) => cls.kelompok_id).filter(Boolean))];
                let kelompokMap = new Map<string, any>();
                
                if (kelompokIds.length > 0) {
                  const { data: kelompokData, error: kelompokError } = await supabase
                    .from('kelompok')
                    .select('id, name')
                    .in('id', kelompokIds);
                  
                  if (!kelompokError && kelompokData) {
                    kelompokData.forEach((k: any) => {
                      kelompokMap.set(k.id, { id: k.id, name: k.name });
                    });
                  }
                }
                
                fallbackData.forEach((cls: any) => {
                  const kelompok = kelompokMap.get(cls.kelompok_id);
                  classesMap.set(cls.id, {
                    name: cls.name,
                    kelompok_id: cls.kelompok_id,
                    kelompok: kelompok || null
                  });
                });
              }
            } else if (classesData && classesData.length > 0) {
              // Get unique kelompok_ids from classes
              const kelompokIds = [...new Set(classesData.map((cls: any) => cls.kelompok_id).filter(Boolean))];
              
              // Fetch kelompok data separately using admin client
              let kelompokMap = new Map<string, any>();
              if (kelompokIds.length > 0) {
                const { data: kelompokData, error: kelompokError } = await adminSupabase
                  .from('kelompok')
                  .select('id, name')
                  .in('id', kelompokIds);
                
                if (!kelompokError && kelompokData) {
                  kelompokData.forEach((k: any) => {
                    kelompokMap.set(k.id, { id: k.id, name: k.name });
                  });
                }
              }
              
              // Combine classes and kelompok data
              classesData.forEach((cls: any) => {
                const kelompok = kelompokMap.get(cls.kelompok_id);
                classesMap.set(cls.id, {
                  name: cls.name,
                  kelompok_id: cls.kelompok_id,
                  kelompok: kelompok || null
                });
              });
            }
          }
        } catch (error) {
          // Fallback to regular client
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('classes')
            .select(`
              id,
              name,
              kelompok_id
            `)
            .in('id', Array.from(allClassIds));
          
          if (!fallbackError && fallbackData && fallbackData.length > 0) {
            // Get unique kelompok_ids and fetch kelompok separately
            const kelompokIds = [...new Set(fallbackData.map((cls: any) => cls.kelompok_id).filter(Boolean))];
            let kelompokMap = new Map<string, any>();
            
            if (kelompokIds.length > 0) {
              const { data: kelompokData, error: kelompokError } = await supabase
                .from('kelompok')
                .select('id, name')
                .in('id', kelompokIds);
              
              if (!kelompokError && kelompokData) {
                kelompokData.forEach((k: any) => {
                  kelompokMap.set(k.id, { id: k.id, name: k.name });
                });
              }
            }
            
            fallbackData.forEach((cls: any) => {
              const kelompok = kelompokMap.get(cls.kelompok_id);
              classesMap.set(cls.id, {
                name: cls.name,
                kelompok_id: cls.kelompok_id,
                kelompok: kelompok || null
              });
            });
          }
        }
      }
    }

    // For non-Admin Kelompok: fetch all classes for all teachers at once
    // This is more efficient than fetching per teacher
    if (!isAdminKelompok && data && data.length > 0) {
      const allClassIds = new Set<string>();
      data.forEach(teacher => {
        const teacherClasses = Array.isArray(teacher.teacher_classes) ? teacher.teacher_classes : (teacher.teacher_classes ? [teacher.teacher_classes] : []);
        teacherClasses.forEach((tc: any) => {
          const classId = Array.isArray(tc.class_id) ? tc.class_id[0] : tc.class_id;
          if (classId) allClassIds.add(classId);
        });
      });

      if (allClassIds.size > 0) {
        const { data: fetchedClasses, error: classesError } = await supabase
          .from('classes')
          .select(`
            id,
            name,
            kelompok_id,
            kelompok:kelompok_id(id, name)
          `)
          .in('id', Array.from(allClassIds));

        if (!classesError && fetchedClasses) {
          fetchedClasses.forEach((cls: any) => {
            const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
            classesMap.set(cls.id, {
              name: cls.name,
              kelompok_id: cls.kelompok_id,
              kelompok: kelompok
            });
          });
        }
      }
    }

    // Transform the data to include class names with kelompok context and flattened org names
    const transformedData = data?.map(teacher => {
      interface ClassData {
        className: string;
        kelompokName: string;
        kelompokId: string;
      }
      
      let classesData: ClassData[] = [];
      
      if (classesMap.size > 0) {
        // Use classesMap for both Admin Kelompok (bypass RLS) and other admins
        const teacherClasses = Array.isArray(teacher.teacher_classes) ? teacher.teacher_classes : (teacher.teacher_classes ? [teacher.teacher_classes] : []);
        classesData = teacherClasses.map((tc: any) => {
          const classId = Array.isArray(tc.class_id) ? tc.class_id[0] : tc.class_id;
          if (!classId) return null;
          const classData = classesMap.get(classId);
          if (!classData) {
            return null;
          }
          const kelompok = classData.kelompok;
          return {
            className: classData.name || '',
            kelompokName: kelompok?.name || '',
            kelompokId: kelompok?.id || ''
          };
        }).filter((c: ClassData | null): c is ClassData => c !== null && !!c.className);
      }
      
      // Check if all classes are from the same kelompok
      const uniqueKelompokIds = new Set(classesData.map((c: ClassData) => c.kelompokId).filter(Boolean));
      const isSingleKelompok = uniqueKelompokIds.size <= 1;
      
      // Format class names: only show kelompok name if classes are from different kelompok
      const classNamesWithKelompok = classesData.map((c: ClassData) => {
        if (isSingleKelompok) {
          // All classes from same kelompok: don't show kelompok name
          return c.className;
        } else {
          // Classes from different kelompok: show kelompok name to differentiate
          return c.kelompokName ? `${c.className} (${c.kelompokName})` : c.className;
        }
      });
      
      return {
      ...teacher,
        class_names: classNamesWithKelompok.length > 0 ? classNamesWithKelompok.join(', ') : '-',
      daerah_name: Array.isArray(teacher.daerah) ? teacher.daerah[0]?.name : teacher.daerah?.name || '',
      desa_name: Array.isArray(teacher.desa) ? teacher.desa[0]?.name : teacher.desa?.name || '',
      kelompok_name: Array.isArray(teacher.kelompok) ? teacher.kelompok[0]?.name : teacher.kelompok?.name || ''
      };
    }) || [];

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
    
    // Validate that classes are within admin's scope (for Admin Desa/Daerah)
    if (classIds.length > 0 && (profile.role === 'admin' || profile.role === 'superadmin')) {
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select(`
          id,
          kelompok_id,
          kelompok:kelompok_id (
            id,
            desa_id,
            desa:desa_id (
              id,
              daerah_id
            )
          )
        `)
        .in('id', classIds);
      
      if (classesError) throw classesError;
      
      // For Admin Desa: validate all classes are in their desa
      if (profile.desa_id && !profile.kelompok_id) {
        const invalidClasses = classes?.filter(cls => {
          const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
          return kelompok?.desa_id !== profile.desa_id;
        });
        
        if (invalidClasses && invalidClasses.length > 0) {
          throw new Error('Beberapa kelas tidak berada dalam desa Anda');
        }
      }
      
      // For Admin Daerah: validate all classes are in their daerah
      if (profile.daerah_id && !profile.desa_id) {
        const invalidClasses = classes?.filter(cls => {
          const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok;
          const desa = Array.isArray(kelompok?.desa) ? kelompok.desa[0] : kelompok?.desa;
          return desa?.daerah_id !== profile.daerah_id;
        });
        
        if (invalidClasses && invalidClasses.length > 0) {
          throw new Error('Beberapa kelas tidak berada dalam daerah Anda');
        }
      }
      
      // For Admin Kelompok: only allow classes from their kelompok
      if (profile.kelompok_id && !profile.desa_id) {
        const invalidClasses = classes?.filter(cls => cls.kelompok_id !== profile.kelompok_id);
        if (invalidClasses && invalidClasses.length > 0) {
          throw new Error('Anda hanya dapat menambahkan atau menghapus kelas dari kelompok Anda sendiri');
        }
      }
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

export interface MeetingFormSettings {
  showTitle: boolean
  showTopic: boolean
  showDescription: boolean
  showDate: boolean
  showMeetingType: boolean
  showClassSelection: boolean
  showStudentSelection: boolean
  showGenderFilter: boolean
}

export async function getMeetingFormSettings(userId: string): Promise<{ success: boolean; data?: MeetingFormSettings; error?: string }> {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('meeting_form_settings')
      .eq('id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return { success: true, data: undefined } // No settings found, use defaults
      }
      throw error
    }

    return { 
      success: true, 
      data: data.meeting_form_settings as MeetingFormSettings || undefined 
    }
  } catch (error) {
    console.error('Error getting meeting form settings:', error)
    return { 
      success: false, 
      error: handleApiError(error, 'memuat data', 'Gagal memuat pengaturan form').message 
    }
  }
}

export async function updateMeetingFormSettings(
  userId: string,
  settings: MeetingFormSettings
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        meeting_form_settings: settings,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      throw error
    }

    revalidatePath('/users/guru')
    revalidatePath('/absensi')
    return { success: true }
  } catch (error) {
    console.error('Error updating meeting form settings:', error)
    return {
      success: false,
      error: handleApiError(error, 'menyimpan data', 'Gagal menyimpan pengaturan form').message
    }
  }
}

export async function updateTeacherPermissions(
  userId: string,
  permissions: {
    can_archive_students?: boolean;
    can_transfer_students?: boolean;
    can_soft_delete_students?: boolean;
    can_hard_delete_students?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({
        permissions: permissions,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      throw error
    }

    revalidatePath('/users/guru')
    revalidatePath('/users/siswa')
    return { success: true }
  } catch (error) {
    console.error('Error updating teacher permissions:', error)
    return {
      success: false,
      error: handleApiError(error, 'menyimpan data', 'Gagal menyimpan hak akses').message
    }
  }
}
