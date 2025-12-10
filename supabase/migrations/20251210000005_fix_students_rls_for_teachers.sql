-- Migration: Fix Students Table RLS for Teachers with Multiple Kelompok
-- Description: Update RLS policy to allow teachers to access students from any class they teach,
--              regardless of kelompok. Teachers can teach classes in multiple kelompok.
-- Date: 2025-12-10

BEGIN;

-- =============================================================================
-- Drop existing RLS policies for students table (if any)
-- =============================================================================

-- Drop all existing policies on students table
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'students'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON students';
    END LOOP;
END $$;

-- =============================================================================
-- Create new RLS policies for students table
-- =============================================================================

-- Enable RLS on students table
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Policy 1: Superadmins can see all students
CREATE POLICY "Superadmins can access all students"
  ON students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'superadmin'
    )
  );

-- Policy 2: Admins can see students in their hierarchy
CREATE POLICY "Admins can access students in their hierarchy"
  ON students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND (
          -- Admin Daerah: can access all in their daerah
          (profiles.daerah_id IS NOT NULL 
           AND profiles.desa_id IS NULL 
           AND profiles.kelompok_id IS NULL
           AND students.daerah_id = profiles.daerah_id)
          OR
          -- Admin Desa: can access all in their desa
          (profiles.desa_id IS NOT NULL 
           AND profiles.kelompok_id IS NULL
           AND students.desa_id = profiles.desa_id)
          OR
          -- Admin Kelompok: can access all in their kelompok
          (profiles.kelompok_id IS NOT NULL
           AND students.kelompok_id = profiles.kelompok_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND (
          -- Admin Daerah: can manage all in their daerah
          (profiles.daerah_id IS NOT NULL 
           AND profiles.desa_id IS NULL 
           AND profiles.kelompok_id IS NULL
           AND students.daerah_id = profiles.daerah_id)
          OR
          -- Admin Desa: can manage all in their desa
          (profiles.desa_id IS NOT NULL 
           AND profiles.kelompok_id IS NULL
           AND students.desa_id = profiles.desa_id)
          OR
          -- Admin Kelompok: can manage all in their kelompok
          (profiles.kelompok_id IS NOT NULL
           AND students.kelompok_id = profiles.kelompok_id)
        )
    )
  );

-- Policy 3: Teachers can see students from classes they teach (via student_classes junction table)
-- This is the FIX for the issue where teachers teaching multiple kelompok cannot access students
CREATE POLICY "Teachers can access students from their classes"
  ON students
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
        AND EXISTS (
          -- Check if teacher teaches any class that this student is enrolled in
          -- via student_classes junction table
          SELECT 1 
          FROM teacher_classes tc
          INNER JOIN student_classes sc ON sc.class_id = tc.class_id
          WHERE tc.teacher_id = auth.uid()
            AND sc.student_id = students.id
        )
    )
  );

-- Policy 4: Teachers can update students from classes they teach
CREATE POLICY "Teachers can update students from their classes"
  ON students
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
        AND EXISTS (
          -- Check if teacher teaches any class that this student is enrolled in
          SELECT 1 
          FROM teacher_classes tc
          INNER JOIN student_classes sc ON sc.class_id = tc.class_id
          WHERE tc.teacher_id = auth.uid()
            AND sc.student_id = students.id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'teacher'
        AND EXISTS (
          -- Check if teacher teaches any class that this student is enrolled in
          SELECT 1 
          FROM teacher_classes tc
          INNER JOIN student_classes sc ON sc.class_id = tc.class_id
          WHERE tc.teacher_id = auth.uid()
            AND sc.student_id = students.id
        )
    )
  );

-- =============================================================================
-- Add indexes to improve RLS performance
-- =============================================================================

-- Index for faster teacher_classes lookup
CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id 
  ON teacher_classes(teacher_id);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id 
  ON teacher_classes(class_id);

-- Index for faster student_classes lookup
CREATE INDEX IF NOT EXISTS idx_student_classes_student_id 
  ON student_classes(student_id);

CREATE INDEX IF NOT EXISTS idx_student_classes_class_id 
  ON student_classes(class_id);

-- Index for hierarchy filtering
CREATE INDEX IF NOT EXISTS idx_students_daerah_id 
  ON students(daerah_id) WHERE daerah_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_desa_id 
  ON students(desa_id) WHERE desa_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_students_kelompok_id 
  ON students(kelompok_id) WHERE kelompok_id IS NOT NULL;

COMMIT;
