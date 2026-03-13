import { describe, it, expect } from 'vitest'
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
} from '../logic'
import type { GradeInput, CharacterAssessmentInput, ReportTemplateInput } from '../../types'

describe('Rapot Business Logic - Layer 2', () => {
  describe('calculateGradeFromScore', () => {
    it('should return A for score >= 90', () => {
      expect(calculateGradeFromScore(90)).toBe('A')
      expect(calculateGradeFromScore(95)).toBe('A')
      expect(calculateGradeFromScore(100)).toBe('A')
    })

    it('should return B+ for score 80-89', () => {
      expect(calculateGradeFromScore(80)).toBe('B+')
      expect(calculateGradeFromScore(85)).toBe('B+')
      expect(calculateGradeFromScore(89)).toBe('B+')
    })

    it('should return B for score 70-79', () => {
      expect(calculateGradeFromScore(70)).toBe('B')
      expect(calculateGradeFromScore(75)).toBe('B')
      expect(calculateGradeFromScore(79)).toBe('B')
    })

    it('should return C for score 60-69', () => {
      expect(calculateGradeFromScore(60)).toBe('C')
      expect(calculateGradeFromScore(65)).toBe('C')
      expect(calculateGradeFromScore(69)).toBe('C')
    })

    it('should return D for score 50-59', () => {
      expect(calculateGradeFromScore(50)).toBe('D')
      expect(calculateGradeFromScore(55)).toBe('D')
      expect(calculateGradeFromScore(59)).toBe('D')
    })

    it('should return E for score < 50', () => {
      expect(calculateGradeFromScore(0)).toBe('E')
      expect(calculateGradeFromScore(25)).toBe('E')
      expect(calculateGradeFromScore(49)).toBe('E')
    })
  })

  describe('validateGradeInput', () => {
    const validGrade: GradeInput = {
      student_id: 'student-1',
      subject_id: 'subject-1',
      academic_year_id: 'year-1',
      semester: 1,
      score: 85
    }

    it('should return ok for valid input', () => {
      const result = validateGradeInput(validGrade)
      expect(result.ok).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject missing student_id', () => {
      const result = validateGradeInput({ ...validGrade, student_id: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Student ID')
    })

    it('should reject missing subject_id', () => {
      const result = validateGradeInput({ ...validGrade, subject_id: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Subject ID')
    })

    it('should reject missing academic_year_id', () => {
      const result = validateGradeInput({ ...validGrade, academic_year_id: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Academic Year ID')
    })

    it('should reject invalid semester (not 1 or 2)', () => {
      const result = validateGradeInput({ ...validGrade, semester: 3 as any })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Semester must be 1 or 2')
    })

    it('should reject score < 0', () => {
      const result = validateGradeInput({ ...validGrade, score: -10 })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Score must be between 0 and 100')
    })

    it('should reject score > 100', () => {
      const result = validateGradeInput({ ...validGrade, score: 110 })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Score must be between 0 and 100')
    })

    it('should accept valid edge case scores (0 and 100)', () => {
      expect(validateGradeInput({ ...validGrade, score: 0 }).ok).toBe(true)
      expect(validateGradeInput({ ...validGrade, score: 100 }).ok).toBe(true)
    })

    it('should accept grade without score', () => {
      const result = validateGradeInput({ ...validGrade, score: undefined })
      expect(result.ok).toBe(true)
    })
  })

  describe('validateCharacterAssessmentInput', () => {
    const validAssessment: CharacterAssessmentInput = {
      student_id: 'student-1',
      academic_year_id: 'year-1',
      semester: 1,
      character_aspect: 'discipline'
    }

    it('should return ok for valid input', () => {
      const result = validateCharacterAssessmentInput(validAssessment)
      expect(result.ok).toBe(true)
    })

    it('should reject missing student_id', () => {
      const result = validateCharacterAssessmentInput({ ...validAssessment, student_id: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Student ID')
    })

    it('should reject missing academic_year_id', () => {
      const result = validateCharacterAssessmentInput({ ...validAssessment, academic_year_id: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Academic Year ID')
    })

    it('should reject invalid semester', () => {
      const result = validateCharacterAssessmentInput({ ...validAssessment, semester: 0 as any })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Semester must be 1 or 2')
    })

    it('should reject missing character_aspect', () => {
      const result = validateCharacterAssessmentInput({ ...validAssessment, character_aspect: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Character aspect')
    })
  })

  describe('validateReportTemplateInput', () => {
    const validTemplate: ReportTemplateInput = {
      name: 'Template 1'
    }

    it('should return ok for valid input', () => {
      const result = validateReportTemplateInput(validTemplate)
      expect(result.ok).toBe(true)
    })

    it('should reject empty name', () => {
      const result = validateReportTemplateInput({ name: '' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Template name is required')
    })

    it('should reject whitespace-only name', () => {
      const result = validateReportTemplateInput({ name: '   ' })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('Template name is required')
    })

    it('should reject name exceeding 200 characters', () => {
      const longName = 'x'.repeat(201)
      const result = validateReportTemplateInput({ name: longName })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('too long')
    })

    it('should accept name at max length (200)', () => {
      const maxName = 'x'.repeat(200)
      const result = validateReportTemplateInput({ name: maxName })
      expect(result.ok).toBe(true)
    })
  })

  describe('calculateAverageScore', () => {
    it('should calculate correct average from valid scores', () => {
      const grades = [{ score: 80 }, { score: 90 }, { score: 70 }]
      expect(calculateAverageScore(grades)).toBe(80)
    })

    it('should return 0 for empty array', () => {
      expect(calculateAverageScore([])).toBe(0)
    })

    it('should ignore null scores', () => {
      const grades = [{ score: 80 }, { score: null }, { score: 90 }]
      expect(calculateAverageScore(grades)).toBe(85)
    })

    it('should ignore undefined scores', () => {
      const grades = [{ score: 80 }, { score: undefined }, { score: 90 }]
      expect(calculateAverageScore(grades)).toBe(85)
    })

    it('should return 0 when all scores are null', () => {
      const grades = [{ score: null }, { score: null }]
      expect(calculateAverageScore(grades)).toBe(0)
    })

    it('should round to 2 decimal places', () => {
      const grades = [{ score: 85 }, { score: 87 }, { score: 88 }]
      expect(calculateAverageScore(grades)).toBe(86.67)
    })
  })

  describe('prepareGradeData', () => {
    const timestamp = '2026-03-12T00:00:00Z'

    it('should use provided grade letter', () => {
      const input: GradeInput = {
        student_id: 'student-1',
        subject_id: 'subject-1',
        academic_year_id: 'year-1',
        semester: 1,
        score: 85,
        grade: 'A'
      }

      const result = prepareGradeData(input, timestamp)
      expect(result.grade).toBe('A')
    })

    it('should auto-calculate grade letter when not provided', () => {
      const input: GradeInput = {
        student_id: 'student-1',
        subject_id: 'subject-1',
        academic_year_id: 'year-1',
        semester: 1,
        score: 85
      }

      const result = prepareGradeData(input, timestamp)
      expect(result.grade).toBe('B+')
    })

    it('should not set grade when neither grade nor score provided', () => {
      const input: GradeInput = {
        student_id: 'student-1',
        subject_id: 'subject-1',
        academic_year_id: 'year-1',
        semester: 1
      }

      const result = prepareGradeData(input, timestamp)
      expect(result.grade).toBeUndefined()
    })

    it('should include updated_at timestamp', () => {
      const input: GradeInput = {
        student_id: 'student-1',
        subject_id: 'subject-1',
        academic_year_id: 'year-1',
        semester: 1,
        score: 85
      }

      const result = prepareGradeData(input, timestamp)
      expect(result.updated_at).toBe(timestamp)
    })
  })

  describe('prepareMultipleGradeData', () => {
    it('should prepare multiple grade records', () => {
      const inputs: GradeInput[] = [
        {
          student_id: 'student-1',
          subject_id: 'subject-1',
          academic_year_id: 'year-1',
          semester: 1,
          score: 85
        },
        {
          student_id: 'student-2',
          subject_id: 'subject-1',
          academic_year_id: 'year-1',
          semester: 1,
          score: 95
        }
      ]

      const timestamp = '2026-03-12T00:00:00Z'
      const result = prepareMultipleGradeData(inputs, timestamp)

      expect(result).toHaveLength(2)
      expect(result[0].grade).toBe('B+')
      expect(result[1].grade).toBe('A')
      expect(result[0].updated_at).toBe(timestamp)
    })
  })

  describe('prepareTemplateSubjects', () => {
    it('should create subjects with correct display order', () => {
      const result = prepareTemplateSubjects('template-1', ['sub-1', 'sub-2', 'sub-3'])

      expect(result).toHaveLength(3)
      expect(result[0].display_order).toBe(1)
      expect(result[1].display_order).toBe(2)
      expect(result[2].display_order).toBe(3)
      expect(result[0].template_id).toBe('template-1')
      expect(result[0].is_required).toBe(true)
    })

    it('should handle empty subject array', () => {
      const result = prepareTemplateSubjects('template-1', [])
      expect(result).toHaveLength(0)
    })
  })

  describe('flattenTemplateSubjects', () => {
    it('should extract subject objects from nested structure', () => {
      const data = [
        { subject: { id: 'sub-1', name: 'Math' } },
        { subject: { id: 'sub-2', name: 'Science' } }
      ]

      const result = flattenTemplateSubjects(data)
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('sub-1')
      expect(result[1].id).toBe('sub-2')
    })

    it('should return empty array for null input', () => {
      expect(flattenTemplateSubjects(null)).toEqual([])
    })
  })

  describe('buildReportMap', () => {
    it('should create map keyed by student_id', () => {
      const reports = [
        { student_id: 'student-1', average_score: 85 },
        { student_id: 'student-2', average_score: 90 }
      ]

      const map = buildReportMap(reports)
      expect(map.size).toBe(2)
      expect(map.get('student-1')?.average_score).toBe(85)
      expect(map.get('student-2')?.average_score).toBe(90)
    })

    it('should return empty map for null input', () => {
      const map = buildReportMap(null)
      expect(map.size).toBe(0)
    })
  })

  describe('groupGradesByStudent', () => {
    it('should group grades by student_id', () => {
      const grades = [
        { student_id: 'student-1', subject: 'Math', score: 85 },
        { student_id: 'student-1', subject: 'Science', score: 90 },
        { student_id: 'student-2', subject: 'Math', score: 75 }
      ]

      const grouped = groupGradesByStudent(grades)
      expect(grouped['student-1']).toHaveLength(2)
      expect(grouped['student-2']).toHaveLength(1)
    })

    it('should return empty object for null input', () => {
      expect(groupGradesByStudent(null)).toEqual({})
    })
  })

  describe('filterValidEnrollments', () => {
    it('should filter out enrollments with null students', () => {
      const enrollments = [
        { student: { id: 'student-1', name: 'John' } },
        { student: null },
        { student: { id: 'student-2', name: 'Jane' } },
        { student: undefined }
      ]

      const result = filterValidEnrollments(enrollments)
      expect(result).toHaveLength(2)
      expect(result[0].student?.id).toBe('student-1')
      expect(result[1].student?.id).toBe('student-2')
    })
  })

  describe('extractStudentIds', () => {
    it('should extract student IDs from enrollments', () => {
      const enrollments = [
        { student: { id: 'student-1' } },
        { student: { id: 'student-2' } }
      ]

      const ids = extractStudentIds(enrollments)
      expect(ids).toEqual(['student-1', 'student-2'])
    })

    it('should filter out null/undefined IDs', () => {
      const enrollments = [
        { student: { id: 'student-1' } },
        { student: null },
        { student: { id: null } }
      ]

      const ids = extractStudentIds(enrollments)
      expect(ids).toEqual(['student-1'])
    })
  })

  describe('buildClassReportsSummary', () => {
    it('should merge enrollment and report data', () => {
      const enrollments = [
        { student: { id: 'student-1', name: 'John' } },
        { student: { id: 'student-2', name: 'Jane' } }
      ]

      const reportMap = new Map([
        ['student-1', { id: 'report-1', is_published: true, average_score: 85 }]
      ])

      const result = buildClassReportsSummary(enrollments, reportMap)

      expect(result).toHaveLength(2)
      expect(result[0].isGenerated).toBe(true)
      expect(result[0].isPublished).toBe(true)
      expect(result[0].averageScore).toBe(85)
      expect(result[1].isGenerated).toBe(false)
      expect(result[1].isPublished).toBe(false)
    })
  })

  describe('buildBulkClassReports', () => {
    it('should combine all data sources correctly', () => {
      const enrollments = [
        { student: { id: 'student-1' }, class: { id: 'class-1' } }
      ]

      const gradesMap = {
        'student-1': [{ subject: 'Math', score: 85 }]
      }

      const assessmentsMap = {
        'student-1': [{ aspect: 'discipline', grade: 'A' }]
      }

      const reportsMap = new Map([
        ['student-1', {
          sick_days: 2,
          permission_days: 1,
          absent_days: 0,
          teacher_notes: 'Good student'
        }]
      ])

      const result = buildBulkClassReports(enrollments, gradesMap, assessmentsMap, reportsMap)

      expect(result).toHaveLength(1)
      expect(result[0].grades).toHaveLength(1)
      expect(result[0].character_assessments).toHaveLength(1)
      expect(result[0].sick_days).toBe(2)
      expect(result[0].teacher_notes).toBe('Good student')
    })

    it('should use defaults when report is missing', () => {
      const enrollments = [
        { student: { id: 'student-1' }, class: { id: 'class-1' } }
      ]

      const result = buildBulkClassReports(enrollments, {}, {}, new Map())

      expect(result[0].grades).toEqual([])
      expect(result[0].character_assessments).toEqual([])
      expect(result[0].sick_days).toBe(0)
      expect(result[0].permission_days).toBe(0)
      expect(result[0].absent_days).toBe(0)
      expect(result[0].teacher_notes).toBe('')
    })
  })

  describe('prepareSectionGrades', () => {
    it('should transform section grades data correctly', () => {
      const data = {
        student_id: 'student-1',
        template_id: 'template-1',
        academic_year_id: 'year-1',
        semester: 1 as const,
        grades: [
          {
            section_id: 'section-1',
            section_item_id: 'item-1',
            material_item_id: 'material-1',
            score: 85,
            grade: 'B+',
            is_memorized: true
          }
        ]
      }

      const result = prepareSectionGrades(data)

      expect(result).toHaveLength(1)
      expect(result[0].student_id).toBe('student-1')
      expect(result[0].template_id).toBe('template-1')
      expect(result[0].score).toBe(85)
      expect(result[0].is_memorized).toBe(true)
    })
  })

  describe('prepareStudentReportData', () => {
    it('should prepare report data with correct fields', () => {
      const timestamp = '2026-03-12T00:00:00Z'
      const result = prepareStudentReportData(
        'student-1',
        'year-1',
        1,
        'class-1',
        85.456,
        timestamp
      )

      expect(result.student_id).toBe('student-1')
      expect(result.academic_year_id).toBe('year-1')
      expect(result.semester).toBe(1)
      expect(result.class_id).toBe('class-1')
      expect(result.average_score).toBe(85.46) // Rounded to 2 decimals
      expect(result.generated_at).toBe(timestamp)
      expect(result.updated_at).toBe(timestamp)
    })
  })
})
