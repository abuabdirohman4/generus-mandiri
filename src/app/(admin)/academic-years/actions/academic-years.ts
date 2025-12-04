'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AcademicYear, AcademicYearInput } from '../types';

export async function getAcademicYears(): Promise<AcademicYear[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .order('start_year', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getActiveAcademicYear(): Promise<AcademicYear | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('academic_years')
        .select('*')
        .eq('is_active', true)
        .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data;
}

export async function createAcademicYear(input: AcademicYearInput): Promise<AcademicYear> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('academic_years')
        .insert(input)
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath('/academic-years');
    return data;
}

export async function updateAcademicYear(id: string, input: Partial<AcademicYearInput>): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('academic_years')
        .update(input)
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/academic-years');
}

export async function setActiveAcademicYear(id: string): Promise<void> {
    const supabase = await createClient();

    // First, set all to inactive
    await supabase
        .from('academic_years')
        .update({ is_active: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all

    // Then set the selected one to active
    const { error } = await supabase
        .from('academic_years')
        .update({ is_active: true })
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/academic-years');
}

export async function deleteAcademicYear(id: string): Promise<void> {
    const supabase = await createClient();

    // Check if it's active
    const { data: year } = await supabase
        .from('academic_years')
        .select('is_active')
        .eq('id', id)
        .single();

    if (year?.is_active) {
        throw new Error('Tidak dapat menghapus tahun ajaran yang sedang aktif');
    }

    const { error } = await supabase
        .from('academic_years')
        .delete()
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/academic-years');
}
