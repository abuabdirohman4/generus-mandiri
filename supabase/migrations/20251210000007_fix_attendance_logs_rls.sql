-- Migration: Fix Attendance Logs RLS for Teachers
-- Description: Update RLS policy to allow teachers to access attendance logs
--              for students in classes they teach, via student_classes junction
-- Date: 2025-12-10

BEGIN;

-- =============================================================================
-- Drop existing RLS policies for attendance_logs table
-- =============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'attendance_logs'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON attendance_logs';
    END LOOP;
END $$;

-- =============================================================================
-- Create new RLS policies for attendance_logs table
-- =============================================================================

-- Enable RLS on attendance_logs table
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;

-- Policy 1: Superadmins can see all attendance logs
CREATE POLICY "Superadmins can access all attendance logs"
  ON attendance_logs
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

-- Policy 2: Admins can see attendance logs in their hierarchy
CREATE POLICY "Admins can access attendance logs in their hierarchy"
  ON attendance_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN students ON students.id = attendance_logs.student_id
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND (
          -- Admin Daerah
          (profiles.daerah_id IS NOT NULL 
           AND profiles.desa_id IS NULL 
           AND profiles.kelompok_id IS NULL
           AND students.daerah_id = profiles.daerah_id)
          OR
          -- Admin Desa
          (profiles.desa_id IS NOT NULL 
           AND profiles.kelompok_id IS NULL
           AND students.desa_id = profiles.desa_id)
          OR
          -- Admin Kelompok
          (profiles.kelompok_id IS NOT NULL
           AND students.kelompok_id = profiles.kelompok_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      INNER JOIN students ON students.id = attendance_logs.student_id
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
        AND (
          -- Admin Daerah
          (profiles.daerah_id IS NOT NULL 
           AND profiles.desa_id IS NULL 
           AND profiles.kelompok_id IS NULL
           AND students.daerah_id = profiles.daerah_id)
          OR
          -- Admin Desa
          (profiles.desa_id IS NOT NULL 
           AND profiles.kelompok_id IS NULL
           AND students.desa_id = profiles.desa_id)
          OR
          -- Admin Kelompok
          (profiles.kelompok_id IS NOT NULL
           AND students.kelompok_id = profiles.kelompok_id)
        )
    )
  );

-- Policy 3: Teachers can see attendance logs for students in their classes
CREATE POLICY "Teachers can access attendance logs for their students"
  ON attendance_logs
  FOR SELECT
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
            AND sc.student_id = attendance_logs.student_id
        )
    )
  );

-- Policy 4: Teachers can update attendance logs for students in their classes
CREATE POLICY "Teachers can update attendance logs for their students"
  ON attendance_logs
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
            AND sc.student_id = attendance_logs.student_id
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
            AND sc.student_id = attendance_logs.student_id
        )
    )
  );

-- Policy 5: Teachers can insert attendance logs for students in their classes
CREATE POLICY "Teachers can insert attendance logs for their students"
  ON attendance_logs
  FOR INSERT
  TO authenticated
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
            AND sc.student_id = attendance_logs.student_id
        )
    )
  );

-- =============================================================================
-- Add indexes for better performance
-- =============================================================================

-- Index for faster attendance_logs lookup by student_id
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id 
  ON attendance_logs(student_id);

-- Index for faster date range queries
CREATE INDEX IF NOT EXISTS idx_attendance_logs_date 
  ON attendance_logs(date);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_date 
  ON attendance_logs(student_id, date);

COMMIT;
