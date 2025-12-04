-- Create student_enrollments table
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'transferred', 'dropped')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_enrollment UNIQUE(student_id, academic_year_id, semester)
);

-- Indexes for performance
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON student_enrollments(class_id);
CREATE INDEX idx_enrollments_year ON student_enrollments(academic_year_id);
CREATE INDEX idx_enrollments_semester ON student_enrollments(semester);
CREATE INDEX idx_enrollments_active ON student_enrollments(status) WHERE status = 'active';

-- Enable RLS
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read enrollments
CREATE POLICY "Allow authenticated users to read enrollments"
  ON student_enrollments FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage enrollments
CREATE POLICY "Only admins can manage enrollments"
  ON student_enrollments FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
