'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

import { LIFE_AREAS } from './constants';

// Ambil semua visi milik user yang sedang login
export async function getVisions() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('visions')
    .select('*')
    .eq('user_id', user.id);
  if (error) return [];
  return data;
}

// Upsert visi untuk semua area kehidupan sekaligus
export async function upsertVision(formData: FormData) {
  'use server';
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  for (const area of LIFE_AREAS) {
    const vision_3_5_year = formData.get(`${area}-vision_3_5_year`) as string;
    const vision_10_year = formData.get(`${area}-vision_10_year`) as string;
    await supabase
      .from('visions')
      .upsert({
        user_id: user.id,
        life_area: area,
        vision_3_5_year,
        vision_10_year,
      }, { onConflict: 'user_id,life_area' });
  }
  revalidatePath('/planning/vision');
} 