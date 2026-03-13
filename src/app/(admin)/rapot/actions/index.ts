/**
 * Rapot Actions - Entry Point
 * Re-exports all actions for backward compatibility
 */

export {
  // Grading helpers
  calculateGradeFromScoreAction as calculateGradeFromScore,

  // Student grades
  getStudentGrades,
  bulkUpsertSectionGrades,
  updateGrade,
  bulkUpdateGrades,

  // Character assessments
  getCharacterAssessments,
  updateCharacterAssessment,

  // Report templates
  getReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  updateTemplateSubjects,
  getTemplateSubjects,

  // Report generation
  getStudentReport,
  generateReport,
  publishReport,
  getClassReportsSummary,
  getClassReportsBulk
} from './actions'
