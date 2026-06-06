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
          sort_order
        )
      )
    `)
    .order('name');

  if (error) {
    console.error('Error fetching classes:', error);
    return [];
  }

  if (!classes) return [];

  // Return clean class objects with kelompok data and master mapping IDs
  const mappedClasses = classes.map(cls => {
    // Calculate minimum sort order from all mapped class masters
    const sortOrders = (cls.class_master_mappings || [])
      .map((m: any) => m.class_master?.sort_order)
      .filter((s: any) => s !== null && s !== undefined);
    
    const minSortOrder = sortOrders.length > 0 ? Math.min(...sortOrders) : 999;

    return {
      id: cls.id,
      name: cls.name,
      kelompok_id: cls.kelompok_id,
      kelompok: cls.kelompok,
      class_master_ids: (cls.class_master_mappings || []).map((m: any) => m.class_master_id),
      min_sort_order: minSortOrder
    };
  });

  // Sort by min_sort_order first, then by name
  return mappedClasses.sort((a, b) => {
    if (a.min_sort_order !== b.min_sort_order) {
      return a.min_sort_order - b.min_sort_order;
    }
    return a.name.localeCompare(b.name);
  });
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
