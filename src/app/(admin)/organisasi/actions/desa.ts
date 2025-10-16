"use server";

import { createClient } from '@/lib/supabase/server';
import { handleApiError } from '@/lib/errorUtils';
import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer';

export interface DesaData {
  name: string;
  daerah_id: string;
}

export async function createDesa(data: DesaData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('desa')
      .insert([{
        name: data.name.trim(),
        daerah_id: data.daerah_id
      }]);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error creating desa:', error);
    throw handleApiError(error, 'menyimpan data', 'Gagal membuat desa');
  }
}

export async function updateDesa(id: string, data: DesaData) {
  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('desa')
      .update({
        name: data.name.trim(),
        daerah_id: data.daerah_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error updating desa:', error);
    throw handleApiError(error, 'mengupdate data', 'Gagal mengupdate desa');
  }
}

export async function deleteDesa(id: string) {
  try {
    const supabase = await createClient();

    // Check if desa has dependencies
    const { data: kelompokCount } = await supabase
      .from('kelompok')
      .select('id', { count: 'exact', head: true })
      .eq('desa_id', id);

    const { data: siswaCount } = await supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('desa_id', id);

    if ((kelompokCount?.length || 0) > 0 || (siswaCount?.length || 0) > 0) {
      throw new Error('Tidak dapat menghapus desa yang memiliki data terkait');
    }

    const { error } = await supabase
      .from('desa')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    revalidatePath('/organisasi');
    return { success: true };
  } catch (error) {
    console.error('Error deleting desa:', error);
    throw handleApiError(error, 'menghapus data', 'Gagal menghapus desa');
  }
}

export async function getAllDesa() {
  try {
    const supabase = await createClient();
    const profile = await getCurrentUserProfile();
    const filter = profile ? getDataFilter(profile) : null;

    let query = supabase
      .from('desa')
      .select(`
        *,
        daerah:daerah_id(name),
        kelompok(count),
        students(count)
      `)
      .order('name');
    
    // Apply filtering for admin users
    if (filter?.daerah_id) {
      query = query.eq('daerah_id', filter.daerah_id);
    } else if (filter?.desa_id) {
      query = query.eq('id', filter.desa_id);
    }
    
    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Transform the data to include counts
    const transformedData = data?.map(desa => ({
      ...desa,
      daerah_name: Array.isArray(desa.daerah) ? desa.daerah[0]?.name : desa.daerah?.name || '',
      kelompok_count: desa.kelompok?.[0]?.count || 0,
      siswa_count: desa.students?.[0]?.count || 0
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching desa:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data desa');
  }
}

export async function getDesaByDaerah(daerahId: string) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('desa')
      .select(`
        *,
        daerah:daerah_id(name),
        kelompok(count),
        students(count)
      `)
      .eq('daerah_id', daerahId)
      .order('name');

    if (error) {
      throw error;
    }

    // Transform the data to include counts
    const transformedData = data?.map(desa => ({
      ...desa,
      daerah_name: Array.isArray(desa.daerah) ? desa.daerah[0]?.name : desa.daerah?.name || '',
      kelompok_count: desa.kelompok?.[0]?.count || 0,
      siswa_count: desa.students?.[0]?.count || 0
    })) || [];

    return transformedData;
  } catch (error) {
    console.error('Error fetching desa by daerah:', error);
    throw handleApiError(error, 'memuat data', 'Gagal mengambil data desa');
  }
}
