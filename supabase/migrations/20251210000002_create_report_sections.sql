-- Migration: Create Report Sections Tables
-- Description: Flexible section-based rapot template system
-- Date: 2025-12-10
--
-- New Architecture:
-- report_templates (existing)
--   ↓ has many
-- report_sections (NEW) - Sections like "Nilai Akademik", "Akhlak Luhur", "Ekstrakurikuler"
--   ↓ has many
-- report_section_items (NEW) - Flexible link to material_categories/types/items

BEGIN;

-- =============================================================================
-- Table 1: Report Sections
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  -- Section info
  name VARCHAR(100) NOT NULL,
  -- Examples: "Nilai Akademik", "Nilai-nilai Luhur", "Ekstrakurikuler"

  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Grading format for this section
  grading_format VARCHAR(20) NOT NULL DEFAULT 'score',
  -- Options:
  --   'score'  - Numeric 0-100 (uses student_material_progress.nilai)
  --   'grade'  - Letter A/B/C/D (uses student_material_progress.grade)
  --   'hafal'  - Boolean checklist (uses student_material_progress.hafal)
  --   'both'   - Score + Grade (uses both nilai and grade)

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_grading_format
    CHECK (grading_format IN ('score', 'grade', 'hafal', 'both'))
);

-- =============================================================================
-- Table 2: Report Section Items (Flexible material selection)
-- =============================================================================
CREATE TABLE IF NOT EXISTS report_section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,

  -- Flexible material linking (only ONE should be filled, others NULL)
  -- This allows admin to select from any level of material hierarchy
  material_category_id UUID REFERENCES material_categories(id) ON DELETE CASCADE,
  material_type_id UUID REFERENCES material_types(id) ON DELETE CASCADE,
  material_item_id UUID REFERENCES material_items(id) ON DELETE CASCADE,

  -- Display options
  display_order INTEGER NOT NULL DEFAULT 0,
  custom_name VARCHAR(200), -- Optional override for display name
  is_required BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraint: Ensure exactly ONE material reference is set
  CONSTRAINT check_exactly_one_material
    CHECK (
      -- Case 1: Only category
      (material_category_id IS NOT NULL AND material_type_id IS NULL AND material_item_id IS NULL) OR
      -- Case 2: Only type
      (material_category_id IS NULL AND material_type_id IS NOT NULL AND material_item_id IS NULL) OR
      -- Case 3: Only item
      (material_category_id IS NULL AND material_type_id IS NULL AND material_item_id IS NOT NULL)
    )
);

-- =============================================================================
-- Indexes for performance
-- =============================================================================
CREATE INDEX idx_report_sections_template ON report_sections(template_id);
CREATE INDEX idx_report_sections_order ON report_sections(template_id, display_order);

CREATE INDEX idx_report_section_items_section ON report_section_items(section_id);
CREATE INDEX idx_report_section_items_order ON report_section_items(section_id, display_order);
CREATE INDEX idx_report_section_items_category ON report_section_items(material_category_id);
CREATE INDEX idx_report_section_items_type ON report_section_items(material_type_id);
CREATE INDEX idx_report_section_items_item ON report_section_items(material_item_id);

-- =============================================================================
-- Enable Row Level Security
-- =============================================================================
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_section_items ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS Policies: Allow read for authenticated users
-- =============================================================================
CREATE POLICY "Allow read report_sections for authenticated users"
  ON report_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read report_section_items for authenticated users"
  ON report_section_items FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- RLS Policies: Allow write for admins
-- TODO: Adjust these policies based on your existing admin RLS patterns
-- You may want to restrict to specific roles like 'admin' or 'superadmin'
-- =============================================================================

-- For now, allowing all authenticated users to write (adjust as needed)
CREATE POLICY "Allow insert report_sections for authenticated users"
  ON report_sections FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update report_sections for authenticated users"
  ON report_sections FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete report_sections for authenticated users"
  ON report_sections FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert report_section_items for authenticated users"
  ON report_section_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update report_section_items for authenticated users"
  ON report_section_items FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow delete report_section_items for authenticated users"
  ON report_section_items FOR DELETE
  TO authenticated
  USING (true);

-- =============================================================================
-- Comments for documentation
-- =============================================================================
COMMENT ON TABLE report_sections IS 'Sections within a report template (e.g., Akademik, Karakter, Ekskul)';
COMMENT ON COLUMN report_sections.grading_format IS 'Determines which field to use from student_material_progress: score (nilai), grade (A/B/C/D), hafal (boolean), or both';

COMMENT ON TABLE report_section_items IS 'Items included in each section - flexible link to any level of material hierarchy';
COMMENT ON COLUMN report_section_items.material_category_id IS 'Link to category level (e.g., entire "Hafalan" category)';
COMMENT ON COLUMN report_section_items.material_type_id IS 'Link to type level (e.g., "Do''a-do''a" type)';
COMMENT ON COLUMN report_section_items.material_item_id IS 'Link to item level (e.g., specific "Do''a perlindungan")';

COMMIT;
