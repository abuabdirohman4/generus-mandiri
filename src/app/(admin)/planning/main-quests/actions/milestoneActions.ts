"use server";

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';

// Ambil semua milestones untuk quest tertentu
export async function getMilestonesForQuest(questId: string) {
  const supabase = await createClient();
  
  // First check if quest exists
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('id, title')
    .eq('id', questId)
    .single();
  
  if (questError) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('milestones')
    .select('id, title, display_order, status')
    .eq('quest_id', questId)
    .order('display_order', { ascending: true });
  
  if (error) {
    return [];
  }
  
  return data;
}

// Tambah milestone baru ke quest
export async function addMilestone(formData: FormData) {
  const supabase = await createClient();
  const quest_id = formData.get('quest_id');
  const title = formData.get('title');
  const display_order = formData.get('display_order');
  
  if (!quest_id || !title) throw new Error('quest_id dan title wajib diisi');
  
  // Validasi quest_id exists dan user memiliki akses
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('id, user_id')
    .eq('id', quest_id)
    .single();
  
  if (questError || !quest) {
    throw new Error('Quest tidak ditemukan atau tidak memiliki akses');
  }
  
  // Gunakan display_order yang dikirim dari frontend, atau hitung otomatis jika tidak ada
  let order = 1;
  if (display_order) {
    order = parseInt(display_order.toString());
  } else {
    // Fallback: hitung display_order terakhir
    const { data: last, error: lastError } = await supabase
      .from('milestones')
      .select('display_order')
      .eq('quest_id', quest_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();
    
    if (lastError && lastError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error fetching last milestone order:', lastError);
    }
    
    order = last && last.display_order ? last.display_order + 1 : 1;
  }
  
  const { data, error } = await supabase
    .from('milestones')
    .insert({ quest_id, title, display_order: order, status: 'TODO' })
    .select('id, title, display_order, status')
    .single();
    
  if (error) {
    throw new Error('Gagal menambah milestone: ' + (error.message || 'Unknown error'));
  }
  
  revalidatePath('/planning/main-quests');
  return { message: 'Milestone berhasil ditambahkan!', milestone: data };
}

// Edit milestone
export async function updateMilestone(milestoneId: string, title: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('milestones')
    .update({ title })
    .eq('id', milestoneId);
  if (error) throw new Error('Gagal update milestone: ' + (error.message || ''));
  revalidatePath('/planning/main-quests');
  return { message: 'Milestone berhasil diupdate!' };
}

// Update milestone status
export async function updateMilestoneStatus(milestoneId: string, newStatus: 'TODO' | 'DONE') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('milestones')
    .update({ status: newStatus })
    .eq('id', milestoneId);
  if (error) throw new Error('Gagal update status milestone: ' + (error.message || ''));
  revalidatePath('/planning/main-quests');
  return { message: 'Status milestone berhasil diupdate!' };
}

// Hapus milestone
export async function deleteMilestone(milestoneId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('milestones')
    .delete()
    .eq('id', milestoneId);
  if (error) throw new Error('Gagal hapus milestone: ' + (error.message || ''));
  revalidatePath('/planning/main-quests');
  return { message: 'Milestone berhasil dihapus!' };
}
