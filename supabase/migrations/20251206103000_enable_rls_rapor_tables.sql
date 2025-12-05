-- Enable RLS for all new tables
ALTER TABLE report_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_template_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_character_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_reports ENABLE ROW LEVEL SECURITY;

-- Creating basic policies (Authenticated users can view, only authorized can edit - for now we might allow authenticated to modify if they are teachers/admins)
-- For simplicity in this phase, assuming all authenticated users (teachers/admins) can read/write these tables
-- You can refine specific policies later (e.g. strict teacher ownership)

-- 1. Report Subjects
CREATE POLICY "Enable read access for authenticated users" ON report_subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON report_subjects
    FOR ALL TO authenticated USING (true);


-- 2. Report Templates
CREATE POLICY "Enable read access for authenticated users" ON report_templates
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON report_templates
    FOR ALL TO authenticated USING (true);


-- 3. Report Template Subjects
CREATE POLICY "Enable read access for authenticated users" ON report_template_subjects
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON report_template_subjects
    FOR ALL TO authenticated USING (true);


-- 4. Student Grades
CREATE POLICY "Enable read access for authenticated users" ON student_grades
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON student_grades
    FOR ALL TO authenticated USING (true);


-- 5. Student Character Assessments
CREATE POLICY "Enable read access for authenticated users" ON student_character_assessments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON student_character_assessments
    FOR ALL TO authenticated USING (true);


-- 6. Student Reports
CREATE POLICY "Enable read access for authenticated users" ON student_reports
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable write access for authenticated users" ON student_reports
    FOR ALL TO authenticated USING (true);
