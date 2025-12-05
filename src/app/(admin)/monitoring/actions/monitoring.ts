'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MaterialProgress, ProgressInput } from '../types';

/**
 * Get hafalan categories (categories with name containing "Hafalan")
 */
export async function getHafalanCategories(): Promise<any[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('material_categories')
        .select('id, name')
        .ilike('name', '%Hafalan%')
        .order('name');

    if (error) throw new Error(error.message);
    return data || [];
}


export async function getStudentProgress(
    studentId: string,
    academicYearId: string,
    semester: number
): Promise<MaterialProgress[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('student_material_progress')
        .select(`
      *,
      material_item:material_items(*),
      teacher:profiles(id, full_name)
    `)
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
        .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getClassProgress(
    classId: string,
    academicYearId: string,
    semester: number
): Promise<any> {
    const supabase = await createAdminClient();

    // Get students in class via student_enrollments
    const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
      student_id,
      students!inner(id, name)
    `)
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
        .eq('status', 'active');

    if (enrollError) {
        console.error('Error fetching enrollments:', enrollError);
        throw new Error(enrollError.message);
    }

    if (!enrollments || enrollments.length === 0) {
        console.log('No enrollments found for:', { classId, academicYearId, semester });
        return {
            students: [],
            progress: []
        };
    }

    // Extract students from enrollments
    const students = enrollments.map((e: any) => e.students).filter(Boolean);
    const studentIds = students.map(s => s.id);

    if (studentIds.length === 0) {
        return {
            students: [],
            progress: []
        };
    }

    // Get all progress for these students
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select(`
      *,
      material_item:material_items(*)
    `)
        .in('student_id', studentIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester);

    return {
        students,
        progress: progress || []
    };
}

export async function updateMaterialProgress(input: ProgressInput): Promise<void> {
    const supabase = await createAdminClient();

    const { error } = await supabase
        .from('student_material_progress')
        .upsert({
            ...input,
            teacher_id: (await supabase.auth.getUser()).data.user?.id
        }, {
            onConflict: 'student_id,material_item_id,academic_year_id,semester'
        });

    if (error) throw new Error(error.message);

    revalidatePath('/hafalan');
}

export async function bulkUpdateProgress(updates: ProgressInput[]): Promise<void> {
    const supabase = await createAdminClient();
    const userId = (await supabase.auth.getUser()).data.user?.id;

    const records = updates.map(update => ({
        ...update,
        teacher_id: userId
    }));

    const { error } = await supabase
        .from('student_material_progress')
        .upsert(records, {
            onConflict: 'student_id,material_item_id,academic_year_id,semester'
        });

    if (error) throw new Error(error.message);

    revalidatePath('/hafalan');
}

/**
 * Get class master IDs for a given class ID
 * A class can be mapped to multiple class masters (e.g., Pra Nikah, Remaja)
 */
async function getClassMasterIds(classId: string): Promise<string[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('class_master_mappings')
        .select('class_master_id')
        .eq('class_id', classId);

    if (error) {
        console.error('Error getting class masters:', error);
        return [];
    }

    return data?.map(m => m.class_master_id) || [];
}

export async function getMaterialsByClassAndSemester(
    classId: string,
    semester: number
): Promise<any[]> {
    const supabase = await createAdminClient();

    // Step 1: Get class_master_id(s) for this class
    const classMasterIds = await getClassMasterIds(classId);

    if (classMasterIds.length === 0) {
        return []; // No materials for this class
    }

    // Step 2: Get materials for these class masters and semester
    const { data, error } = await supabase
        .from('material_item_classes')
        .select(`
            material_item:material_items(
                id,
                name,
                description,
                material_type:material_types(
                    id,
                    name,
                    material_category:material_categories(
                        id,
                        name
                    )
                )
            )
        `)
        .in('class_master_id', classMasterIds)
        .eq('semester', semester);

    if (error) throw new Error(error.message);

    // Deduplicate materials
    const materials = data?.map((m: any) => m.material_item).filter(Boolean) || [];
    const uniqueMaterials = Array.from(
        new Map(materials.map((m: any) => [m?.id, m])).values()
    ).filter(Boolean);

    return uniqueMaterials;
}

export async function getMaterialsByCategory(
    categoryId: string,
    classId: string,
    semester: number
): Promise<any[]> {
    const supabase = await createAdminClient();

    // Step 1: Get class_master_ids
    const classMasterIds = await getClassMasterIds(classId);

    if (classMasterIds.length === 0) {
        return [];
    }

    // Step 2: Get materials with category filter
    const { data, error } = await supabase
        .from('material_items')
        .select(`
            *,
            material_type:material_types!inner(
                id,
                name,
                material_category_id,
                material_category:material_categories(
                    id,
                    name
                )
            ),
            material_item_classes!inner(
                class_master_id,
                semester
            )
        `)
        .eq('material_type.material_category_id', categoryId)
        .in('material_item_classes.class_master_id', classMasterIds)
        .eq('material_item_classes.semester', semester);

    if (error) throw new Error(error.message);

    // Deduplicate materials
    const uniqueMaterials = Array.from(
        new Map(data?.map((m: any) => [m.id, m]) || []).values()
    );

    return uniqueMaterials;
}
