-- Migration: Cleanup Old Rapot Tables
-- Description: Remove deprecated tables before building new structure
-- Date: 2025-12-10
-- IMPORTANT: This will delete all data in these tables
--
-- Tables being dropped:
-- 1. report_template_subjects (2 rows)
-- 2. report_subjects (2 rows)
-- 3. student_character_assessments (0 rows)
-- 4. student_grades (1 row)
-- 5. material_templates (0 rows)

BEGIN;

-- Drop in correct order (dependencies first)
-- Junction table first
DROP TABLE IF EXISTS report_template_subjects CASCADE;

-- Then the main tables
DROP TABLE IF EXISTS report_subjects CASCADE;
DROP TABLE IF EXISTS student_character_assessments CASCADE;
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS material_templates CASCADE;

COMMIT;
