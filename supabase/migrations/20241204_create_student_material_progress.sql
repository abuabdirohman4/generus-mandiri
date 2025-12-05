-- Create student_material_progress table
-- FLEXIBLE: Supports both checkbox (hafal) and numeric scoring (nilai)
CREATE TABLE student_material_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_item_id UUID NOT NULL REFERENCES material_items(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  
  -- FLEXIBLE SCORING SYSTEM:
  hafal BOOLEAN DEFAULT false,  -- Quick checkbox: Hafal/Belum
  nilai INT CHECK (nilai >= 0 AND nilai <= 100),  -- Detailed score: 0-100
  -- Logic: If nilai exists, use nilai. If nilai is NULL, use hafal (true=100, false=0)
  
  notes TEXT, -- Kolom "Ket" untuk keterangan
  teacher_id UUID REFERENCES profiles(id),
  completion_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_progress UNIQUE(student_id, material_item_id, academic_year_id, semester)
);

-- Indexes for performance
CREATE INDEX idx_progress_student ON student_material_progress(student_id);
CREATE INDEX idx_progress_material ON student_material_progress(material_item_id);
CREATE INDEX idx_progress_year_semester ON student_material_progress(academic_year_id, semester);
CREATE INDEX idx_progress_hafal ON student_material_progress(hafal);
CREATE INDEX idx_progress_nilai ON student_material_progress(nilai);
CREATE INDEX idx_progress_teacher ON student_material_progress(teacher_id);

-- Enable RLS
ALTER TABLE student_material_progress ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated users to read progress"
  ON student_material_progress FOR SELECT
  TO authenticated
  USING (true);

-- Teachers can manage progress for their classes
CREATE POLICY "Teachers can manage their students progress"
  ON student_material_progress FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students s
      JOIN student_enrollments se ON se.student_id = s.id
      JOIN classes c ON c.id = se.class_id
      JOIN class_teachers ct ON ct.class_id = c.id
      WHERE s.id = student_material_progress.student_id
      AND ct.teacher_id = auth.uid()
    )
  );

-- Admins can manage all progress
CREATE POLICY "Admins can manage all progress"
  ON student_material_progress FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Trigger untuk update updated_at
CREATE TRIGGER update_student_material_progress_updated_at
  BEFORE UPDATE ON student_material_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
