"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface KelompokData {
  name: string;
  desa_id: string;
}

export async function createKelompok(data: KelompokData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('kelompok')
      .insert([{
        name: data.name.trim(),
        desa_id: data.desa_id
      }]);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error creating kelompok:', error);
    throw handleApiError(error, 'menyimpan data', 'Gagal membuat kelompok');
  }
}

export async function updateKelompok(id: string, data: KelompokData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('kelompok')
      .update({
        name: data.name.trim(),
        desa_id: data.desa_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error updating kelompok:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate kelompok');
  }
}

export async function deleteKelompok(id: string) {
  try {
    const supabase = await createClient();

    // Check if kelompok has dependencies
    const { data: kelasCount } = await supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('kelompok_id', id);

    const { data: siswaCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('kelompok_id', id);

    if ((kelasCount?.length || 0) > 0 || (siswaCount?.length || 0) > 0) {
      throw new Error('Tidak dapat menghapus kelompok yang memiliki data terkait');
    }

    const { error } = await supabase
      .from('kelompok')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error deleting kelompok:', error);
    throw handleApiError(error, 'menghapus data', 'Gagal menghapus kelompok');
  }
}

export async function getAllKelompok() {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const filter = profile ? getDataFilter(profile) : null;

    let query = supabase
      .from('kelompok')
      .select(`
        *,
        desa:desa_id(name, daerah:daerah_id(name)),
        classes(count),
        students(count)
      `)
      .order('name');
    
    // Apply filtering for admin users
    if (filter?.kelompok_id) {
      query = query.eq('id', filter.kelompok_id);
    } else if (filter?.desa_id) {
      query = query.eq('desa_id', filter.desa_id);
    } else if (filter?.daerah_id) {
      const { data: desaIds } = await supabase.from('desa').select('id').eq('daerah_id', filter.daerah_id);
      const desaIdList = desaIds?.map(d => d.id) || [];
      if (desaIdList.length > 0) {
        query = query.in('desa_id', desaIdList);
      }
    }
    
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform the data to include counts and flatten daerah info
    const transformedData = data?.map(kelompok => ({
      ...kelompok,
      daerah_name: kelompok.desa?.daerah?.name || '',
      kelas_count: kelompok.classes?.[0]?.count || 0,
      siswa_count: kelompok.students?.[0]?.count || 0
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching kelompok:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data kelompok');
  }
}

export async function getKelompokByDesa(desaId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('kelompok')
      .select(`
        *,
        desa:desa_id(name, daerah:daerah_id(name)),
        classes(count),
        students(count)
      `)
      .eq('desa_id', desaId)
      .order('name');

    if (error) {
      throw error;
    }

    // Transform the data to include counts and flatten daerah info
    const transformedData = data?.map(kelompok => ({
      ...kelompok,
      daerah_name: kelompok.desa?.daerah?.name || '',
      kelas_count: kelompok.classes?.[0]?.count || 0,
      siswa_count: kelompok.students?.[0]?.count || 0
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching kelompok by desa:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data kelompok');
  }
}
