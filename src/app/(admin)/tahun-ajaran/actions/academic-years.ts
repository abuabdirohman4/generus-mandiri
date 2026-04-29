'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { AcademicYear, AcademicYearInput } from '../types';
import { logActivity } from '@/lib/activityLogger';
import { getCurrentUserProfile } from '@/lib/accessControlServer';

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

    revalidatePath('/tahun-ajaran');
    
    const profile = await getCurrentUserProfile();
    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'create_academic_year',
            entityType: 'academic_year',
            entityId: data.id,
            entityLabel: `${data.start_year}/${data.end_year}`,
            pagePath: '/tahun-ajaran',
            metadata: input as any
        });
    }

    return data;
}

export async function updateAcademicYear(id: string, input: Partial<AcademicYearInput>): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('academic_years')
        .update(input)
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/tahun-ajaran');

    const profile = await getCurrentUserProfile();
    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'update_academic_year',
            entityType: 'academic_year',
            entityId: id,
            pagePath: '/tahun-ajaran',
            metadata: input as any
        });
    }
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

    revalidatePath('/tahun-ajaran');

    const profile = await getCurrentUserProfile();
    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'update_academic_year_status',
            entityType: 'academic_year',
            entityId: id,
            entityLabel: 'Set Active',
            pagePath: '/tahun-ajaran'
        });
    }
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

    revalidatePath('/tahun-ajaran');

    const profile = await getCurrentUserProfile();
    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'delete_academic_year',
            entityType: 'academic_year',
            entityId: id,
            pagePath: '/tahun-ajaran'
        });
    }
}
