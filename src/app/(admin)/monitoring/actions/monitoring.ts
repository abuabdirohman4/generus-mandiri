'use server';

import { createAdminClient, createAuthClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { handleApiError } from '@/lib/errorUtils';
import { MaterialProgress, ProgressInput } from '../types';
import { logActivity } from '@/lib/activityLogger';
import { getCurrentUserProfile } from '@/lib/accessControlServer';
import { fetchInBatches } from '@/lib/utils/batchFetching';

/**
 * Get hafalan categories (categories with name containing "Hafalan")
 */
export async function getHafalanCategories() {
    try {
        const supabase = await createAdminClient();

        const { data, error } = await supabase
            .from('material_categories')
            .select('id, name')
            .order('name');

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat kategori hafalan');
        return { success: false, message: errorInfo.message, data: [] };
    }
}

export async function getTeacherRestrictions() {
    try {
        const supabase = await createAdminClient();
        const { data: { user } } = await (await createAuthClient()).auth.getUser();
        if (!user) return { success: true, data: null };

        const { data, error } = await supabase
            .from('teacher_class_masters')
            .select('class_master_id')
            .eq('teacher_id', user.id);

        if (error) throw error;

        if (!data || data.length === 0) return { success: true, data: null };
        return { success: true, data: data.map(d => d.class_master_id) };
    } catch (error) {
        console.error('Error fetching teacher restrictions:', error);
        return { success: false, message: 'Gagal memuat pembatasan pengajar', data: null };
    }
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
) {
    try {
        const supabase = await createAdminClient();

        const { data, error } = await supabase
            .from('student_material_progress')
            .select(`
          id, student_id, material_item_id, nilai, done, notes, semester, academic_year_id, teacher_id, created_at, updated_at,
          material_item:material_items(id, name, material_type_id)
        `)
            .eq('student_id', studentId)
            .eq('academic_year_id', academicYearId)
            .eq('semester', semester)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat progress siswa');
        return { success: false, message: errorInfo.message, data: [] };
    }
}

export async function getClassProgress(
    classId: string,
    academicYearId: string,
    semester: number
) {
    try {
        if (!classId || !academicYearId) {
            return { success: false, message: 'ID Kelas dan Tahun Ajaran diperlukan', students: [], progress: [] };
        }

        const supabase = await createAdminClient();

        // Get students in class via student_enrollments
        const { data: enrollments, error: enrollError } = await supabase
            .from('student_enrollments')
            .select(`
          student_id,
          students!inner(id, name, status)
        `)
            .eq('class_id', classId)
            .eq('academic_year_id', academicYearId)
            .eq('status', 'active')
            .eq('students.status', 'active');

        if (enrollError) throw enrollError;

        if (!enrollments || enrollments.length === 0) {
            return {
                success: true,
                students: [],
                progress: []
            };
        }

        // Extract students from enrollments
        const students = enrollments.map((e: any) => e.students).filter(Boolean);
        const studentIds = students.map(s => s.id);

        if (studentIds.length === 0) {
            return {
                success: true,
                students: [],
                progress: []
            };
        }

        // Get all progress for these students — chunked to avoid URL overflow (>100 IDs)
        const progressSelect = 'id, student_id, material_item_id, nilai, done, notes, semester, academic_year_id, teacher_id, created_at, updated_at, material_item:material_items(id, name, material_type_id)'
        const { data: progress, error: progressError } = await fetchInBatches(
            supabase,
            'student_material_progress',
            studentIds,
            progressSelect,
            100,
            'student_id'
        )
        // Apply semester+year filter — fetchInBatches doesn't support additional .eq() filters
        // so we filter in-memory after merge
        const filteredProgress = (progress || []).filter(
            (p: any) => p.academic_year_id === academicYearId && p.semester === semester
        )

        if (progressError) throw progressError;

        return {
            success: true,
            students,
            progress: filteredProgress
        };
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat progress kelas');
        return { success: false, message: errorInfo.message, students: [], progress: [] };
    }
}

export async function updateMaterialProgress(input: ProgressInput) {
    try {
        const supabase = await createAdminClient();
        const { data: { user } } = await (await createAuthClient()).auth.getUser();

        const { error } = await supabase
            .from('student_material_progress')
            .upsert({
                ...input,
                teacher_id: user?.id
            }, {
                onConflict: 'student_id,material_item_id,academic_year_id,semester'
            });

        if (error) throw error;

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

        return { success: true };
    } catch (error) {
        const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal mengupdate progress materi');
        return { success: false, message: errorInfo.message };
    }
}

export async function bulkUpdateProgress(updates: ProgressInput[]) {
    try {
        const supabase = await createAdminClient();
        const { data: { user } } = await (await createAuthClient()).auth.getUser();

        const records = updates.map(update => ({
            ...update,
            teacher_id: user?.id
        }));

        const { error } = await supabase
            .from('student_material_progress')
            .upsert(records, {
                onConflict: 'student_id,material_item_id,academic_year_id,semester'
            });

        if (error) throw error;

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

        return { success: true };
    } catch (error) {
        const errorInfo = handleApiError(error, 'mengupdate data', 'Gagal melakukan bulk update progress');
        return { success: false, message: errorInfo.message };
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
): Promise<{ success: boolean; data: any[]; message?: string }> {
    try {
        const supabase = await createAdminClient();

        const classMasterIds = await getClassMasterIds(classId);
        if (classMasterIds.length === 0) return { success: true, data: [] };


        const { data: targetRows, error: targetError } = await supabase
            .from('material_monthly_targets')
            .select('material_item_id')
            .in('class_master_id', classMasterIds)
            .eq('semester', semester);

        if (targetError) throw targetError;
        if (!targetRows || targetRows.length === 0) return { success: true, data: [] };

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

        if (error) throw error;

        // Flatten nested objects if they come back as arrays (Supabase quirks)
        const formattedData = (data || []).map((item: any) => ({
            ...item,
            material_type: Array.isArray(item.material_type) ? item.material_type[0] : item.material_type,
        })).map((item: any) => {
            if (item.material_type && Array.isArray(item.material_type.material_category)) {
                item.material_type.material_category = item.material_type.material_category[0];
            }
            return item;
        });

        return { success: true, data: formattedData };
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat daftar materi');
        return { success: false, data: [], message: errorInfo.message };
    }
}

export async function getMaterialsByCategory(
    categoryId: string,
    classId: string,
    semester: number
) {
    try {
        const supabase = await createAdminClient();

        const classMasterIds = await getClassMasterIds(classId);
        if (classMasterIds.length === 0) return { success: true, data: [] };


        const { data: targetRows, error: targetError } = await supabase
            .from('material_monthly_targets')
            .select('material_item_id')
            .in('class_master_id', classMasterIds)
            .eq('semester', semester);

        if (targetError) throw targetError;
        if (!targetRows || targetRows.length === 0) return { success: true, data: [] };

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

        if (error) throw error;
        const uniqueMaterials = Array.from(new Map((data || []).map((m: any) => [m.id, m])).values());
        return { success: true, data: uniqueMaterials };
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat materi berdasarkan kategori');
        return { success: false, message: errorInfo.message, data: [] };
    }
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
}) {
  try {
    const supabase = await createAdminClient()

    // Get class_master_ids for this class
    const classMasterIds = await getClassMasterIds(params.classId)
    if (classMasterIds.length === 0) return { success: true, targets: [], progress: [], percentage: 0 }

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
      .eq('semester', params.semester)
      .eq('month', params.month)
      .order('display_order', { ascending: true })

    if (targetsError) throw targetsError

    if (!targets || targets.length === 0) {
      return { success: true, targets: [], progress: [], percentage: 0 }
    }

    // Get progress for student on these target items
    const targetItemIds = targets.map((t: any) => t.material_item_id)

    const { data: progress, error: progressError } = await supabase
      .from('student_material_progress')
      .select('*')
      .eq('student_id', params.studentId)
      .eq('academic_year_id', params.academicYearId)
      .eq('semester', params.semester)
      .in('material_item_id', targetItemIds)

    if (progressError) throw progressError

    const passingScore = 70
    const progressMap = new Map((progress || []).map((p: MaterialProgress) => [p.material_item_id, p]))
    const completed = targetItemIds.filter((itemId: string) => {
      const p = progressMap.get(itemId)
      if (!p) return false
      const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.done ? 100 : 0)
      return score >= passingScore
    }).length

    const percentage = targets.length > 0 ? Math.round((completed / targets.length) * 100) : 0

    return {
      success: true,
      targets: targets || [],
      progress: (progress || []) as MaterialProgress[],
      percentage
    }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat progress target bulanan')
    return { success: false, message: errorInfo.message, targets: [], progress: [], percentage: 0 }
  }
}

/**
 * Get cross-class history: materi belum selesai dari tahun ajaran sebelumnya
 * "Belum selesai" = nilai IS NULL AND done = false, OR nilai < passing_score
 */
export async function getCrossClassHistory(
  studentId: string,
  currentAcademicYearId: string
) {
  try {
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

    if (error) throw error
    if (!allProgress || allProgress.length === 0) return { success: true, data: [] }

    // Get academic year names
    const academicYearIds = [...new Set(allProgress.map((p: any) => p.academic_year_id))]
    const { data: academicYears, error: yearsError } = await supabase
      .from('academic_years')
      .select('id, name')
      .in('id', academicYearIds)

    if (yearsError) throw yearsError

    const yearMap = new Map((academicYears || []).map((y: any) => [y.id, y.name]))

    // Filter: only incomplete (null/false AND below passing score)
    const incomplete = allProgress.filter((p: any) => {
      const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.done ? 100 : 0)
      return (!p.done && p.nilai === null) || score < passingScore
    })

    const result = incomplete.map((p: any) => ({
      progress: p,
      material_item: p.material_item,
      academic_year_name: yearMap.get(p.academic_year_id) || p.academic_year_id,
      academic_year_id: p.academic_year_id,
      semester: p.semester,
      class_master_id: '',
      class_master_name: '' // populate from class_master_mappings jika dibutuhkan
    }))

    return { success: true, data: result }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat riwayat lintas kelas');
    return { success: false, message: errorInfo.message, data: [] }
  }
}

/**
 * Get class monthly target summary — semua siswa di kelas, berapa % target bulan ini selesai
 */
export async function getClassMonthlyTargetSummary(params: {
  classId: string
  academicYearId: string
  semester: number
  month: number
}) {
  try {
    const supabase = await createAdminClient()

    // Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from('student_enrollments')
      .select('student_id, students!inner(id, name, status)')
      .eq('class_id', params.classId)
      .eq('academic_year_id', params.academicYearId)
      .eq('status', 'active')
      .eq('students.status', 'active')

    if (enrollError) throw enrollError

    if (!enrollments || enrollments.length === 0) return { success: true, data: [] }

    // Get class_master_ids
    const classMasterIds = await getClassMasterIds(params.classId)
    if (classMasterIds.length === 0) return { success: true, data: [] }

    // Get targets for this month
    const { data: targets, error: targetsError } = await supabase
      .from('material_monthly_targets')
      .select('material_item_id')
      .in('class_master_id', classMasterIds)
      .eq('semester', params.semester)
      .eq('month', params.month)

    if (targetsError) throw targetsError
    if (!targets || targets.length === 0) return { success: true, data: [] }

    const targetItemIds = targets.map((t: any) => t.material_item_id)
    const studentIds = enrollments.map((e: any) => e.student_id)
    const passingScore = 70

    // Get all progress for these students + target items
    const { data: progress, error: progressError } = await supabase
      .from('student_material_progress')
      .select('student_id, material_item_id, nilai, done')
      .in('student_id', studentIds)
      .in('material_item_id', targetItemIds)
      .eq('academic_year_id', params.academicYearId)
      .eq('semester', params.semester)

    if (progressError) throw progressError

    // Build summary per student
    const result = enrollments.map((e: any) => {
      const student = e.students
      const studentProgress = (progress || []).filter((p: any) => p.student_id === student.id)
      const progressMap = new Map(studentProgress.map((p: any) => [p.material_item_id, p]))

      const completed = targetItemIds.filter((itemId: string) => {
        const p = progressMap.get(itemId)
        if (!p) return false
        const score = p.nilai !== null && p.nilai !== undefined ? p.nilai : (p.done ? 100 : 0)
        return score >= passingScore
      }).length

      const percentage = Math.round((completed / targetItemIds.length) * 100)

      return {
        student_id: student.id,
        student_name: student.name,
        percentage
      }
    })

    return { success: true, data: result }
  } catch (error) {
    const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat ringkasan target bulanan kelas');
    return { success: false, message: errorInfo.message, data: [] }
  }
}
