/**
 * Rapot Business Logic - Pure Functions
 * NO 'use server' directive
 */

import type {
  GradeInput,
  CharacterAssessmentInput,
  ReportTemplateInput,
  StudentGrade,
  StudentCharacterAssessment
} from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// LAYER 2: BUSINESS LOGIC (Pure Functions)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculates grade letter from numeric score
 * @param score - Numeric score (0-100)
 * @returns Grade letter (A, B+, B, C, D, E)
 */
export function calculateGradeFromScore(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B+'
  if (score >= 70) return 'B'
  if (score >= 60) return 'C'
  if (score >= 50) return 'D'
  return 'E'
}

/**
 * Validates grade input data
 */
export function validateGradeInput(data: GradeInput): {
  ok: boolean
  error?: string
} {
  if (!data.student_id) {
    return { ok: false, error: 'Student ID is required' }
  }

  if (!data.subject_id) {
    return { ok: false, error: 'Subject ID is required' }
  }

  if (!data.academic_year_id) {
    return { ok: false, error: 'Academic Year ID is required' }
  }

  if (!data.semester || (data.semester !== 1 && data.semester !== 2)) {
    return { ok: false, error: 'Semester must be 1 or 2' }
  }

  if (data.score !== undefined && (data.score < 0 || data.score > 100)) {
    return { ok: false, error: 'Score must be between 0 and 100' }
  }

  return { ok: true }
}

/**
 * Validates character assessment input
 */
export function validateCharacterAssessmentInput(data: CharacterAssessmentInput): {
  ok: boolean
  error?: string
} {
  if (!data.student_id) {
    return { ok: false, error: 'Student ID is required' }
  }

  if (!data.academic_year_id) {
    return { ok: false, error: 'Academic Year ID is required' }
  }

  if (!data.semester || (data.semester !== 1 && data.semester !== 2)) {
    return { ok: false, error: 'Semester must be 1 or 2' }
  }

  if (!data.character_aspect) {
    return { ok: false, error: 'Character aspect is required' }
  }

  return { ok: true }
}

/**
 * Validates report template input
 */
export function validateReportTemplateInput(data: ReportTemplateInput): {
  ok: boolean
  error?: string
} {
  if (!data.name || data.name.trim().length === 0) {
    return { ok: false, error: 'Template name is required' }
  }

  if (data.name.length > 200) {
    return { ok: false, error: 'Template name is too long (max 200 characters)' }
  }

  return { ok: true }
}

/**
 * Calculates average score from grades
 * @param grades - Array of grades with scores
 * @returns Average score rounded to 2 decimal places, or 0 if no valid grades
 */
export function calculateAverageScore(
  grades: Array<{ score: number | null | undefined }>
): number {
  if (!grades || grades.length === 0) {
    return 0
  }

  const validScores = grades
    .map(g => g.score)
    .filter((score): score is number => typeof score === 'number' && !isNaN(score))

  if (validScores.length === 0) {
    return 0
  }

  const total = validScores.reduce((sum, score) => sum + score, 0)
  const average = total / validScores.length

  return parseFloat(average.toFixed(2))
}

/**
 * Prepares grade data for database upsert
 * Auto-calculates grade letter if not provided
 */
export function prepareGradeData(
  input: GradeInput,
  timestamp: string
): {
  student_id: string
  subject_id: string
  academic_year_id: string
  semester: number
  score?: number
  grade?: string
  description?: string
  updated_at: string
} {
  let gradeLetter = input.grade

  // Auto calculate grade letter if not provided but score is available
  if (!gradeLetter && input.score !== undefined) {
    gradeLetter = calculateGradeFromScore(input.score)
  }

  return {
    student_id: input.student_id,
    subject_id: input.subject_id,
    academic_year_id: input.academic_year_id,
    semester: input.semester,
    score: input.score,
    grade: gradeLetter,
    description: input.description,
    updated_at: timestamp
  }
}

/**
 * Prepares multiple grade data for bulk upsert
 */
export function prepareMultipleGradeData(
  inputs: GradeInput[],
  timestamp: string
): Array<{
  student_id: string
  subject_id: string
  academic_year_id: string
  semester: number
  score?: number
  grade?: string
  description?: string
  updated_at: string
}> {
  return inputs.map(input => prepareGradeData(input, timestamp))
}

/**
 * Prepares character assessment data for database upsert
 */
export function prepareCharacterAssessmentData(
  input: CharacterAssessmentInput,
  timestamp: string
): {
  student_id: string
  academic_year_id: string
  semester: number
  character_aspect: string
  grade?: string
  description?: string
  updated_at: string
} {
  return {
    student_id: input.student_id,
    academic_year_id: input.academic_year_id,
    semester: input.semester,
    character_aspect: input.character_aspect,
    grade: input.grade,
    description: input.description,
    updated_at: timestamp
  }
}

/**
 * Prepares report template data for database insert
 */
export function prepareReportTemplateData(input: ReportTemplateInput): {
  name: string
  class_id: string | null
  academic_year_id: string | null
  is_active: boolean
} {
  return {
    name: input.name,
    class_id: input.class_id || null,
    academic_year_id: input.academic_year_id || null,
    is_active: input.is_active ?? true
  }
}

/**
 * Prepares report template update data
 */
export function prepareReportTemplateUpdateData(
  input: ReportTemplateInput,
  timestamp: string
): {
  name: string
  class_id: string | null
  academic_year_id: string | null
  is_active?: boolean
  updated_at: string
} {
  return {
    name: input.name,
    class_id: input.class_id || null,
    academic_year_id: input.academic_year_id || null,
    is_active: input.is_active,
    updated_at: timestamp
  }
}

/**
 * Prepares template subjects data from subject IDs
 */
export function prepareTemplateSubjects(
  templateId: string,
  subjectIds: string[]
): Array<{
  template_id: string
  subject_id: string
  display_order: number
  is_required: boolean
}> {
  return subjectIds.map((subjectId, index) => ({
    template_id: templateId,
    subject_id: subjectId,
    display_order: index + 1,
    is_required: true
  }))
}

/**
 * Flattens template subjects response to extract subject objects
 */
export function flattenTemplateSubjects(
  data: Array<{ subject: any }> | null
): any[] {
  if (!data) return []
  return data.map(item => item.subject)
}

/**
 * Builds a report map by student ID
 */
export function buildReportMap(
  reports: Array<{ student_id: string; [key: string]: any }> | null
): Map<string, any> {
  if (!reports) return new Map()
  return new Map(reports.map(r => [r.student_id, r]))
}

/**
 * Groups grades by student ID
 */
export function groupGradesByStudent(
  grades: Array<{ student_id: string; [key: string]: any }> | null
): Record<string, any[]> {
  if (!grades) return {}

  const grouped: Record<string, any[]> = {}
  grades.forEach(grade => {
    if (!grouped[grade.student_id]) {
      grouped[grade.student_id] = []
    }
    grouped[grade.student_id].push(grade)
  })

  return grouped
}

/**
 * Groups character assessments by student ID
 */
export function groupAssessmentsByStudent(
  assessments: Array<{ student_id: string; [key: string]: any }> | null
): Record<string, any[]> {
  if (!assessments) return {}

  const grouped: Record<string, any[]> = {}
  assessments.forEach(assessment => {
    if (!grouped[assessment.student_id]) {
      grouped[assessment.student_id] = []
    }
    grouped[assessment.student_id].push(assessment)
  })

  return grouped
}

/**
 * Filters valid enrollments (students not null)
 */
export function filterValidEnrollments<T extends { student?: any }>(
  enrollments: T[]
): T[] {
  return enrollments.filter(e => e.student !== null && e.student !== undefined)
}

/**
 * Extracts student IDs from enrollments
 */
export function extractStudentIds<T extends { student?: any }>(
  enrollments: T[]
): string[] {
  return enrollments
    .map(e => (e.student as any)?.id)
    .filter(id => id !== null && id !== undefined)
}

/**
 * Builds class reports summary from enrollments and reports
 */
export function buildClassReportsSummary<T extends { student?: any }>(
  enrollments: T[],
  reportMap: Map<string, any>
): Array<{
  student: any
  reportId?: string
  isGenerated: boolean
  isPublished: boolean
  generatedAt?: string
  averageScore?: number
}> {
  return enrollments.map(enrollment => {
    const student = enrollment.student
    const report = reportMap.get(student.id)

    return {
      student: student,
      reportId: report?.id,
      isGenerated: !!report,
      isPublished: report?.is_published || false,
      generatedAt: report?.generated_at,
      averageScore: report?.average_score
    }
  })
}

/**
 * Builds bulk class reports with grades and assessments
 */
export function buildBulkClassReports<T extends { student?: any; class?: any }>(
  enrollments: T[],
  gradesMap: Record<string, any[]>,
  assessmentsMap: Record<string, any[]>,
  reportsMap: Map<string, any>
): Array<{
  student: any
  class: any
  grades: any[]
  character_assessments: any[]
  sick_days: number
  permission_days: number
  absent_days: number
  teacher_notes: string
}> {
  return enrollments.map(enrollment => {
    const student = enrollment.student
    const report = reportsMap.get(student?.id)

    return {
      student: student,
      class: enrollment.class,
      grades: gradesMap[student.id] || [],
      character_assessments: assessmentsMap[student.id] || [],
      sick_days: report?.sick_days || 0,
      permission_days: report?.permission_days || 0,
      absent_days: report?.absent_days || 0,
      teacher_notes: report?.teacher_notes || ''
    }
  })
}

/**
 * Prepares section grades for bulk upsert
 */
export function prepareSectionGrades(data: {
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
}): Array<{
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
}> {
  return data.grades.map(g => ({
    student_id: data.student_id,
    template_id: data.template_id,
    section_id: g.section_id,
    section_item_id: g.section_item_id,
    material_item_id: g.material_item_id,
    academic_year_id: data.academic_year_id,
    semester: data.semester,
    score: g.score,
    grade: g.grade,
    is_memorized: g.is_memorized,
    description: g.description,
  }))
}

/**
 * Prepares student report data for upsert
 */
export function prepareStudentReportData(
  studentId: string,
  academicYearId: string,
  semester: number,
  classId: string,
  averageScore: number,
  timestamp: string
): {
  student_id: string
  academic_year_id: string
  semester: number
  class_id: string
  average_score: number
  generated_at: string
  updated_at: string
} {
  return {
    student_id: studentId,
    academic_year_id: academicYearId,
    semester: semester,
    class_id: classId,
    average_score: parseFloat(averageScore.toFixed(2)),
    generated_at: timestamp,
    updated_at: timestamp
  }
}
