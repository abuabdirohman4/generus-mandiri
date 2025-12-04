-- Create academic_years table
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(20) NOT NULL UNIQUE,
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_year_range UNIQUE(start_year, end_year),
  CONSTRAINT valid_year_range CHECK (end_year = start_year + 1)
);

-- Indexes for performance
CREATE INDEX idx_academic_years_active ON academic_years(is_active) WHERE is_active = true;
CREATE INDEX idx_academic_years_dates ON academic_years(start_date, end_date);

-- Enable RLS
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read academic years
CREATE POLICY "Allow authenticated users to read academic years"
  ON academic_years FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage academic years
CREATE POLICY "Only admins can manage academic years"
  ON academic_years FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Seed initial data (current academic year)
INSERT INTO academic_years (name, start_year, end_year, start_date, end_date, is_active)
VALUES 
  ('2024/2025', 2024, 2025, '2024-07-01', '2025-06-30', true);
