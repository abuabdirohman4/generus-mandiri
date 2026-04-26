// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchTeacherClassMasters(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_class_masters')
    .select('id, class_master_id, class_masters:class_master_id(id, name, sort_order)')
    .eq('teacher_id', teacherId)
}

export async function deleteTeacherClassMasterAssignments(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_class_masters')
    .delete()
    .eq('teacher_id', teacherId)
}

export async function insertTeacherClassMasterAssignments(
  supabase: SupabaseClient,
  mappings: Array<{ teacher_id: string; class_master_id: string }>
) {
  return await supabase
    .from('teacher_class_masters')
    .insert(mappings)
}
