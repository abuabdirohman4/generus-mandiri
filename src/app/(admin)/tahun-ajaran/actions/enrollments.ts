'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { StudentEnrollment, EnrollmentInput } from '../types';

export async function enrollStudent(input: EnrollmentInput): Promise<StudentEnrollment> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('student_enrollments')
        .insert(input)
        .select()
        .single();

    if (error) throw new Error(error.message);

    revalidatePath('/students');
    return data;
}

export async function getStudentEnrollments(studentId: string): Promise<StudentEnrollment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
      *,
      academic_year:academic_years(*),
      class:classes(
        *,
        class_master_mappings(
            class_master_id,
            class_master:class_masters(*)
        )
      )
    `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getClassEnrollments(
    classId: string,
    academicYearId: string,
    semester: number
): Promise<StudentEnrollment[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('student_enrollments')
        .select(`
      *,
      student:students!inner(*)
    `)
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
        .eq('status', 'active')
        .is('students.deleted_at', null);

    if (error) throw new Error(error.message);
    return data || [];
}

export async function updateEnrollmentStatus(id: string, status: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('student_enrollments')
        .update({ status })
        .eq('id', id);

    if (error) throw new Error(error.message);

    revalidatePath('/students');
}

export async function bulkEnrollStudents(
    studentIds: string[],
    classId: string,
    academicYearId: string,
    semester: number
): Promise<void> {
    const supabase = await createClient();

    const enrollments = studentIds.map(studentId => ({
        student_id: studentId,
        class_id: classId,
        academic_year_id: academicYearId,
        semester,
        status: 'active' as const
    }));

    const { error } = await supabase
        .from('student_enrollments')
        .upsert(enrollments, {
            onConflict: 'student_id,academic_year_id,semester',
            ignoreDuplicates: false
        });

    if (error) throw new Error(error.message);

    revalidatePath('/students');
}
