"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

/**
 * Tambah aturan baru ke To Don't List minggu ini
 * formData: { rule_text, year, quarter, week_number }
 */
export async function addWeeklyRule(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'User not found' };

  const rule_text = formData.get('rule_text') as string;
  const year = Number(formData.get('year'));
  const quarter = Number(formData.get('quarter'));
  const week_number = Number(formData.get('week_number'));

  try {
    // Hitung display_order berikutnya
    const { data: existing, error: orderError } = await supabase
      .from('weekly_rules')
      .select('display_order')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('quarter', quarter)
      .eq('week_number', week_number)
      .order('display_order', { ascending: false })
      .limit(1);
    if (orderError) throw orderError;
    const nextOrder = (existing?.[0]?.display_order ?? 0) + 1;

    // Insert rule baru, return id
    const { data: inserted, error } = await supabase
      .from('weekly_rules')
      .insert({
        user_id: user.id,
        rule_text,
        year,
        quarter,
        week_number,
        display_order: nextOrder,
      })
      .select('id')
      .single();
    if (error) throw error;
    revalidatePath('/execution/weekly-sync');
    return { success: true, message: 'Aturan berhasil ditambahkan!', id: inserted?.id };
  } catch (error) {
    console.error('Error adding weekly rule:', error);
    return { success: false, message: 'Gagal menambah aturan' };
  }
}

/**
 * Update rule_text dari sebuah aturan berdasarkan id
 */
export async function updateWeeklyRule(id: string, newText: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'User not found' };

  try {
    const { error } = await supabase
      .from('weekly_rules')
      .update({ rule_text: newText })
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    revalidatePath('/execution/weekly-sync');
    return { success: true, message: 'Aturan berhasil diupdate!' };
  } catch (error) {
    console.error('Error updating weekly rule:', error);
    return { success: false, message: 'Gagal update aturan' };
  }
}

/**
 * Hapus aturan dari To Don't List berdasarkan id
 */
export async function deleteWeeklyRule(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, message: 'User not found' };

  try {
    const { error } = await supabase
      .from('weekly_rules')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    if (error) throw error;
    revalidatePath('/execution/weekly-sync');
    return { success: true, message: 'Aturan berhasil dihapus!' };
  } catch (error) {
    console.error('Error deleting weekly rule:', error);
    return { success: false, message: 'Gagal menghapus aturan' };
  }
} 

/**
 * Update urutan (display_order) beberapa aturan sekaligus
 * @param rules Array of { id, display_order }
 */
export async function updateWeeklyRuleOrder(rules: { id: string; display_order: number }[]) {
  const supabase = await createClient();
  try {
    // Update setiap rule satu per satu (bisa dioptimasi dengan upsert jika perlu)
    for (const rule of rules) {
      const { error } = await supabase
        .from('weekly_rules')
        .update({ display_order: rule.display_order })
        .eq('id', rule.id);
      if (error) throw error;
    }
    revalidatePath('/execution/weekly-sync');
    return { success: true };
  } catch (error) {
    console.error('Error updating weekly rule order:', error);
    return { success: false, message: 'Gagal update urutan aturan' };
  }
}
