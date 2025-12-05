-- 1. Tabel report_subjects (Konfigurasi Subject untuk Rapot)
CREATE TABLE IF NOT EXISTS report_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_type_id UUID NOT NULL REFERENCES material_types(id),
  display_name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  display_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT true,
  grading_type VARCHAR(20) DEFAULT 'numeric' CHECK (grading_type IN ('numeric', 'letter', 'both')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed defaults for report_subjects (Attempt to link with existing types based on name pattern)
INSERT INTO report_subjects (material_type_id, display_name, code, display_order, grading_type)
SELECT id, 'Bacaan Al Quran', 'bacaan_quran', 1, 'both'
FROM material_types WHERE name ILIKE '%Bacaan%' LIMIT 1
ON CONFLICT (code) DO NOTHING;

INSERT INTO report_subjects (material_type_id, display_name, code, display_order, grading_type)
SELECT id, 'Hafalan Juz 30', 'hafalan_juz30', 2, 'both'
FROM material_types WHERE name ILIKE '%Hafalan%' LIMIT 1
ON CONFLICT (code) DO NOTHING;

INSERT INTO report_subjects (material_type_id, display_name, code, display_order, grading_type)
SELECT id, 'Tulis Arab (Imla)', 'tulis_arab', 3, 'both'
FROM material_types WHERE name ILIKE '%Imla%' OR name ILIKE '%Tulis%' LIMIT 1
ON CONFLICT (code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_report_subjects_material_type ON report_subjects(material_type_id);
CREATE INDEX IF NOT EXISTS idx_report_subjects_active ON report_subjects(is_active) WHERE is_active = true;


-- 2. Tabel report_templates (Konfigurasi Rapot)
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  class_id UUID REFERENCES classes(id), -- NULL = template global
  academic_year_id UUID REFERENCES academic_years(id), -- NULL = berlaku semua tahun
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_template_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES report_subjects(id),
  is_required BOOLEAN DEFAULT true,
  display_order INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_template_subject UNIQUE(template_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_templates_class ON report_templates(class_id);
CREATE INDEX IF NOT EXISTS idx_templates_year ON report_templates(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_template_subjects_template ON report_template_subjects(template_id);


-- 3. Tabel student_grades
CREATE TABLE IF NOT EXISTS student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES report_subjects(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  score DECIMAL(5,2),
  grade VARCHAR(5),
  description TEXT,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_grade UNIQUE(student_id, subject_id, academic_year_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_grades_student ON student_grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject ON student_grades(subject_id);
CREATE INDEX IF NOT EXISTS idx_grades_year_semester ON student_grades(academic_year_id, semester);


-- 4. Tabel student_character_assessments
CREATE TABLE IF NOT EXISTS student_character_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  character_aspect VARCHAR(100) NOT NULL,
  grade VARCHAR(5),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_character UNIQUE(student_id, academic_year_id, semester, character_aspect)
);


-- 5. Tabel student_reports
CREATE TABLE IF NOT EXISTS student_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  class_id UUID NOT NULL REFERENCES classes(id),
  average_score DECIMAL(5,2),
  class_rank INT,
  attendance_percentage DECIMAL(5,2),
  sick_days INT DEFAULT 0,
  permission_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,
  teacher_notes TEXT,
  teacher_id UUID REFERENCES profiles(id),
  generated_at TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_report UNIQUE(student_id, academic_year_id, semester)
);

CREATE INDEX IF NOT EXISTS idx_reports_student ON student_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_reports_year_semester ON student_reports(academic_year_id, semester);
CREATE INDEX IF NOT EXISTS idx_reports_published ON student_reports(is_published) WHERE is_published = true;
