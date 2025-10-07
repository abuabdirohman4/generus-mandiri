"use server";

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

// Tambah 10 quest sekaligus
export async function addMultipleQuests(quests: { title: string, label: string }[], year: number, quarter: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not found');
  // Buat array data quest
  const questData = quests.map(q => ({
    user_id: user.id,
    title: q.title,
    label: q.label,
    year,
    quarter,
    is_committed: false,
    type: 'PERSONAL',
  }));
  const { data, error } = await supabase
    .from('quests')
    .insert(questData)
    .select('id, title, label');
  if (error) throw new Error('Gagal menyimpan quest: ' + (error.message || ''));
  return { quests: data, message: '10 Kandidat Quest berhasil disimpan!' };
}

// Update judul quest berdasarkan id
export async function updateQuests(quests: { id: string, title: string, label: string }[]) {
  const supabase = await createClient();
  for (const quest of quests) {
    const { error } = await supabase
      .from('quests')
      .update({ title: quest.title, label: quest.label })
      .eq('id', quest.id);
    if (error) throw new Error('Gagal update quest: ' + (error.message || ''));
  }
  
  // Revalidate SWR cache
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/planning/12-week-quests');
  
  return { message: 'Perubahan quest berhasil disimpan!' };
}

// Finalize 12 Week Quests: simpan pairwise, update skor, commit 3 teratas
export async function finalizeQuests(
  pairwiseResults: Record<string, string>,
  quests: { id: string; title: string; priority_score: number }[],
  year: number,
  quarter: number
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not found');

  // 1. Upsert pairwise_results
  const { error: upsertError } = await supabase
    .from('pairwise_results')
    .upsert([
      {
        user_id: user.id,
        year,
        quarter,
        results_json: pairwiseResults,
        is_finalized: true,
      },
    ], { onConflict: 'user_id,year,quarter' });
  if (upsertError) throw new Error('Gagal menyimpan pairwise results: ' + (upsertError.message || ''));

  // 2. Update priority_score untuk semua quest
  for (const quest of quests) {
    const { error: updateError } = await supabase
      .from('quests')
      .update({ priority_score: quest.priority_score })
      .eq('id', quest.id);
    if (updateError) throw new Error('Gagal update skor quest: ' + (updateError.message || ''));
  }

  // 3. Commit 3 quest teratas
  const top3 = [...quests]
    .sort((a, b) => b.priority_score - a.priority_score)
    .slice(0, 3)
    .map(q => q.id);
  if (top3.length > 0) {
    const { error: commitError } = await supabase
      .from('quests')
      .update({ is_committed: true })
      .in('id', top3);
    if (commitError) throw new Error('Gagal commit main quest: ' + (commitError.message || ''));
  }

  revalidatePath('/planning/12-week-quests');
  revalidatePath('/planning/main-quests');
  return { message: 'Prioritas berhasil ditentukan dan 3 Main Quest telah ditetapkan!', url: '/planning/main-quests' };
}

// Ambil SEMUA quest (committed & uncommitted) untuk user, year, quarter
export async function getAllQuestsForQuarter(year: number, quarter: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('quests')
    .select('id, title, label, is_committed, priority_score')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('quarter', quarter)
    .order('label', { ascending: true });
  
  if (error) {
    return [];
  }
  
  return data;
}

// Ambil pairwise_results (hasil perbandingan) untuk user, year, quarter
export async function getPairwiseResults(year: number, quarter: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from('pairwise_results')
    .select('results_json')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('quarter', quarter)
    .single();
  if (error || !data) return null;
  return data.results_json;
}

// Ambil Main Quest yang sudah committed untuk user, year, quarter
export async function getQuests(year: number, quarter: number, isCommitted: boolean = true) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('quests')
    .select('id, title, motivation, priority_score, is_committed')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('quarter', quarter)
    .eq('is_committed', isCommitted)
    .order('priority_score', { ascending: false })
    .limit(3);
  
  if (error) {
    return [];
  }
  return data;
}

// Ambil quest yang belum committed untuk user, year, quarter
export async function getUncommittedQuests(year: number, quarter: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('quests')
    .select('id, title')
    .eq('user_id', user.id)
    .eq('year', year)
    .eq('quarter', quarter)
    .eq('is_committed', false);
  if (error) return [];
  return data;
}

// Update motivation quest berdasarkan id
export async function updateQuestMotivation(questId: string, motivation: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('quests')
    .update({ motivation })
    .eq('id', questId);
  if (error) throw new Error('Gagal update motivation: ' + (error.message || ''));
  
  // Revalidate multiple paths to ensure data refresh
  revalidatePath('/planning/main-quests');
  revalidatePath('/planning/12-week-quests');
  
  return { message: 'Motivation berhasil diupdate!' };
}
