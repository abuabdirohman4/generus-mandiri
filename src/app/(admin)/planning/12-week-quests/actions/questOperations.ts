"use server";

import { revalidatePath } from "next/cache";
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import type { Quest } from '../hooks/useQuestState';
import type { RankedQuest } from '../hooks/useRankingCalculation';

/**
 * Save quests to database
 * Handles both creating new quests and updating existing ones
 */
export async function saveQuests(
  quests: Quest[], 
  year: number, 
  quarter: number
): Promise<{ success: boolean; message: string; insertedQuests?: any[] }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Filter quests that have titles (filled quests)
    const filledQuests = quests.filter(q => q.title.trim() !== "");
    const questsWithId = filledQuests.filter(q => q.id);
    const newQuests = filledQuests.filter(q => !q.id);

    // Update existing quests
    if (questsWithId.length > 0) {
      for (const quest of questsWithId) {
        const { error } = await supabase
          .from('quests')
          .update({ 
            title: quest.title,
            type: quest.type || 'PERSONAL',
            // Continuity tracking fields
            source_quest_id: quest.source_quest_id || null,
            is_continuation: quest.is_continuation || false,
            continuation_strategy: quest.continuation_strategy || null,
            continuation_date: quest.continuation_date || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', quest.id)
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }
      }
    }

    // Create new quests
    let insertedQuests: any[] = [];
    if (newQuests.length > 0) {
      const questsToInsert = newQuests.map(q => ({
        title: q.title,
        label: q.label,
        type: 'PERSONAL', // Default to PERSONAL for 12-week quests
        year,
        quarter,
        user_id: user.id,
        // Continuity tracking fields
        source_quest_id: q.source_quest_id || null,
        is_continuation: q.is_continuation || false,
        continuation_strategy: q.continuation_strategy || null,
        continuation_date: q.continuation_date || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { data: insertedData, error } = await supabase
        .from('quests')
        .insert(questsToInsert)
        .select('id, title, label');

      if (error) {
        throw error;
      }

      insertedQuests = insertedData || [];
    }

    // Delete empty quests (quests that exist in DB but are now empty in the form)
    const emptyQuests = quests.filter(q => !q.title.trim() && q.id);
    if (emptyQuests.length > 0) {
      const emptyQuestIds = emptyQuests.map(q => q.id).filter(Boolean);
      
      if (emptyQuestIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('quests')
          .delete()
          .in('id', emptyQuestIds)
          .eq('user_id', user.id);

        if (deleteError) {
          throw deleteError;
        }

        console.log('🗑️ Empty quests deleted:', emptyQuestIds);
      }
    }

    revalidatePath('/planning/12-week-quests');
    return { 
      success: true, 
      message: "Quest berhasil disimpan!",
      insertedQuests
    };
  } catch (error) {
    const errorInfo = handleApiError(error, 'menyimpan data');
    return { 
      success: false, 
      message: errorInfo.message || 'Gagal menyimpan quest'
    };
  }
}

/**
 * Finalize quests with pairwise results and priority scores
 * Commits the final ranking and sets top 3 quests as main quests
 */
export async function finalizeQuests(
  pairwiseResults: { [key: string]: string },
  questsWithScore: { id: string; title: string; priority_score: number }[],
  year: number,
  quarter: number
): Promise<{ success: boolean; message: string; url?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Sort quests by priority score to get top 3
    const sortedQuests = questsWithScore.sort((a, b) => b.priority_score - a.priority_score);
    const top3Quests = sortedQuests.slice(0, 3);
    
    console.log('🏆 Top 3 quests:', top3Quests.map(q => ({ title: q.title, score: q.priority_score })));

    // Update quests with priority scores and mark top 3 as main quests
    for (const quest of questsWithScore) {
      const isTop3 = top3Quests.some(top => top.id === quest.id);
      
      const { error } = await supabase
        .from('quests')
        .update({ 
          priority_score: quest.priority_score,
          type: 'PERSONAL', // Ensure type is set for 12-week quests
          is_committed: isTop3, // Only mark top 3 as committed
          updated_at: new Date().toISOString()
        })
        .eq('id', quest.id)
        .eq('user_id', user.id);

      if (error) {
        throw error;
      }
    }

    // Save pairwise results
    const { error: pairwiseError } = await supabase
      .from('pairwise_results')
      .upsert({
        user_id: user.id,
        year,
        quarter,
        results_json: pairwiseResults,
        is_finalized: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,year,quarter'
      });

    if (pairwiseError) {
      throw pairwiseError;
    }

    // Note: Main quest marking removed as is_main_quest column doesn't exist in database
    // Priority scores are already saved above

    revalidatePath('/planning/12-week-quests');
    revalidatePath('/planning/main-quests');

    const top3Titles = top3Quests.map(q => q.title).join(', ');
    
    return { 
      success: true, 
      message: `Prioritas berhasil ditentukan! Top 3 quest: ${top3Titles}`,
      url: '/planning/main-quests'
    };
  } catch (error) {
    const errorInfo = handleApiError(error, 'mengupdate data');
    return { 
      success: false, 
      message: errorInfo.message || 'Gagal commit main quest'
    };
  }
}

/**
 * Get all quests for a specific quarter
 */
export async function getAllQuestsForQuarter(
  year: number, 
  quarter: number
): Promise<{ id?: string, title: string, label?: string }[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('quests')
      .select('id, title, label')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('quarter', quarter)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    handleApiError(error, 'memuat data');
    return [];
  }
}

/**
 * Get pairwise results for a specific quarter
 */
export async function getPairwiseResults(
  year: number, 
  quarter: number
): Promise<{ [key: string]: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('pairwise_results')
      .select('results_json')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('quarter', quarter)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No pairwise results found, return empty object
        return {};
      }
      throw error;
    }

    return data?.results_json || {};
  } catch (error) {
    handleApiError(error, 'memuat data');
    return {};
  }
}
