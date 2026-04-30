'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { MaterialProgress, ProgressInput } from '../types';
import { logActivity } from '@/lib/activityLogger';
import { getCurrentUserProfile } from '@/lib/accessControlServer';
import { getActiveAcademicYear } from '@/app/(admin)/tahun-ajaran/actions/academic-years';

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

export async function getTeacherRestrictions(): Promise<string[] | null> {
    const supabase = await createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('teacher_class_masters')
        .select('class_master_id')
        .eq('teacher_id', user.id);

    if (error) {
        console.error('Error fetching teacher restrictions:', error);
        return null;
    }

    if (!data || data.length === 0) return null;
    return data.map(d => d.class_master_id);
}

export async function getTeacherAllowedClassesAction(): Promise<string[] | null> {
    const { getTeacherAllowedClassIds, getCurrentUserProfile } = await import('@/lib/accessControlServer');
    const profile = await getCurrentUserProfile();
    if (!profile) return null;

    const allowedSet = await getTeacherAllowedClassIds(profile.id, profile);
    return allowedSet ? Array.from(allowedSet) : null;
}

export async function getAllowedCategories(classMasterIds: string[]): Promise<string[]> {
    const supabase = await createAdminClient();

    const { data, error } = await supabase
        .from('material_monthly_targets')
        .select(`
            material_item:material_items(
                material_type:material_types(
                    material_category_id
                )
            )
        `)
        .in('class_master_id', classMasterIds);

    if (error) {
        console.error('Error fetching allowed categories:', error);
        return [];
    }

    const categoryIds = new Set<string>();
    data?.forEach((row: any) => {
        const catId = row.material_item?.material_type?.material_category_id;
        if (catId) categoryIds.add(catId);
    });

    return Array.from(categoryIds);
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
    if (!classId || !academicYearId) {
        console.error('[getClassProgress] Missing required params:', { classId, academicYearId });
        return { students: [], progress: [] };
    }

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
        .eq('status', 'active');

    if (enrollError) {
        console.error('[getClassProgress] Error fetching enrollments:', enrollError);
        throw new Error(enrollError.message);
    }

    if (!enrollments || enrollments.length === 0) {
        console.log('[getClassProgress] No enrollments found for:', { classId, academicYearId, semester });
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

    const profile = await getCurrentUserProfile();
    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'update_monitoring_data',
            entityType: 'student_progress',
            entityId: input.student_id,
            pagePath: '/monitoring',
            metadata: input as any
        });
    }
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

    const profile = await getCurrentUserProfile();
    if (profile) {
        void logActivity({
            userId: profile.id,
            action: 'update_monitoring_data',
            entityType: 'student_progress',
            entityLabel: 'Bulk Update',
            pagePath: '/monitoring',
            metadata: { count: updates.length }
        });
    }
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

    const classMasterIds = await getClassMasterIds(classId);
    if (classMasterIds.length === 0) return [];

    const activeYear = await getActiveAcademicYear();
    if (!activeYear) return [];

    const { data: targetRows, error: targetError } = await supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', activeYear.id)
        .eq('semester', semester);

    if (targetError) throw new Error(targetError.message);
    if (!targetRows || targetRows.length === 0) return [];

    const itemIds = Array.from(new Set(targetRows.map((r: any) => r.material_item_id)));

    const { data, error } = await supabase
        .from('material_items')
        .select(`
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
        `)
        .in('id', itemIds);

    if (error) throw new Error(error.message);
    return data || [];
}

export async function getMaterialsByCategory(
    categoryId: string,
    classId: string,
    semester: number
): Promise<any[]> {
    const supabase = await createAdminClient();

    const classMasterIds = await getClassMasterIds(classId);
    if (classMasterIds.length === 0) return [];

    const activeYear = await getActiveAcademicYear();
    if (!activeYear) return [];

    const { data: targetRows, error: targetError } = await supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', activeYear.id)
        .eq('semester', semester);

    if (targetError) throw new Error(targetError.message);
    if (!targetRows || targetRows.length === 0) return [];

    const itemIds = Array.from(new Set(targetRows.map((r: any) => r.material_item_id)));

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
            )
        `)
        .in('id', itemIds)
        .eq('material_type.material_category_id', categoryId);

    if (error) throw new Error(error.message);
    return Array.from(new Map((data || []).map((m: any) => [m.id, m])).values());
}

/**
 * Get monthly target progress for a specific student
 * Returns target materials for the month + their progress + completion percentage
 */
export async function getMonthlyTargetProgress(params: {
  classId: string
  academicYearId: string
  semester: number
  month: number
  studentId: string
}): Promise<{
  targets: any[]
  progress: MaterialProgress[]
  percentage: number
}> {
  const supabase = await createAdminClient()

  // Get class_master_ids for this class
  const classMasterIds = await getClassMasterIds(params.classId)
  if (classMasterIds.length === 0) return { targets: [], progress: [], percentage: 0 }

  // Get monthly targets
  const { data: targets, error: targetsError } = await supabase
    .from('material_monthly_targets')
    .select(`
      *,
      material_item:material_items(
        id, name,
        material_type:material_types(id, name)
      )
    `)
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)
    .eq('month', params.month)
    .order('display_order', { ascending: true })

  if (targetsError) throw new Error(targetsError.message)
  if (!targets || targets.length === 0) return { targets: [], progress: [], percentage: 0 }

  // Get progress for student on these target items
  const targetItemIds = targets.map((t: any) => t.material_item_id)

  const { data: progress } = await supabase
    .from('student_material_progress')
    .select('*')
    .eq('student_id', params.studentId)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)
    .in('material_item_id', targetItemIds)

  const passingScore = 70
  const progressMap = new Map((progress || []).map((p: MaterialProgress) => [p.material_item_id, p]))
  const completed = targetItemIds.filter((itemId: string) => {
    const p = progressMap.get(itemId)
    if (!p) return false
    const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0)
    return score >= passingScore
  }).length

  const percentage = targets.length > 0 ? Math.round((completed / targets.length) * 100) : 0

  return {
    targets: targets || [],
    progress: (progress || []) as MaterialProgress[],
    percentage
  }
}

/**
 * Get cross-class history: materi belum selesai dari tahun ajaran sebelumnya
 * "Belum selesai" = nilai IS NULL AND hafal = false, OR nilai < passing_score
 */
export async function getCrossClassHistory(
  studentId: string,
  currentAcademicYearId: string
): Promise<any[]> {
  const supabase = await createAdminClient()
  const passingScore = 70

  // Get all progress for this student EXCLUDING current academic year
  const { data: allProgress, error } = await supabase
    .from('student_material_progress')
    .select(`
      *,
      material_item:material_items(
        id, name,
        material_type:material_types(id, name)
      )
    `)
    .eq('student_id', studentId)
    .neq('academic_year_id', currentAcademicYearId)

  if (error) throw new Error(error.message)
  if (!allProgress || allProgress.length === 0) return []

  // Get academic year names
  const academicYearIds = [...new Set(allProgress.map((p: any) => p.academic_year_id))]
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name')
    .in('id', academicYearIds)

  const yearMap = new Map((academicYears || []).map((y: any) => [y.id, y.name]))

  // Filter: only incomplete (null/false AND below passing score)
  const incomplete = allProgress.filter((p: any) => {
    const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0)
    return (!p.hafal && p.nilai === null) || score < passingScore
  })

  return incomplete.map((p: any) => ({
    progress: p,
    material_item: p.material_item,
    academic_year_name: yearMap.get(p.academic_year_id) || p.academic_year_id,
    academic_year_id: p.academic_year_id,
    semester: p.semester,
    class_master_id: '',
    class_master_name: '' // populate from class_master_mappings jika dibutuhkan
  }))
}

/**
 * Get class monthly target summary — semua siswa di kelas, berapa % target bulan ini selesai
 */
export async function getClassMonthlyTargetSummary(params: {
  classId: string
  academicYearId: string
  semester: number
  month: number
}): Promise<Array<{ student_id: string; student_name: string; percentage: number }>> {
  const supabase = await createAdminClient()

  // Get enrolled students
  const { data: enrollments } = await supabase
    .from('student_enrollments')
    .select('student_id, students!inner(id, name)')
    .eq('class_id', params.classId)
    .eq('academic_year_id', params.academicYearId)
    .eq('status', 'active')

  if (!enrollments || enrollments.length === 0) return []

  // Get class_master_ids
  const classMasterIds = await getClassMasterIds(params.classId)
  if (classMasterIds.length === 0) return []

  // Get targets for this month
  const { data: targets } = await supabase
    .from('material_monthly_targets')
    .select('material_item_id')
    .in('class_master_id', classMasterIds)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)
    .eq('month', params.month)

  if (!targets || targets.length === 0) return []

  const targetItemIds = targets.map((t: any) => t.material_item_id)
  const studentIds = enrollments.map((e: any) => e.student_id)
  const passingScore = 70

  // Get all progress for these students + target items
  const { data: progress } = await supabase
    .from('student_material_progress')
    .select('student_id, material_item_id, nilai, hafal')
    .in('student_id', studentIds)
    .in('material_item_id', targetItemIds)
    .eq('academic_year_id', params.academicYearId)
    .eq('semester', params.semester)

  // Build summary per student
  return enrollments.map((e: any) => {
    const student = e.students
    const studentProgress = (progress || []).filter((p: any) => p.student_id === student.id)
    const progressMap = new Map(studentProgress.map((p: any) => [p.material_item_id, p]))

    const completed = targetItemIds.filter((itemId: string) => {
      const p = progressMap.get(itemId)
      if (!p) return false
      const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.hafal ? 100 : 0)
      return score >= passingScore
    }).length

    const percentage = Math.round((completed / targetItemIds.length) * 100)

    return {
      student_id: student.id,
      student_name: student.name,
      percentage
    }
  })
}
