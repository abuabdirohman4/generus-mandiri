-- Migration: Alter Existing Tables for New Rapot System
-- Description: Add necessary columns to existing tables
-- Date: 2025-12-10
--
-- Changes:
-- 1. student_material_progress: Add 'grade' column (A/B/C/D)
-- 2. student_reports: Add 'template_id', remove 'average_score'

BEGIN;

-- =============================================================================
-- 1. Add grade column to student_material_progress
-- =============================================================================
ALTER TABLE student_material_progress
  ADD COLUMN IF NOT EXISTS grade VARCHAR(5);

-- Add check constraint for valid grades
ALTER TABLE student_material_progress
  DROP CONSTRAINT IF EXISTS check_valid_grade;

ALTER TABLE student_material_progress
  ADD CONSTRAINT check_valid_grade
    CHECK (grade IS NULL OR grade IN ('A', 'B', 'C', 'D', 'A+', 'B+', 'C+', 'D+'));

-- Add comment for clarity
COMMENT ON COLUMN student_material_progress.grade IS 'Grade letter (A/B/C/D) - nullable, use when grading_format is ''grade'' or ''both''. Can be combined with nilai for dual grading.';

-- =============================================================================
-- 2. Add template_id to student_reports
-- =============================================================================
ALTER TABLE student_reports
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_reports_template
  ON student_reports(template_id);

-- Add comment
COMMENT ON COLUMN student_reports.template_id IS 'Links to the report template used for this report. NULL if using default/legacy format.';

-- =============================================================================
-- 3. Remove average_score (will be calculated dynamically)
-- =============================================================================
-- Note: Removing this column because average will be calculated on-the-fly
-- from student_material_progress based on template sections
ALTER TABLE student_reports
  DROP COLUMN IF EXISTS average_score;

COMMIT;
