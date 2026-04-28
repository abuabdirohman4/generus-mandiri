'use server';

import { createAdminClient } from '@/lib/supabase/server';

export async function getClasses(): Promise<any[]> {
  const adminClientTeacher = await createAdminClient();

  // Get all classes with their class_master_mappings and kelompok
  const { data: classes, error } = await adminClientTeacher
    .from('classes')
    .select(`
      id,
      name,
      kelompok_id,
      kelompok:kelompok(id, name),
      class_master_mappings(
        class_master:class_masters(
          category:categories(
            code,
            name
          )
        )
      )
    `)
    .order('name');

  if (error) {
    console.error('Error fetching classes:', error);
    return [];
  }

  if (!classes) return [];

  // Return clean class objects with kelompok data
  return classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    kelompok_id: cls.kelompok_id,
    kelompok: cls.kelompok  // Include kelompok object
  }));
}

export async function getClassesByTeacher(teacherId: string): Promise<any[]> {
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from('class_teachers')
    .select(`
      class:classes(*)
    `)
    .eq('teacher_id', teacherId);

  if (error) throw new Error(error.message);
  return data?.map(ct => ct.class).filter(Boolean) || [];
}
