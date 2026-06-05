// NO 'use server' directive
import type { SupabaseClient } from '@supabase/supabase-js'

export async function fetchTeacherKelompokAccess(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_kelompok_access')
    .select('id, kelompok_id, kelompok:kelompok_id(id, name)')
    .eq('teacher_id', teacherId)
}

export async function deleteTeacherKelompokAccess(supabase: SupabaseClient, teacherId: string) {
  return await supabase
    .from('teacher_kelompok_access')
    .delete()
    .eq('teacher_id', teacherId)
}

export async function insertTeacherKelompokAccess(
  supabase: SupabaseClient,
  mappings: Array<{ teacher_id: string; kelompok_id: string }>
) {
  return await supabase
    .from('teacher_kelompok_access')
    .insert(mappings)
}

export async function fetchTeacherKelompokIds(supabase: SupabaseClient, teacherId: string) {
  const { data, error } = await supabase
    .from('teacher_kelompok_access')
    .select('kelompok_id')
    .eq('teacher_id', teacherId)
  return { data: data?.map(r => r.kelompok_id) ?? [], error }
}
