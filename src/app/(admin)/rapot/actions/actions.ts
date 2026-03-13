'use server'

import { getClassEnrollments } from '@/app/(admin)/tahun-ajaran/actions/enrollments'
import { createAdminClient } from '@/lib/supabase/server'
import type {
  ReportSubject,
  ReportTemplate,
  StudentGrade,
  StudentCharacterAssessment,
  StudentReport,
  GradeInput,
  CharacterAssessmentInput,
  ReportTemplateInput
} from '../types'

// Import Layer 1 (queries)
import {
  fetchStudentGrades,
  fetchCharacterAssessments,
  fetchReportTemplates,
  fetchTemplateSubjects,
  fetchStudentReport,
  fetchGradesForAverage,
  fetchStudentEnrollment,
  fetchClassReports,
  fetchBulkClassData,
  upsertStudentGrade,
  bulkUpsertStudentGrades,
  upsertCharacterAssessment,
  insertReportTemplate,
  insertTemplateSubjects,
  updateReportTemplateRecord,
  deleteTemplateSubjects,
  upsertStudentReport,
  updateReportPublishStatus,
  upsertSectionGrades
} from './queries'

// Import Layer 2 (logic)
import {
  calculateGradeFromScore,
  validateGradeInput,
  validateCharacterAssessmentInput,
  validateReportTemplateInput,
  calculateAverageScore,
  prepareGradeData,
  prepareMultipleGradeData,
  prepareCharacterAssessmentData,
  prepareReportTemplateData,
  prepareReportTemplateUpdateData,
  prepareTemplateSubjects,
  flattenTemplateSubjects,
  buildReportMap,
  groupGradesByStudent,
  groupAssessmentsByStudent,
  filterValidEnrollments,
  extractStudentIds,
  buildClassReportsSummary,
  buildBulkClassReports,
  prepareSectionGrades,
  prepareStudentReportData
} from './logic'

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 3: SERVER ACTIONS (Orchestration)
// ─────────────────────────────────────────────────────────────────────────────

// ==========================================
// GRADING HELPERS
// ==========================================

/**
 * Calculates grade letter from numeric score
 * @deprecated Use the pure function from logic.ts in client components
 */
export async function calculateGradeFromScoreAction(score: number): Promise<string> {
  return calculateGradeFromScore(score)
}

// ==========================================
// STUDENT GRADES
// ==========================================

export async function getStudentGrades(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<StudentGrade[]> {
  const supabase = await createAdminClient()

  const { data, error } = await fetchStudentGrades(
    supabase,
    studentId,
    academicYearId,
    semester
  )

  if (error) {
    console.error('Error fetching student grades:', error)
    throw new Error('Gagal mengambil nilai siswa')
  }

  return data || []
}

export async function bulkUpsertSectionGrades(data: {
  student_id: string
  template_id: string
  academic_year_id: string
  semester: 1 | 2
  grades: Array<{
    section_id: string
    section_item_id: string
    material_item_id: string
    score?: number
    grade?: string
    is_memorized?: boolean
    description?: string
  }>
}) {
  const supabase = await createAdminClient()

  // Prepare grades using business logic
  const preparedGrades = prepareSectionGrades(data)

  // Upsert all grades
  const { error } = await upsertSectionGrades(supabase, preparedGrades)

  if (error) throw error

  return { success: true }
}

export async function updateGrade(data: GradeInput): Promise<void> {
  // Validate input
  const validation = validateGradeInput(data)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const supabase = await createAdminClient()
  const timestamp = new Date().toISOString()

  // Prepare grade data (auto-calculates grade letter if needed)
  const gradeData = prepareGradeData(data, timestamp)

  const { error } = await upsertStudentGrade(supabase, gradeData)

  if (error) {
    console.error('Error updating grade:', error)
    throw new Error('Gagal menyimpan nilai')
  }
}

export async function bulkUpdateGrades(updates: GradeInput[]): Promise<void> {
  // Validate all inputs
  for (const update of updates) {
    const validation = validateGradeInput(update)
    if (!validation.ok) {
      throw new Error(validation.error)
    }
  }

  const supabase = await createAdminClient()
  const timestamp = new Date().toISOString()

  // Prepare all grade data
  const processedUpdates = prepareMultipleGradeData(updates, timestamp)

  const { error } = await bulkUpsertStudentGrades(supabase, processedUpdates)

  if (error) {
    console.error('Error bulk updating grades:', error)
    throw new Error('Gagal menyimpan update nilai masal')
  }
}

// ==========================================
// CHARACTER ASSESSMENTS
// ==========================================

export async function getCharacterAssessments(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<StudentCharacterAssessment[]> {
  const supabase = await createAdminClient()

  const { data, error } = await fetchCharacterAssessments(
    supabase,
    studentId,
    academicYearId,
    semester
  )

  if (error) {
    console.error('Error fetching character assessments:', error)
    throw new Error('Gagal mengambil penilaian karakter')
  }

  return data || []
}

export async function updateCharacterAssessment(data: CharacterAssessmentInput): Promise<void> {
  // Validate input
  const validation = validateCharacterAssessmentInput(data)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const supabase = await createAdminClient()
  const timestamp = new Date().toISOString()

  // Prepare assessment data
  const assessmentData = prepareCharacterAssessmentData(data, timestamp)

  const { error } = await upsertCharacterAssessment(supabase, assessmentData)

  if (error) {
    console.error('Error updating character assessment:', error)
    throw new Error('Gagal menyimpan penilaian karakter')
  }
}

// ==========================================
// REPORT TEMPLATES
// ==========================================

export async function getReportTemplates(
  classId?: string,
  academicYearId?: string,
  includeAll: boolean = false
): Promise<ReportTemplate[]> {
  const supabase = await createAdminClient()

  const { data, error } = await fetchReportTemplates(supabase, {
    classId,
    academicYearId,
    includeAll
  })

  console.log('getReportTemplates result:', {
    dataLength: data?.length,
    error,
    classId,
    academicYearId
  })

  if (error) {
    console.error('Error fetching report templates:', error)
    throw new Error('Gagal mengambil template rapot')
  }

  return data || []
}

export async function createReportTemplate(data: ReportTemplateInput): Promise<ReportTemplate> {
  // Validate input
  const validation = validateReportTemplateInput(data)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const supabase = await createAdminClient()

  // Prepare template data
  const templateData = prepareReportTemplateData(data)

  // 1. Create Template
  const { data: template, error } = await insertReportTemplate(supabase, templateData)

  if (error) {
    console.error('Error creating report template:', error)
    throw new Error('Gagal membuat template rapot')
  }

  // 2. Add Subjects if provided
  if (data.subject_ids && data.subject_ids.length > 0) {
    const templateSubjects = prepareTemplateSubjects(template.id, data.subject_ids)

    const { error: subjectError } = await insertTemplateSubjects(supabase, templateSubjects)

    if (subjectError) {
      console.error('Error adding subjects to template:', subjectError)
      // Non-fatal, return template
    }
  }

  return template
}

export async function updateReportTemplate(id: string, data: ReportTemplateInput): Promise<void> {
  // Validate input
  const validation = validateReportTemplateInput(data)
  if (!validation.ok) {
    throw new Error(validation.error)
  }

  const supabase = await createAdminClient()
  const timestamp = new Date().toISOString()

  // Prepare update data
  const updateData = prepareReportTemplateUpdateData(data, timestamp)

  const { error } = await updateReportTemplateRecord(supabase, id, updateData)

  if (error) {
    throw new Error('Gagal update template rapot')
  }

  // If subject_ids provided, replace existing subjects
  if (data.subject_ids) {
    await updateTemplateSubjects(id, data.subject_ids)
  }
}

export async function updateTemplateSubjects(templateId: string, subjectIds: string[]): Promise<void> {
  const supabase = await createAdminClient()

  // 1. Delete existing
  await deleteTemplateSubjects(supabase, templateId)

  // 2. Insert new
  if (subjectIds.length > 0) {
    const templateSubjects = prepareTemplateSubjects(templateId, subjectIds)

    const { error } = await insertTemplateSubjects(supabase, templateSubjects)

    if (error) {
      throw new Error('Gagal update mata pelajaran template')
    }
  }
}

export async function getTemplateSubjects(templateId: string): Promise<ReportSubject[]> {
  const supabase = await createAdminClient()

  const { data, error } = await fetchTemplateSubjects(supabase, templateId)

  if (error) {
    console.error('Error fetching template subjects:', error)
    throw new Error('Gagal mengambil mata pelajaran template')
  }

  // Flatten structure using business logic
  return flattenTemplateSubjects(data)
}

// ==========================================
// REPORTS GENERATION
// ==========================================

export async function getStudentReport(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<StudentReport | null> {
  const supabase = await createAdminClient()

  const { data, error } = await fetchStudentReport(
    supabase,
    studentId,
    academicYearId,
    semester
  )

  if (error && error.code !== 'PGRST116') {
    // Ignore not found error
    console.error('Error fetching student report:', error)
    throw new Error('Gagal mengambil data rapot')
  }

  return data || null
}

export async function generateReport(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<StudentReport> {
  const supabase = await createAdminClient()
  const timestamp = new Date().toISOString()

  // 1. Calculate Average Score from Grades
  const { data: grades } = await fetchGradesForAverage(
    supabase,
    studentId,
    academicYearId,
    semester
  )

  const averageScore = calculateAverageScore(grades || [])

  // 2. Determine Class ID (from enrollment)
  const { data: enrollment } = await fetchStudentEnrollment(
    supabase,
    studentId,
    academicYearId,
    semester
  )

  if (!enrollment) {
    throw new Error('Siswa tidak terdaftar pada tahun ajaran/semester ini')
  }

  // 3. Prepare and upsert report
  const reportData = prepareStudentReportData(
    studentId,
    academicYearId,
    semester,
    enrollment.class_id,
    averageScore,
    timestamp
  )

  const { data: report, error } = await upsertStudentReport(supabase, reportData)

  if (error) {
    console.error('Error generating report:', error)
    throw new Error('Gagal regenerate rapot')
  }

  return report
}

export async function publishReport(reportId: string): Promise<void> {
  const supabase = await createAdminClient()

  const { error } = await updateReportPublishStatus(supabase, reportId, true)

  if (error) {
    throw new Error('Gagal publish rapot')
  }
}

export async function getClassReportsSummary(
  classId: string,
  academicYearId: string,
  semester: number
) {
  const supabase = await createAdminClient()

  // Get enrollments first to know who SHOULD have reports
  console.log('getClassReportsSummary Params:', { classId, academicYearId, semester })

  const enrollments = await getClassEnrollments(classId, academicYearId, semester)

  console.log('Enrollments found:', enrollments?.length)

  if (!enrollments || enrollments.length === 0) return []

  // Filter out enrollments with null students (data integrity issue)
  const validEnrollments = filterValidEnrollments(enrollments)

  if (validEnrollments.length === 0) {
    console.warn('No valid enrollments found - all students are null')
    return []
  }

  // Get existing reports - with defensive mapping
  const studentIds = extractStudentIds(validEnrollments)

  if (studentIds.length === 0) {
    console.warn('No valid student IDs extracted from enrollments')
    return []
  }

  const { data: reports } = await fetchClassReports(
    supabase,
    studentIds,
    academicYearId,
    semester
  )

  // Merge data using business logic
  const reportMap = buildReportMap(reports)
  return buildClassReportsSummary(validEnrollments, reportMap)
}

export async function getClassReportsBulk(
  classId: string,
  academicYearId: string,
  semester: number
) {
  const supabase = await createAdminClient()

  // 1. Get Enrollments (Students)
  const enrollments = await getClassEnrollments(classId, academicYearId, semester)
  if (!enrollments || enrollments.length === 0) return []

  // Filter valid enrollments and extract student IDs
  const validEnrollments = filterValidEnrollments(enrollments)
  if (validEnrollments.length === 0) return []

  const studentIds = extractStudentIds(validEnrollments)

  // 2. Fetch All Data in Parallel
  const [gradesData, assessmentsData, reportsData] = await fetchBulkClassData(
    supabase,
    studentIds,
    academicYearId,
    semester
  )

  // 3. Map Data by Student ID using business logic
  const gradesMap = groupGradesByStudent(gradesData.data)
  const assessmentsMap = groupAssessmentsByStudent(assessmentsData.data)
  const reportsMap = buildReportMap(reportsData.data)

  // 4. Transform to Full Object using business logic
  return buildBulkClassReports(validEnrollments, gradesMap, assessmentsMap, reportsMap)
}
