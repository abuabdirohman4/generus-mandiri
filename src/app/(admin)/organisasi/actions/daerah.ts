"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface DaerahData {
  name: string;
}

export async function createDaerah(data: DaerahData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('daerah')
      .insert([{
        name: data.name.trim()
      }]);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error creating daerah:', error);
    throw handleApiError(error, 'menyimpan data', 'Gagal membuat daerah');
  }
}

export async function updateDaerah(id: string, data: DaerahData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('daerah')
      .update({
        name: data.name.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error updating daerah:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate daerah');
  }
}

export async function deleteDaerah(id: string) {
  try {
    const supabase = await createClient();

    // Check if daerah has dependencies
    const { data: desaCount } = await supabase
      .from('desa')
      .select('id', { count: 'exact', head: true })
      .eq('daerah_id', id);

    const { data: kelompokCount } = await supabase
      .from('kelompok')
      .select('id', { count: 'exact', head: true })
      .eq('daerah_id', id);

    const { data: siswaCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('daerah_id', id);

    if ((desaCount?.length || 0) > 0 || (kelompokCount?.length || 0) > 0 || (siswaCount?.length || 0) > 0) {
      throw new Error('Tidak dapat menghapus daerah yang memiliki data terkait');
    }

    const { error } = await supabase
      .from('daerah')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error deleting daerah:', error);
    throw handleApiError(error, 'menghapus data', 'Gagal menghapus daerah');
  }
}

export async function getAllDaerah() {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const filter = profile ? getDataFilter(profile) : null;

    let query = supabase
      .from('daerah')
      .select(`
        *,
        desa(count),
        students(count)
      `)
      .order('name');
    
    // Apply filtering for admin users
    if (filter?.daerah_id) {
      query = query.eq('id', filter.daerah_id);
    }
    
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Get kelompok count separately since it's not directly related to daerah
    const daerahIds = data?.map(d => d.id) || [];
    let kelompokCounts: { [key: string]: number } = {};
    
    if (daerahIds.length > 0) {
      // Get kelompok count by first getting desa IDs for each daerah, then kelompok
      const { data: desaData } = await supabase
        .from('desa')
        .select('id, daerah_id')
        .in('daerah_id', daerahIds);
      
      if (desaData && desaData.length > 0) {
        const desaIds = desaData.map(d => d.id);
        const { data: kelompokData } = await supabase
          .from('kelompok')
          .select('desa_id')
          .in('desa_id', desaIds);
        
        // Count kelompok per daerah
        kelompokCounts = kelompokData?.reduce((acc, k) => {
          const desa = desaData.find(d => d.id === k.desa_id);
          if (desa) {
            const daerahId = desa.daerah_id;
            acc[daerahId] = (acc[daerahId] || 0) + 1;
          }
          return acc;
        }, {} as { [key: string]: number }) || {};
      }
    }

    // Transform the data to include counts
    const transformedData = data?.map(daerah => ({
      ...daerah,
      desa_count: daerah.desa?.[0]?.count || 0,
      kelompok_count: kelompokCounts[daerah.id] || 0,
      siswa_count: daerah.students?.[0]?.count || 0
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching daerah:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data daerah');
  }
}
