import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock modules BEFORE imports
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('../queries', () => ({
  fetchStudentGrades: vi.fn(),
  fetchCharacterAssessments: vi.fn(),
  fetchReportTemplates: vi.fn(),
  fetchTemplateSubjects: vi.fn(),
  fetchStudentReport: vi.fn(),
  fetchGradesForAverage: vi.fn(),
  fetchStudentEnrollment: vi.fn(),
  fetchClassReports: vi.fn(),
  fetchBulkClassData: vi.fn(),
  upsertStudentGrade: vi.fn(),
  bulkUpsertStudentGrades: vi.fn(),
  upsertCharacterAssessment: vi.fn(),
  insertReportTemplate: vi.fn(),
  insertTemplateSubjects: vi.fn(),
  updateReportTemplateRecord: vi.fn(),
  deleteTemplateSubjects: vi.fn(),
  upsertStudentReport: vi.fn(),
  updateReportPublishStatus: vi.fn(),
  upsertSectionGrades: vi.fn(),
}))
vi.mock('../logic', () => ({
  calculateGradeFromScore: vi.fn(),
  validateGradeInput: vi.fn(),
  validateCharacterAssessmentInput: vi.fn(),
  validateReportTemplateInput: vi.fn(),
  calculateAverageScore: vi.fn(),
  prepareGradeData: vi.fn(),
  prepareMultipleGradeData: vi.fn(),
  prepareCharacterAssessmentData: vi.fn(),
  prepareReportTemplateData: vi.fn(),
  prepareReportTemplateUpdateData: vi.fn(),
  prepareTemplateSubjects: vi.fn(),
  flattenTemplateSubjects: vi.fn(),
  buildReportMap: vi.fn(),
  groupGradesByStudent: vi.fn(),
  groupAssessmentsByStudent: vi.fn(),
  filterValidEnrollments: vi.fn(),
  extractStudentIds: vi.fn(),
  buildClassReportsSummary: vi.fn(),
  buildBulkClassReports: vi.fn(),
  prepareSectionGrades: vi.fn(),
  prepareStudentReportData: vi.fn(),
}))
vi.mock('@/app/(admin)/tahun-ajaran/actions/enrollments', () => ({
  getClassEnrollments: vi.fn(),
}))

import { createAdminClient } from '@/lib/supabase/server'
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
  upsertSectionGrades,
} from '../queries'
import {
  calculateGradeFromScore,
  validateGradeInput,
  validateCharacterAssessmentInput,
  validateReportTemplateInput,
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
  prepareStudentReportData,
  calculateAverageScore,
} from '../logic'
import { getClassEnrollments } from '@/app/(admin)/tahun-ajaran/actions/enrollments'

import {
  calculateGradeFromScoreAction,
  getStudentGrades,
  bulkUpsertSectionGrades,
  updateGrade,
  bulkUpdateGrades,
  getCharacterAssessments,
  updateCharacterAssessment,
  getReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  updateTemplateSubjects,
  getTemplateSubjects,
  getStudentReport,
  generateReport,
  publishReport,
  getClassReportsSummary,
  getClassReportsBulk,
} from '../actions'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryBuilder(resolvedValue: any = { data: null, error: null }) {
  const b: any = {}
  const terminalMock = vi.fn().mockResolvedValue(resolvedValue)
  b.select = vi.fn().mockReturnValue(b)
  b.insert = vi.fn().mockReturnValue(b)
  b.update = vi.fn().mockReturnValue(b)
  b.delete = vi.fn().mockReturnValue(b)
  b.upsert = vi.fn().mockReturnValue(b)
  b.eq = vi.fn().mockReturnValue(b)
  b.neq = vi.fn().mockReturnValue(b)
  b.in = vi.fn().mockReturnValue(b)
  b.is = vi.fn().mockReturnValue(b)
  b.order = vi.fn().mockReturnValue(b)
  b.limit = vi.fn().mockReturnValue(b)
  b.single = terminalMock
  b.maybeSingle = terminalMock
  b.then = (resolve: any) => Promise.resolve(resolvedValue).then(resolve)
  return b
}

function makeAdminSupabase(overrides: { fromBuilder?: any } = {}) {
  return {
    from: vi.fn().mockReturnValue(overrides.fromBuilder || makeQueryBuilder({ data: null, error: null })),
  } as any
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Rapot Actions (Layer 3)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─────────────────────────────────────────────────────────────────────────
  // calculateGradeFromScoreAction
  // ─────────────────────────────────────────────────────────────────────────

  describe('calculateGradeFromScoreAction', () => {
    it('delegates to calculateGradeFromScore pure function', async () => {
      vi.mocked(calculateGradeFromScore).mockReturnValue('A')

      const result = await calculateGradeFromScoreAction(95)

      expect(calculateGradeFromScore).toHaveBeenCalledWith(95)
      expect(result).toBe('A')
    })

    it('returns E for very low score via pure function', async () => {
      vi.mocked(calculateGradeFromScore).mockReturnValue('E')

      const result = await calculateGradeFromScoreAction(10)

      expect(calculateGradeFromScore).toHaveBeenCalledWith(10)
      expect(result).toBe('E')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getStudentGrades
  // ─────────────────────────────────────────────────────────────────────────

  describe('getStudentGrades', () => {
    it('returns student grades on happy path', async () => {
      const gradesData = [
        { id: 'g1', student_id: 'student-1', subject_id: 'sub-1', score: 85, grade: 'B+' },
      ]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentGrades).mockResolvedValue({ data: gradesData, error: null } as any)

      const result = await getStudentGrades('student-1', 'year-1', 1)

      expect(result).toEqual(gradesData)
      expect(fetchStudentGrades).toHaveBeenCalledWith(adminClient, 'student-1', 'year-1', 1)
    })

    it('returns empty array when no grades found', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentGrades).mockResolvedValue({ data: null, error: null } as any)

      const result = await getStudentGrades('student-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('throws error when fetchStudentGrades fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentGrades).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getStudentGrades('student-1', 'year-1', 1)).rejects.toThrow('Gagal mengambil nilai siswa')
    })

    it('handles semester 2 correctly', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentGrades).mockResolvedValue({ data: [], error: null } as any)

      const result = await getStudentGrades('student-2', 'year-2', 2)

      expect(fetchStudentGrades).toHaveBeenCalledWith(adminClient, 'student-2', 'year-2', 2)
      expect(result).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // bulkUpsertSectionGrades
  // ─────────────────────────────────────────────────────────────────────────

  describe('bulkUpsertSectionGrades', () => {
    const sectionGradesInput = {
      student_id: 'student-1',
      template_id: 'template-1',
      academic_year_id: 'year-1',
      semester: 1 as const,
      grades: [
        {
          section_id: 'sec-1',
          section_item_id: 'item-1',
          material_item_id: 'mat-1',
          score: 85,
        },
      ],
    }

    it('returns success on happy path', async () => {
      const preparedGrades = [{ student_id: 'student-1', section_id: 'sec-1' }]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(prepareSectionGrades).mockReturnValue(preparedGrades as any)
      vi.mocked(upsertSectionGrades).mockResolvedValue({ error: null } as any)

      const result = await bulkUpsertSectionGrades(sectionGradesInput)

      expect(prepareSectionGrades).toHaveBeenCalledWith(sectionGradesInput)
      expect(upsertSectionGrades).toHaveBeenCalledWith(adminClient, preparedGrades)
      expect(result).toEqual({ success: true })
    })

    it('throws when upsertSectionGrades fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(prepareSectionGrades).mockReturnValue([] as any)
      const dbError = new Error('Upsert failed')
      vi.mocked(upsertSectionGrades).mockResolvedValue({ error: dbError } as any)

      await expect(bulkUpsertSectionGrades(sectionGradesInput)).rejects.toThrow('Upsert failed')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateGrade
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateGrade', () => {
    const validGradeInput = {
      student_id: 'student-1',
      subject_id: 'sub-1',
      academic_year_id: 'year-1',
      semester: 1 as const,
      score: 85,
    }

    it('throws when validation fails', async () => {
      vi.mocked(validateGradeInput).mockReturnValue({ ok: false, error: 'Student ID is required' })

      await expect(updateGrade(validGradeInput)).rejects.toThrow('Student ID is required')
      expect(createAdminClient).not.toHaveBeenCalled()
    })

    it('saves grade on happy path', async () => {
      const gradeData = { student_id: 'student-1', score: 85, grade: 'B+', updated_at: '2026-03-18' }
      vi.mocked(validateGradeInput).mockReturnValue({ ok: true })
      vi.mocked(prepareGradeData).mockReturnValue(gradeData as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertStudentGrade).mockResolvedValue({ error: null } as any)

      await expect(updateGrade(validGradeInput)).resolves.toBeUndefined()
      expect(upsertStudentGrade).toHaveBeenCalledWith(adminClient, gradeData)
    })

    it('throws when upsertStudentGrade fails', async () => {
      vi.mocked(validateGradeInput).mockReturnValue({ ok: true })
      vi.mocked(prepareGradeData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertStudentGrade).mockResolvedValue({ error: new Error('DB write failed') } as any)

      await expect(updateGrade(validGradeInput)).rejects.toThrow('Gagal menyimpan nilai')
    })

    it('calls prepareGradeData with input and timestamp', async () => {
      vi.mocked(validateGradeInput).mockReturnValue({ ok: true })
      vi.mocked(prepareGradeData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertStudentGrade).mockResolvedValue({ error: null } as any)

      await updateGrade(validGradeInput)

      expect(prepareGradeData).toHaveBeenCalledWith(validGradeInput, expect.any(String))
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // bulkUpdateGrades
  // ─────────────────────────────────────────────────────────────────────────

  describe('bulkUpdateGrades', () => {
    const validUpdates = [
      { student_id: 'student-1', subject_id: 'sub-1', academic_year_id: 'year-1', semester: 1 as const, score: 80 },
      { student_id: 'student-2', subject_id: 'sub-1', academic_year_id: 'year-1', semester: 1 as const, score: 75 },
    ]

    it('throws when any validation fails', async () => {
      vi.mocked(validateGradeInput)
        .mockReturnValueOnce({ ok: true })
        .mockReturnValueOnce({ ok: false, error: 'Subject ID is required' })

      await expect(bulkUpdateGrades(validUpdates)).rejects.toThrow('Subject ID is required')
    })

    it('saves all grades on happy path', async () => {
      vi.mocked(validateGradeInput).mockReturnValue({ ok: true })
      vi.mocked(prepareMultipleGradeData).mockReturnValue([{}, {}] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(bulkUpsertStudentGrades).mockResolvedValue({ error: null } as any)

      await expect(bulkUpdateGrades(validUpdates)).resolves.toBeUndefined()
      expect(bulkUpsertStudentGrades).toHaveBeenCalled()
    })

    it('throws when bulkUpsertStudentGrades fails', async () => {
      vi.mocked(validateGradeInput).mockReturnValue({ ok: true })
      vi.mocked(prepareMultipleGradeData).mockReturnValue([] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(bulkUpsertStudentGrades).mockResolvedValue({ error: new Error('Bulk fail') } as any)

      await expect(bulkUpdateGrades(validUpdates)).rejects.toThrow('Gagal menyimpan update nilai masal')
    })

    it('handles empty updates array', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(prepareMultipleGradeData).mockReturnValue([] as any)
      vi.mocked(bulkUpsertStudentGrades).mockResolvedValue({ error: null } as any)

      await expect(bulkUpdateGrades([])).resolves.toBeUndefined()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getCharacterAssessments
  // ─────────────────────────────────────────────────────────────────────────

  describe('getCharacterAssessments', () => {
    it('returns assessments on happy path', async () => {
      const assessments = [{ id: 'a1', student_id: 'student-1', character_aspect: 'discipline' }]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchCharacterAssessments).mockResolvedValue({ data: assessments, error: null } as any)

      const result = await getCharacterAssessments('student-1', 'year-1', 1)

      expect(result).toEqual(assessments)
    })

    it('returns empty array when no assessments found', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchCharacterAssessments).mockResolvedValue({ data: null, error: null } as any)

      const result = await getCharacterAssessments('student-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('throws when fetchCharacterAssessments fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchCharacterAssessments).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getCharacterAssessments('student-1', 'year-1', 1)).rejects.toThrow(
        'Gagal mengambil penilaian karakter'
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateCharacterAssessment
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateCharacterAssessment', () => {
    const validInput = {
      student_id: 'student-1',
      academic_year_id: 'year-1',
      semester: 1 as const,
      character_aspect: 'discipline',
      grade: 'A',
    }

    it('throws when validation fails', async () => {
      vi.mocked(validateCharacterAssessmentInput).mockReturnValue({
        ok: false,
        error: 'Character aspect is required',
      })

      await expect(updateCharacterAssessment(validInput)).rejects.toThrow('Character aspect is required')
    })

    it('saves assessment on happy path', async () => {
      vi.mocked(validateCharacterAssessmentInput).mockReturnValue({ ok: true })
      vi.mocked(prepareCharacterAssessmentData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertCharacterAssessment).mockResolvedValue({ error: null } as any)

      await expect(updateCharacterAssessment(validInput)).resolves.toBeUndefined()
    })

    it('throws when upsertCharacterAssessment fails', async () => {
      vi.mocked(validateCharacterAssessmentInput).mockReturnValue({ ok: true })
      vi.mocked(prepareCharacterAssessmentData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(upsertCharacterAssessment).mockResolvedValue({
        error: new Error('DB write failed'),
      } as any)

      await expect(updateCharacterAssessment(validInput)).rejects.toThrow('Gagal menyimpan penilaian karakter')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getReportTemplates
  // ─────────────────────────────────────────────────────────────────────────

  describe('getReportTemplates', () => {
    it('returns templates on happy path', async () => {
      const templates = [{ id: 't1', name: 'Template A', is_active: true }]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchReportTemplates).mockResolvedValue({ data: templates, error: null } as any)

      const result = await getReportTemplates()

      expect(result).toEqual(templates)
    })

    it('returns empty array when no templates found', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchReportTemplates).mockResolvedValue({ data: null, error: null } as any)

      const result = await getReportTemplates()

      expect(result).toEqual([])
    })

    it('passes filters correctly to fetchReportTemplates', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchReportTemplates).mockResolvedValue({ data: [], error: null } as any)

      await getReportTemplates('class-1', 'year-1', true)

      expect(fetchReportTemplates).toHaveBeenCalledWith(adminClient, {
        classId: 'class-1',
        academicYearId: 'year-1',
        includeAll: true,
      })
    })

    it('throws when fetchReportTemplates fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchReportTemplates).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getReportTemplates()).rejects.toThrow('Gagal mengambil template rapot')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // createReportTemplate
  // ─────────────────────────────────────────────────────────────────────────

  describe('createReportTemplate', () => {
    const validTemplateInput = {
      name: 'Rapot Semester 1',
      class_id: 'class-1',
      academic_year_id: 'year-1',
    }

    it('throws when validation fails', async () => {
      vi.mocked(validateReportTemplateInput).mockReturnValue({
        ok: false,
        error: 'Template name is required',
      })

      await expect(createReportTemplate(validTemplateInput)).rejects.toThrow('Template name is required')
    })

    it('creates template on happy path without subjects', async () => {
      const createdTemplate = { id: 'template-1', name: 'Rapot Semester 1' }
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertReportTemplate).mockResolvedValue({ data: createdTemplate, error: null } as any)

      const result = await createReportTemplate(validTemplateInput)

      expect(result).toEqual(createdTemplate)
      expect(insertTemplateSubjects).not.toHaveBeenCalled()
    })

    it('creates template and adds subjects when subject_ids provided', async () => {
      const createdTemplate = { id: 'template-1', name: 'Rapot Semester 1' }
      const inputWithSubjects = { ...validTemplateInput, subject_ids: ['sub-1', 'sub-2'] }
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateData).mockReturnValue({} as any)
      vi.mocked(prepareTemplateSubjects).mockReturnValue([] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertReportTemplate).mockResolvedValue({ data: createdTemplate, error: null } as any)
      vi.mocked(insertTemplateSubjects).mockResolvedValue({ error: null } as any)

      const result = await createReportTemplate(inputWithSubjects)

      expect(result).toEqual(createdTemplate)
      expect(prepareTemplateSubjects).toHaveBeenCalledWith('template-1', ['sub-1', 'sub-2'])
      expect(insertTemplateSubjects).toHaveBeenCalled()
    })

    it('throws when insertReportTemplate fails', async () => {
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertReportTemplate).mockResolvedValue({
        data: null,
        error: new Error('Insert failed'),
      } as any)

      await expect(createReportTemplate(validTemplateInput)).rejects.toThrow('Gagal membuat template rapot')
    })

    it('continues even when insertTemplateSubjects fails (non-fatal)', async () => {
      const createdTemplate = { id: 'template-1', name: 'Rapot Semester 1' }
      const inputWithSubjects = { ...validTemplateInput, subject_ids: ['sub-1'] }
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateData).mockReturnValue({} as any)
      vi.mocked(prepareTemplateSubjects).mockReturnValue([] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(insertReportTemplate).mockResolvedValue({ data: createdTemplate, error: null } as any)
      vi.mocked(insertTemplateSubjects).mockResolvedValue({ error: new Error('Subject insert failed') } as any)

      // Should not throw despite subject insert failure
      const result = await createReportTemplate(inputWithSubjects)
      expect(result).toEqual(createdTemplate)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateReportTemplate
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateReportTemplate', () => {
    const validInput = { name: 'Updated Template', class_id: 'class-1', academic_year_id: 'year-1' }

    it('throws when validation fails', async () => {
      vi.mocked(validateReportTemplateInput).mockReturnValue({
        ok: false,
        error: 'Template name is too long (max 200 characters)',
      })

      await expect(updateReportTemplate('template-1', validInput)).rejects.toThrow(
        'Template name is too long (max 200 characters)'
      )
    })

    it('updates template on happy path', async () => {
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateUpdateData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateReportTemplateRecord).mockResolvedValue({ error: null } as any)
      vi.mocked(deleteTemplateSubjects).mockResolvedValue({ error: null } as any)

      await expect(updateReportTemplate('template-1', validInput)).resolves.toBeUndefined()
    })

    it('throws when updateReportTemplateRecord fails', async () => {
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateUpdateData).mockReturnValue({} as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateReportTemplateRecord).mockResolvedValue({
        error: new Error('Update failed'),
      } as any)

      await expect(updateReportTemplate('template-1', validInput)).rejects.toThrow(
        'Gagal update template rapot'
      )
    })

    it('calls updateTemplateSubjects when subject_ids provided', async () => {
      const inputWithSubjects = { ...validInput, subject_ids: ['sub-1', 'sub-2'] }
      vi.mocked(validateReportTemplateInput).mockReturnValue({ ok: true })
      vi.mocked(prepareReportTemplateUpdateData).mockReturnValue({} as any)
      vi.mocked(prepareTemplateSubjects).mockReturnValue([{ template_id: 'template-1' }] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateReportTemplateRecord).mockResolvedValue({ error: null } as any)
      vi.mocked(deleteTemplateSubjects).mockResolvedValue({ error: null } as any)
      vi.mocked(insertTemplateSubjects).mockResolvedValue({ error: null } as any)

      await updateReportTemplate('template-1', inputWithSubjects)

      expect(deleteTemplateSubjects).toHaveBeenCalled()
      expect(insertTemplateSubjects).toHaveBeenCalled()
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getTemplateSubjects
  // ─────────────────────────────────────────────────────────────────────────

  describe('getTemplateSubjects', () => {
    it('returns flattened subjects on happy path', async () => {
      const rawData = [{ subject: { id: 'sub-1', display_name: 'Math' } }]
      const flattenedSubjects = [{ id: 'sub-1', display_name: 'Math' }]

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchTemplateSubjects).mockResolvedValue({ data: rawData, error: null } as any)
      vi.mocked(flattenTemplateSubjects).mockReturnValue(flattenedSubjects as any)

      const result = await getTemplateSubjects('template-1')

      expect(flattenTemplateSubjects).toHaveBeenCalledWith(rawData)
      expect(result).toEqual(flattenedSubjects)
    })

    it('throws when fetchTemplateSubjects fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchTemplateSubjects).mockResolvedValue({
        data: null,
        error: new Error('DB error'),
      } as any)

      await expect(getTemplateSubjects('template-1')).rejects.toThrow(
        'Gagal mengambil mata pelajaran template'
      )
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getStudentReport
  // ─────────────────────────────────────────────────────────────────────────

  describe('getStudentReport', () => {
    it('returns report on happy path', async () => {
      const report = { id: 'report-1', student_id: 'student-1', is_published: false }

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentReport).mockResolvedValue({ data: report, error: null } as any)

      const result = await getStudentReport('student-1', 'year-1', 1)

      expect(result).toEqual(report)
    })

    it('returns null when report not found (no data)', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentReport).mockResolvedValue({ data: null, error: null } as any)

      const result = await getStudentReport('student-1', 'year-1', 1)

      expect(result).toBeNull()
    })

    it('ignores PGRST116 (not found) error and returns null', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentReport).mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' },
      } as any)

      const result = await getStudentReport('student-1', 'year-1', 1)

      expect(result).toBeNull()
    })

    it('throws when a real DB error occurs', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchStudentReport).mockResolvedValue({
        data: null,
        error: { code: '42P01', message: 'Table not found' },
      } as any)

      await expect(getStudentReport('student-1', 'year-1', 1)).rejects.toThrow('Gagal mengambil data rapot')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // generateReport
  // ─────────────────────────────────────────────────────────────────────────

  describe('generateReport', () => {
    it('generates and returns report on happy path', async () => {
      const report = { id: 'report-1', student_id: 'student-1', average_score: 82.5 }
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchGradesForAverage).mockResolvedValue({
        data: [{ score: 80 }, { score: 85 }],
        error: null,
      } as any)
      vi.mocked(calculateAverageScore).mockReturnValue(82.5)
      vi.mocked(fetchStudentEnrollment).mockResolvedValue({
        data: { class_id: 'class-1' },
        error: null,
      } as any)
      vi.mocked(prepareStudentReportData).mockReturnValue({} as any)
      vi.mocked(upsertStudentReport).mockResolvedValue({ data: report, error: null } as any)

      const result = await generateReport('student-1', 'year-1', 1)

      expect(result).toEqual(report)
      expect(calculateAverageScore).toHaveBeenCalledWith([{ score: 80 }, { score: 85 }])
    })

    it('throws when student is not enrolled', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchGradesForAverage).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(calculateAverageScore).mockReturnValue(0)
      vi.mocked(fetchStudentEnrollment).mockResolvedValue({ data: null, error: null } as any)

      await expect(generateReport('student-1', 'year-1', 1)).rejects.toThrow(
        'Siswa tidak terdaftar pada tahun ajaran/semester ini'
      )
    })

    it('throws when upsertStudentReport fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchGradesForAverage).mockResolvedValue({ data: [], error: null } as any)
      vi.mocked(calculateAverageScore).mockReturnValue(0)
      vi.mocked(fetchStudentEnrollment).mockResolvedValue({
        data: { class_id: 'class-1' },
        error: null,
      } as any)
      vi.mocked(prepareStudentReportData).mockReturnValue({} as any)
      vi.mocked(upsertStudentReport).mockResolvedValue({
        data: null,
        error: new Error('Upsert failed'),
      } as any)

      await expect(generateReport('student-1', 'year-1', 1)).rejects.toThrow('Gagal regenerate rapot')
    })

    it('handles grades with null scores when calculating average', async () => {
      const report = { id: 'report-1', student_id: 'student-1', average_score: 0 }
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(fetchGradesForAverage).mockResolvedValue({ data: null, error: null } as any)
      vi.mocked(calculateAverageScore).mockReturnValue(0)
      vi.mocked(fetchStudentEnrollment).mockResolvedValue({
        data: { class_id: 'class-1' },
        error: null,
      } as any)
      vi.mocked(prepareStudentReportData).mockReturnValue({} as any)
      vi.mocked(upsertStudentReport).mockResolvedValue({ data: report, error: null } as any)

      const result = await generateReport('student-1', 'year-1', 1)

      expect(calculateAverageScore).toHaveBeenCalledWith([])
      expect(result).toEqual(report)
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // publishReport
  // ─────────────────────────────────────────────────────────────────────────

  describe('publishReport', () => {
    it('publishes report on happy path', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateReportPublishStatus).mockResolvedValue({ error: null } as any)

      await expect(publishReport('report-1')).resolves.toBeUndefined()
      expect(updateReportPublishStatus).toHaveBeenCalledWith(adminClient, 'report-1', true)
    })

    it('throws when updateReportPublishStatus fails', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(updateReportPublishStatus).mockResolvedValue({
        error: new Error('Publish failed'),
      } as any)

      await expect(publishReport('report-1')).rejects.toThrow('Gagal publish rapot')
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getClassReportsSummary
  // ─────────────────────────────────────────────────────────────────────────

  describe('getClassReportsSummary', () => {
    it('returns empty array when no enrollments found', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue([])

      const result = await getClassReportsSummary('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('returns empty array when all enrollments have null students', async () => {
      const enrollments = [{ student: null }, { student: null }]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(enrollments as any)
      vi.mocked(filterValidEnrollments).mockReturnValue([])

      const result = await getClassReportsSummary('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('returns empty array when no valid student IDs can be extracted', async () => {
      const enrollments = [{ student: { id: 'student-1' } }]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(enrollments as any)
      vi.mocked(filterValidEnrollments).mockReturnValue(enrollments as any)
      vi.mocked(extractStudentIds).mockReturnValue([])

      const result = await getClassReportsSummary('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('returns summary on happy path', async () => {
      const enrollments = [{ student: { id: 'student-1', name: 'Ahmad' } }]
      const reports = [{ id: 'report-1', student_id: 'student-1', is_published: true }]
      const reportMap = new Map([['student-1', reports[0]]])
      const summary = [{ student: { id: 'student-1' }, isGenerated: true, isPublished: true }]

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(enrollments as any)
      vi.mocked(filterValidEnrollments).mockReturnValue(enrollments as any)
      vi.mocked(extractStudentIds).mockReturnValue(['student-1'])
      vi.mocked(fetchClassReports).mockResolvedValue({ data: reports, error: null } as any)
      vi.mocked(buildReportMap).mockReturnValue(reportMap)
      vi.mocked(buildClassReportsSummary).mockReturnValue(summary as any)

      const result = await getClassReportsSummary('class-1', 'year-1', 1)

      expect(result).toEqual(summary)
      expect(buildReportMap).toHaveBeenCalledWith(reports)
      expect(buildClassReportsSummary).toHaveBeenCalledWith(enrollments, reportMap)
    })

    it('returns empty array when enrollments is null/undefined', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(null as any)

      const result = await getClassReportsSummary('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // getClassReportsBulk
  // ─────────────────────────────────────────────────────────────────────────

  describe('getClassReportsBulk', () => {
    it('returns empty array when no enrollments found', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue([])

      const result = await getClassReportsBulk('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('returns empty array when all enrollments have null students', async () => {
      const enrollments = [{ student: null }]
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(enrollments as any)
      vi.mocked(filterValidEnrollments).mockReturnValue([])

      const result = await getClassReportsBulk('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })

    it('returns bulk reports on happy path', async () => {
      const enrollments = [{ student: { id: 'student-1', name: 'Ahmad' }, class: { id: 'class-1' } }]
      const gradesData = { data: [{ student_id: 'student-1', score: 85 }] }
      const assessmentsData = { data: [] }
      const reportsData = { data: [{ student_id: 'student-1', id: 'report-1' }] }
      const gradesMap = { 'student-1': [{ score: 85 }] }
      const assessmentsMap = {}
      const reportsMap = new Map([['student-1', { id: 'report-1' }]])
      const bulkReports = [{ student: { id: 'student-1' }, grades: [], character_assessments: [] }]

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(enrollments as any)
      vi.mocked(filterValidEnrollments).mockReturnValue(enrollments as any)
      vi.mocked(extractStudentIds).mockReturnValue(['student-1'])
      vi.mocked(fetchBulkClassData).mockResolvedValue([gradesData, assessmentsData, reportsData] as any)
      vi.mocked(groupGradesByStudent).mockReturnValue(gradesMap)
      vi.mocked(groupAssessmentsByStudent).mockReturnValue(assessmentsMap)
      vi.mocked(buildReportMap).mockReturnValue(reportsMap)
      vi.mocked(buildBulkClassReports).mockReturnValue(bulkReports as any)

      const result = await getClassReportsBulk('class-1', 'year-1', 1)

      expect(result).toEqual(bulkReports)
      expect(fetchBulkClassData).toHaveBeenCalledWith(adminClient, ['student-1'], 'year-1', 1)
      expect(buildBulkClassReports).toHaveBeenCalledWith(enrollments, gradesMap, assessmentsMap, reportsMap)
    })

    it('returns empty array when enrollments is null', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(getClassEnrollments).mockResolvedValue(null as any)

      const result = await getClassReportsBulk('class-1', 'year-1', 1)

      expect(result).toEqual([])
    })
  })

  // ─────────────────────────────────────────────────────────────────────────
  // updateTemplateSubjects
  // ─────────────────────────────────────────────────────────────────────────

  describe('updateTemplateSubjects', () => {
    it('deletes existing subjects and inserts new ones', async () => {
      vi.mocked(prepareTemplateSubjects).mockReturnValue([{ template_id: 'template-1' }] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(deleteTemplateSubjects).mockResolvedValue({ error: null } as any)
      vi.mocked(insertTemplateSubjects).mockResolvedValue({ error: null } as any)

      await expect(updateTemplateSubjects('template-1', ['sub-1', 'sub-2'])).resolves.toBeUndefined()

      expect(deleteTemplateSubjects).toHaveBeenCalledWith(adminClient, 'template-1')
      expect(insertTemplateSubjects).toHaveBeenCalled()
    })

    it('only deletes when empty subject IDs array provided', async () => {
      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(deleteTemplateSubjects).mockResolvedValue({ error: null } as any)

      await updateTemplateSubjects('template-1', [])

      expect(deleteTemplateSubjects).toHaveBeenCalledWith(adminClient, 'template-1')
      expect(insertTemplateSubjects).not.toHaveBeenCalled()
    })

    it('throws when insertTemplateSubjects fails', async () => {
      vi.mocked(prepareTemplateSubjects).mockReturnValue([{}] as any)

      const adminClient = makeAdminSupabase()
      vi.mocked(createAdminClient).mockResolvedValue(adminClient)
      vi.mocked(deleteTemplateSubjects).mockResolvedValue({ error: null } as any)
      vi.mocked(insertTemplateSubjects).mockResolvedValue({ error: new Error('Insert failed') } as any)

      await expect(updateTemplateSubjects('template-1', ['sub-1'])).rejects.toThrow(
        'Gagal update mata pelajaran template'
      )
    })
  })
})
