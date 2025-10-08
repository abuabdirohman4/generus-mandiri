"use server";

import { revalidatePath } from "next/cache";
import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { BrainDumpItem } from '../types';

export interface CreateBrainDumpData {
  content: string;
  date: string; // YYYY-MM-DD format
}

export interface UpdateBrainDumpData {
  content: string;
}

/**
 * Get brain dump for a specific date (single item)
 */
export async function getBrainDumpByDate(date: string): Promise<BrainDumpItem | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('brain_dumps')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date)
      .single();

    if (error) {
      // If no row found, return null instead of error
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  } catch (error) {
    handleApiError(error, 'memuat data', 'gagal memuat brain dump');
    return null;
  }
}

/**
 * Create or update brain dump for a specific date
 */
export async function upsertBrainDump(brainDumpData: CreateBrainDumpData): Promise<BrainDumpItem | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    if (!brainDumpData.date) {
      throw new Error('Tanggal tidak boleh kosong');
    }

    const { data, error } = await supabase
      .from('brain_dumps')
      .upsert({
        content: brainDumpData.content ? brainDumpData.content.trim() : '',
        date: brainDumpData.date,
        user_id: user.id,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,date'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    revalidatePath('/execution/daily-sync');
    return data;
  } catch (error) {
    handleApiError(error, 'menyimpan data', 'gagal menyimpan brain dump');
    throw error;
  }
}


/**
 * Get brain dump items for a date range
 */
export async function getBrainDumpByDateRange(startDate: string, endDate: string): Promise<BrainDumpItem[]> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('brain_dumps')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    handleApiError(error, 'memuat data', 'gagal memuat data berdasarkan rentang tanggal');
    return [];
  }
}
