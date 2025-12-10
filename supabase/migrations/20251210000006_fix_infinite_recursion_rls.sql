-- Migration: Fix Infinite Recursion in Students RLS Policy
-- Description: Remove RLS from student_classes table to break circular dependency
--              student_classes is a junction table and doesn't need RLS since
--              access is controlled by the students and classes tables
-- Date: 2025-12-10

BEGIN;

-- =============================================================================
-- Disable RLS on student_classes table to prevent infinite recursion
-- =============================================================================

-- Drop all existing RLS policies on student_classes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'student_classes'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON student_classes';
    END LOOP;
END $$;

-- Disable RLS on student_classes table
-- Junction tables typically don't need RLS because access is controlled by parent tables
ALTER TABLE student_classes DISABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Similarly, disable RLS on teacher_classes if it exists
-- =============================================================================

DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'teacher_classes'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON teacher_classes';
    END LOOP;
END $$;

-- Disable RLS on teacher_classes table
ALTER TABLE teacher_classes DISABLE ROW LEVEL SECURITY;

COMMIT;
