import { describe, it, expect, vi } from 'vitest'
import {
  fetchStudentGrades,
  fetchCharacterAssessments,
  fetchReportTemplates,
  fetchTemplateSubjects,
  fetchStudentReport,
  fetchGradesForAverage,
  fetchStudentEnrollment,
  fetchClassReports,
  upsertStudentGrade,
  bulkUpsertStudentGrades,
  upsertCharacterAssessment,
  insertReportTemplate,
  insertTemplateSubjects,
  updateReportTemplateRecord,
  deleteTemplateSubjects,
  upsertStudentReport,
  updateReportPublishStatus,
  upsertSectionGrades,
  fetchBulkClassData
} from '../queries'

describe('Rapot Queries - Layer 1', () => {
  describe('fetchStudentGrades', () => {
    it('should query student_grades with correct filters and nested subjects', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq3 = vi.fn().mockReturnValue({ order: mockOrder })
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchStudentGrades(mockSupabase, 'student-1', 'year-1', 1)

      expect(mockFrom).toHaveBeenCalledWith('student_grades')
      expect(mockSelect).toHaveBeenCalled()
      expect(mockEq1).toHaveBeenCalledWith('student_id', 'student-1')
      expect(mockEq2).toHaveBeenCalledWith('academic_year_id', 'year-1')
      expect(mockEq3).toHaveBeenCalledWith('semester', 1)
      expect(mockOrder).toHaveBeenCalledWith('display_order', { foreignTable: 'subject' })
    })
  })

  describe('fetchCharacterAssessments', () => {
    it('should query student_character_assessments with correct filters', async () => {
      const mockEq3 = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchCharacterAssessments(mockSupabase, 'student-1', 'year-1', 2)

      expect(mockFrom).toHaveBeenCalledWith('student_character_assessments')
      expect(mockEq1).toHaveBeenCalledWith('student_id', 'student-1')
      expect(mockEq2).toHaveBeenCalledWith('academic_year_id', 'year-1')
      expect(mockEq3).toHaveBeenCalledWith('semester', 2)
    })
  })

  describe('fetchReportTemplates', () => {
    it('should fetch all templates when includeAll is true', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchReportTemplates(mockSupabase, { includeAll: true })

      expect(mockFrom).toHaveBeenCalledWith('report_templates')
      expect(mockEq).toHaveBeenCalledWith('is_active', true)
    })

    it('should filter by classId when provided and includeAll is false', async () => {
      const mockOr = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ or: mockOr })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchReportTemplates(mockSupabase, { classId: 'class-1', includeAll: false })

      expect(mockOr).toHaveBeenCalledWith('class_id.eq.class-1,class_id.is.null')
    })

    it('should filter by academicYearId when provided', async () => {
      const mockOr2 = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockOr1 = vi.fn().mockReturnValue({ or: mockOr2 })
      const mockEq = vi.fn().mockReturnValue({ or: mockOr1 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchReportTemplates(mockSupabase, {
        classId: 'class-1',
        academicYearId: 'year-1',
        includeAll: false
      })

      expect(mockOr2).toHaveBeenCalledWith('academic_year_id.eq.year-1,academic_year_id.is.null')
    })
  })

  describe('fetchTemplateSubjects', () => {
    it('should fetch template subjects ordered by display_order', async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchTemplateSubjects(mockSupabase, 'template-1')

      expect(mockFrom).toHaveBeenCalledWith('report_template_subjects')
      expect(mockEq).toHaveBeenCalledWith('template_id', 'template-1')
      expect(mockOrder).toHaveBeenCalledWith('display_order')
    })
  })

  describe('fetchStudentReport', () => {
    it('should fetch single student report with joins', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockEq3 = vi.fn().mockReturnValue({ single: mockSingle })
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      await fetchStudentReport(mockSupabase, 'student-1', 'year-1', 1)

      expect(mockFrom).toHaveBeenCalledWith('student_reports')
      expect(mockEq1).toHaveBeenCalledWith('student_id', 'student-1')
      expect(mockEq2).toHaveBeenCalledWith('academic_year_id', 'year-1')
      expect(mockEq3).toHaveBeenCalledWith('semester', 1)
      expect(mockSingle).toHaveBeenCalled()
    })
  })

  describe('upsertStudentGrade', () => {
    it('should upsert student grade with correct conflict resolution', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })

      const mockSupabase = { from: mockFrom } as any

      const gradeData = {
        student_id: 'student-1',
        subject_id: 'subject-1',
        academic_year_id: 'year-1',
        semester: 1,
        score: 85,
        grade: 'B+',
        description: 'Good work',
        updated_at: '2026-03-12T00:00:00Z'
      }

      await upsertStudentGrade(mockSupabase, gradeData)

      expect(mockFrom).toHaveBeenCalledWith('student_grades')
      expect(mockUpsert).toHaveBeenCalledWith(
        gradeData,
        { onConflict: 'student_id, subject_id, academic_year_id, semester' }
      )
    })
  })

  describe('bulkUpsertStudentGrades', () => {
    it('should bulk upsert multiple grades', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })

      const mockSupabase = { from: mockFrom } as any

      const grades = [
        {
          student_id: 'student-1',
          subject_id: 'subject-1',
          academic_year_id: 'year-1',
          semester: 1,
          score: 85,
          grade: 'B+',
          description: 'Good',
          updated_at: '2026-03-12T00:00:00Z'
        },
        {
          student_id: 'student-2',
          subject_id: 'subject-1',
          academic_year_id: 'year-1',
          semester: 1,
          score: 90,
          grade: 'A',
          description: 'Excellent',
          updated_at: '2026-03-12T00:00:00Z'
        }
      ]

      await bulkUpsertStudentGrades(mockSupabase, grades)

      expect(mockUpsert).toHaveBeenCalledWith(
        grades,
        { onConflict: 'student_id, subject_id, academic_year_id, semester' }
      )
    })
  })

  describe('upsertCharacterAssessment', () => {
    it('should upsert character assessment with correct conflict', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })

      const mockSupabase = { from: mockFrom } as any

      const assessment = {
        student_id: 'student-1',
        academic_year_id: 'year-1',
        semester: 1,
        character_aspect: 'discipline',
        grade: 'A',
        description: 'Very disciplined',
        updated_at: '2026-03-12T00:00:00Z'
      }

      await upsertCharacterAssessment(mockSupabase, assessment)

      expect(mockFrom).toHaveBeenCalledWith('student_character_assessments')
      expect(mockUpsert).toHaveBeenCalledWith(
        assessment,
        { onConflict: 'student_id, academic_year_id, semester, character_aspect' }
      )
    })
  })

  describe('insertReportTemplate', () => {
    it('should insert template and return single record', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'template-1' }, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })

      const mockSupabase = { from: mockFrom } as any

      const templateData = {
        name: 'Template 1',
        class_id: 'class-1',
        academic_year_id: 'year-1',
        is_active: true
      }

      await insertReportTemplate(mockSupabase, templateData)

      expect(mockFrom).toHaveBeenCalledWith('report_templates')
      expect(mockInsert).toHaveBeenCalledWith(templateData)
      expect(mockSelect).toHaveBeenCalled()
      expect(mockSingle).toHaveBeenCalled()
    })
  })

  describe('updateReportTemplateRecord', () => {
    it('should update template by id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      const mockSupabase = { from: mockFrom } as any

      const updateData = {
        name: 'Updated Template',
        class_id: null,
        academic_year_id: null,
        is_active: false,
        updated_at: '2026-03-12T00:00:00Z'
      }

      await updateReportTemplateRecord(mockSupabase, 'template-1', updateData)

      expect(mockFrom).toHaveBeenCalledWith('report_templates')
      expect(mockUpdate).toHaveBeenCalledWith(updateData)
      expect(mockEq).toHaveBeenCalledWith('id', 'template-1')
    })
  })

  describe('deleteTemplateSubjects', () => {
    it('should delete subjects by template_id', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ delete: mockDelete })

      const mockSupabase = { from: mockFrom } as any

      await deleteTemplateSubjects(mockSupabase, 'template-1')

      expect(mockFrom).toHaveBeenCalledWith('report_template_subjects')
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('template_id', 'template-1')
    })
  })

  describe('upsertStudentReport', () => {
    it('should upsert student report and return single record', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'report-1' }, error: null })
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle })
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect })
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })

      const mockSupabase = { from: mockFrom } as any

      const reportData = {
        student_id: 'student-1',
        academic_year_id: 'year-1',
        semester: 1,
        class_id: 'class-1',
        average_score: 85.5,
        generated_at: '2026-03-12T00:00:00Z',
        updated_at: '2026-03-12T00:00:00Z'
      }

      await upsertStudentReport(mockSupabase, reportData)

      expect(mockUpsert).toHaveBeenCalledWith(
        reportData,
        { onConflict: 'student_id, academic_year_id, semester' }
      )
      expect(mockSelect).toHaveBeenCalled()
      expect(mockSingle).toHaveBeenCalled()
    })
  })

  describe('updateReportPublishStatus', () => {
    it('should update is_published field', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq })
      const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })

      const mockSupabase = { from: mockFrom } as any

      await updateReportPublishStatus(mockSupabase, 'report-1', true)

      expect(mockFrom).toHaveBeenCalledWith('student_reports')
      expect(mockUpdate).toHaveBeenCalledWith({ is_published: true })
      expect(mockEq).toHaveBeenCalledWith('id', 'report-1')
    })
  })

  describe('fetchClassReports', () => {
    it('should fetch reports for multiple students', async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      const studentIds = ['student-1', 'student-2']
      await fetchClassReports(mockSupabase, studentIds, 'year-1', 1)

      expect(mockFrom).toHaveBeenCalledWith('student_reports')
      expect(mockIn).toHaveBeenCalledWith('student_id', studentIds)
      expect(mockEq1).toHaveBeenCalledWith('academic_year_id', 'year-1')
      expect(mockEq2).toHaveBeenCalledWith('semester', 1)
    })
  })

  describe('upsertSectionGrades', () => {
    it('should upsert section grades in bulk with correct conflict', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockFrom = vi.fn().mockReturnValue({ upsert: mockUpsert })

      const mockSupabase = { from: mockFrom } as any

      const grades = [
        {
          student_id: 'student-1',
          template_id: 'template-1',
          section_id: 'section-1',
          section_item_id: 'item-1',
          material_item_id: 'material-1',
          academic_year_id: 'year-1',
          semester: 1,
          score: 85,
          grade: 'B+',
          is_memorized: true,
          description: 'Good'
        }
      ]

      await upsertSectionGrades(mockSupabase, grades)

      expect(mockFrom).toHaveBeenCalledWith('student_section_grades')
      expect(mockUpsert).toHaveBeenCalledWith(
        grades,
        { onConflict: 'student_id,section_item_id,material_item_id,academic_year_id,semester' }
      )
    })
  })

  describe('fetchBulkClassData', () => {
    it('should fetch all data in parallel using Promise.all', async () => {
      const mockEq2 = vi.fn().mockResolvedValue({ data: [], error: null })
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 })
      const mockIn = vi.fn().mockReturnValue({ eq: mockEq1 })
      const mockSelect = vi.fn().mockReturnValue({ in: mockIn })
      const mockFrom = vi.fn().mockReturnValue({ select: mockSelect })

      const mockSupabase = { from: mockFrom } as any

      const studentIds = ['student-1', 'student-2']
      const result = await fetchBulkClassData(mockSupabase, studentIds, 'year-1', 1)

      // Should return array of 3 promises (grades, assessments, reports)
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(3)

      // Verify all 3 queries were called
      expect(mockFrom).toHaveBeenCalledWith('student_grades')
      expect(mockFrom).toHaveBeenCalledWith('student_character_assessments')
      expect(mockFrom).toHaveBeenCalledWith('student_reports')
    })
  })
})
