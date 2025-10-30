'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveDayMaterial(data: {
  class_master_id: string;
  semester: number;
  month: number;
  week: number;
  day_of_week: number;
  title: string;
  content: string;
}) {
  const supabase = await createClient();
  
  // Prepare content as JSONB
  const contentJson = {
    title: data.title,
    content: data.content,
  };

  // Insert or update
  const { error } = await supabase
    .from('learning_materials')
    .upsert({
      class_master_id: data.class_master_id,
      semester: data.semester,
      month: data.month,
      week: data.week,
      day_of_week: data.day_of_week,
      content: contentJson,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'class_master_id,semester,month,week,day_of_week'
    });

  if (error) {
    console.error('Error saving material:', error);
    throw new Error('Gagal menyimpan materi');
  }

  revalidatePath('/materi');
  return { success: true };
}

export async function getDayMaterial(
  class_master_id: string,
  semester: number,
  month: number,
  week: number,
  day_of_week: number
) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('learning_materials')
    .select('*')
    .eq('class_master_id', class_master_id)
    .eq('semester', semester)
    .eq('month', month)
    .eq('week', week)
    .eq('day_of_week', day_of_week)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting material:', error);
    throw new Error('Gagal memuat materi');
  }

  return data;
}

export async function getAvailableClassMasters() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('class_masters')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error getting class masters:', error);
    throw new Error('Gagal memuat daftar kelas');
  }

  return data || [];
}

export async function getLearningMaterial(params: {
  classMasterId: string;
  semester: number;
  month: number;
  week: number;
  dayOfWeek: number;
}) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('learning_materials')
    .select('*')
    .eq('class_master_id', params.classMasterId)
    .eq('semester', params.semester)
    .eq('month', params.month)
    .eq('week', params.week)
    .eq('day_of_week', params.dayOfWeek)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error getting learning material:', error);
    throw new Error('Gagal memuat materi pembelajaran');
  }

  return data;
}