// NO 'use server' directive - pure query builders
import type { SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 1: DATABASE QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetches student grades with subject details
 */
export async function fetchStudentGrades(
  supabase: SupabaseClient,
  studentId: string,
  academicYearId: string,
  semester: number
) {
  return await supabase
    .from('student_grades')
    .select(`
      *,
      subject:report_subjects(
        id,
        display_name,
        display_order,
        material_type:material_types(
          name,
          category:material_categories(
            id,
            name
          )
        )
      )
    `)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
    .order('display_order', { foreignTable: 'subject' })
}

/**
 * Upserts student section grades in bulk
 */
export async function upsertSectionGrades(
  supabase: SupabaseClient,
  grades: Array<{
    student_id: string
    template_id: string
    section_id: string
    section_item_id: string
    material_item_id: string
    academic_year_id: string
    semester: number
    score?: number
    grade?: string
    is_memorized?: boolean
    description?: string
  }>
) {
  return await supabase
    .from('student_section_grades')
    .upsert(grades, {
      onConflict: 'student_id,section_item_id,material_item_id,academic_year_id,semester',
    })
}

/**
 * Upserts a single student grade
 */
export async function upsertStudentGrade(
  supabase: SupabaseClient,
  data: {
    student_id: string
    subject_id: string
    academic_year_id: string
    semester: number
    score?: number
    grade?: string
    description?: string
    updated_at: string
  }
) {
  return await supabase
    .from('student_grades')
    .upsert(data, {
      onConflict: 'student_id, subject_id, academic_year_id, semester'
    })
}

/**
 * Bulk upserts student grades
 */
export async function bulkUpsertStudentGrades(
  supabase: SupabaseClient,
  grades: Array<{
    student_id: string
    subject_id: string
    academic_year_id: string
    semester: number
    score?: number
    grade?: string
    description?: string
    updated_at: string
  }>
) {
  return await supabase
    .from('student_grades')
    .upsert(grades, {
      onConflict: 'student_id, subject_id, academic_year_id, semester'
    })
}

/**
 * Fetches character assessments for a student
 */
export async function fetchCharacterAssessments(
  supabase: SupabaseClient,
  studentId: string,
  academicYearId: string,
  semester: number
) {
  return await supabase
    .from('student_character_assessments')
    .select('*')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
}

/**
 * Upserts a character assessment
 */
export async function upsertCharacterAssessment(
  supabase: SupabaseClient,
  data: {
    student_id: string
    academic_year_id: string
    semester: number
    character_aspect: string
    grade?: string
    description?: string
    updated_at: string
  }
) {
  return await supabase
    .from('student_character_assessments')
    .upsert(data, {
      onConflict: 'student_id, academic_year_id, semester, character_aspect'
    })
}

/**
 * Fetches report templates with optional filtering
 */
export async function fetchReportTemplates(
  supabase: SupabaseClient,
  options: {
    classId?: string
    academicYearId?: string
    includeAll?: boolean
  }
) {
  let query = supabase
    .from('report_templates')
    .select(`
      *,
      subjects:report_template_subjects(
        *,
        subject:report_subjects(*)
      ),
      class:classes(id, name),
      academic_year:academic_years(id, name)
    `)
    .eq('is_active', true)

  if (!options.includeAll) {
    // Normal filtering mode (for consumption)
    if (options.classId) {
      query = query.or(`class_id.eq.${options.classId},class_id.is.null`)
    } else {
      query = query.is('class_id', null) // Default global only if no class specified
    }

    if (options.academicYearId) {
      query = query.or(`academic_year_id.eq.${options.academicYearId},academic_year_id.is.null`)
    }
  }
  // If includeAll is true, we skip the filters and return everything (Admin Mode)

  return await query
}

/**
 * Inserts a new report template
 */
export async function insertReportTemplate(
  supabase: SupabaseClient,
  data: {
    name: string
    class_id: string | null
    academic_year_id: string | null
    is_active: boolean
  }
) {
  return await supabase
    .from('report_templates')
    .insert(data)
    .select()
    .single()
}

/**
 * Inserts template subjects
 */
export async function insertTemplateSubjects(
  supabase: SupabaseClient,
  subjects: Array<{
    template_id: string
    subject_id: string
    display_order: number
    is_required: boolean
  }>
) {
  return await supabase
    .from('report_template_subjects')
    .insert(subjects)
}

/**
 * Updates a report template
 */
export async function updateReportTemplateRecord(
  supabase: SupabaseClient,
  id: string,
  data: {
    name: string
    class_id: string | null
    academic_year_id: string | null
    is_active?: boolean
    updated_at: string
  }
) {
  return await supabase
    .from('report_templates')
    .update(data)
    .eq('id', id)
}

/**
 * Deletes template subjects by template ID
 */
export async function deleteTemplateSubjects(
  supabase: SupabaseClient,
  templateId: string
) {
  return await supabase
    .from('report_template_subjects')
    .delete()
    .eq('template_id', templateId)
}

/**
 * Fetches template subjects with subject details
 */
export async function fetchTemplateSubjects(
  supabase: SupabaseClient,
  templateId: string
) {
  return await supabase
    .from('report_template_subjects')
    .select(`
      subject:report_subjects(*)
    `)
    .eq('template_id', templateId)
    .order('display_order')
}

/**
 * Fetches a single student report
 */
export async function fetchStudentReport(
  supabase: SupabaseClient,
  studentId: string,
  academicYearId: string,
  semester: number
) {
  return await supabase
    .from('student_reports')
    .select(`
      *,
      student:students(*),
      class:classes(id, name),
      academic_year:academic_years(id, name)
    `)
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
    .single()
}

/**
 * Fetches grades for average calculation
 */
export async function fetchGradesForAverage(
  supabase: SupabaseClient,
  studentId: string,
  academicYearId: string,
  semester: number
) {
  return await supabase
    .from('student_grades')
    .select('score')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
}

/**
 * Fetches student enrollment for report generation
 */
export async function fetchStudentEnrollment(
  supabase: SupabaseClient,
  studentId: string,
  academicYearId: string,
  semester: number
) {
  return await supabase
    .from('student_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
    .single()
}

/**
 * Upserts a student report
 */
export async function upsertStudentReport(
  supabase: SupabaseClient,
  data: {
    student_id: string
    academic_year_id: string
    semester: number
    class_id: string
    average_score: number
    generated_at: string
    updated_at: string
  }
) {
  return await supabase
    .from('student_reports')
    .upsert(data, {
      onConflict: 'student_id, academic_year_id, semester'
    })
    .select()
    .single()
}

/**
 * Updates report publish status
 */
export async function updateReportPublishStatus(
  supabase: SupabaseClient,
  reportId: string,
  isPublished: boolean
) {
  return await supabase
    .from('student_reports')
    .update({ is_published: isPublished })
    .eq('id', reportId)
}

/**
 * Fetches student reports for a class
 */
export async function fetchClassReports(
  supabase: SupabaseClient,
  studentIds: string[],
  academicYearId: string,
  semester: number
) {
  return await supabase
    .from('student_reports')
    .select('id, student_id, is_published, generated_at, average_score')
    .in('student_id', studentIds)
    .eq('academic_year_id', academicYearId)
    .eq('semester', semester)
}

/**
 * Fetches bulk data for class reports
 */
export async function fetchBulkClassData(
  supabase: SupabaseClient,
  studentIds: string[],
  academicYearId: string,
  semester: number
) {
  return await Promise.all([
    // Grades
    supabase
      .from('student_grades')
      .select(`
        *,
        subject:report_subjects(
          id,
          display_name,
          display_order,
          material_type:material_types(
            name,
            category:material_categories(
              id,
              name
            )
          )
        )
      `)
      .in('student_id', studentIds)
      .eq('academic_year_id', academicYearId)
      .eq('semester', semester),

    // Character Assessments
    supabase
      .from('student_character_assessments')
      .select('*')
      .in('student_id', studentIds)
      .eq('academic_year_id', academicYearId)
      .eq('semester', semester),

    // Reports
    supabase
      .from('student_reports')
      .select('*')
      .in('student_id', studentIds)
      .eq('academic_year_id', academicYearId)
      .eq('semester', semester)
  ])
}
