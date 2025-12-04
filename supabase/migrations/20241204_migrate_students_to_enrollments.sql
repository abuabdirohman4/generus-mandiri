-- Migrate existing students to enrollments for active academic year
-- This script safely migrates existing student-class relationships to the new enrollment system

INSERT INTO student_enrollments (student_id, class_id, academic_year_id, semester, status)
SELECT 
  s.id,
  s.class_id,
  (SELECT id FROM academic_years WHERE is_active = true LIMIT 1),
  1, -- Default to semester 1
  'active'
FROM students s
WHERE s.deleted_at IS NULL
  AND s.class_id IS NOT NULL
ON CONFLICT (student_id, academic_year_id, semester) DO NOTHING;
