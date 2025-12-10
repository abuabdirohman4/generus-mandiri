# Implementation Plan: Rapot Integration - Clean Redesign

## Document Info
- **Created**: 2025-12-10
- **Updated**: 2025-12-10
- **Project**: Generus Mandiri School Management System
- **Task**: Redesign Rapot System with Material Integration + Student Biodata
- **Status**: Ready for Implementation
- **Strategy**: Clean Start (Delete old tables, build new structure)

---

## Table of Contents
1. [Overview](#overview)
2. [Key Decisions](#key-decisions)
3. [Database Architecture](#database-architecture)
4. [Implementation Phases](#implementation-phases)
5. [Step-by-Step Instructions](#step-by-step-instructions)
6. [Testing Checklist](#testing-checklist)

---

## Overview

### Goal
Redesign Rapot (Report Card) system dengan integrasi penuh ke sistem Materi yang sudah ada:

1. **Single Source of Truth**: `student_material_progress` sebagai satu-satunya table untuk semua nilai
2. **Flexible Template System**: Admin bisa buat template rapot dengan section fleksibel
3. **Material Integration**: Link langsung ke material hierarchy (category/type/item)
4. **Auto-sync Attendance**: Kehadiran otomatis sinkron dari `attendance_logs`
5. **Complete Biodata**: 15 field biodata siswa lengkap

### Architecture Pattern
- Next.js 15 App Router with Server Actions
- Supabase PostgreSQL with RLS
- SWR for data fetching with persistent cache
- Zustand for state management
- React-PDF for report generation

---

## Key Decisions

### ✅ Confirmed by User

1. **Delete Old Tables** (dengan data yang ada):
   - ❌ `student_grades` (diganti dengan `student_material_progress`)
   - ❌ `student_character_assessments` (Nilai Luhur sudah ada di materi)
   - ❌ `report_subjects` (redundant dengan materi)
   - ❌ `report_template_subjects` (diganti struktur baru)
   - ❌ `material_templates` (tidak terpakai)

2. **Single Source of Truth**:
   - ✅ `student_material_progress` untuk SEMUA nilai (akademik, karakter, ekstrakurikuler)
   - ✅ Support 3 format penilaian: `hafal` (boolean), `nilai` (0-100), `grade` (A/B/C/D)

3. **Flexible Template System**:
   - ✅ Admin bisa pilih materi dari level mana saja (category/type/item)
   - ✅ Template punya section yang bisa dikonfigurasi (Akademik, Karakter, Ekskul, dll)
   - ✅ Tiap section bisa tentukan format penilaiannya

4. **Material Integration**:
   - ✅ Nilai Luhur sudah ada di materi (kategori Akhlakul Karimah)
   - ✅ Ekstrakurikuler sudah ada di materi (kategori Ekstra Kulikuler)
   - ✅ Monitoring page = Input nilai ke `student_material_progress`
   - ✅ Rapot page = Baca nilai dari `student_material_progress` (filtered by template)

5. **Implementation Strategy**:
   - ✅ Clean Start - Hapus data lama, build dari 0
   - ✅ Development/Testing environment (bukan production)

---

## Database Architecture

### Current State (What We Have)

**Materi System** (Already exists - GOOD):
```
material_categories (7 rows) - Kategori: Hafalan, Faqih, Akhlakul Karimah, Ekstra Kulikuler, dll
  ↓
material_types (16 rows) - Tipe: Do'a-do'a, Surat Pendek, Nilai Nilai Luhur, dll
  ↓
material_items (334 rows) - Items: Do'a perlindungan, Surat Al-Fajr, Jujur, Persinas ASAD, dll
```

**Student Progress** (Already exists - GOOD):
```
student_material_progress (3 rows)
- student_id, material_item_id
- academic_year_id, semester
- hafal (boolean), nilai (0-100), notes
- teacher_id, completion_date
```

**Attendance System** (Already exists - GOOD):
```
attendance_logs (4717 rows)
- student_id, meeting_id, date
- status (H/I/S/A)
```

**Old Rapot Tables** (TO BE DELETED):
```
❌ student_grades (1 row) - Nilai per subject
❌ student_character_assessments (0 rows) - Penilaian karakter terpisah
❌ report_subjects (2 rows) - Subject definitions
❌ report_template_subjects (2 rows) - Junction table
❌ material_templates (0 rows) - Unused
```

**Keep These Tables** (Will be updated):
```
✅ report_templates (1 row) - Template rapot
✅ student_reports (1 row) - Summary rapot per siswa
✅ students - Akan ditambah 15 field biodata
```

---

### New Architecture (What We Will Build)

```
┌─────────────────────────────────────────────────────────────┐
│                    RAPOT SYSTEM ARCHITECTURE                 │
└─────────────────────────────────────────────────────────────┘

[1] TEMPLATE CONFIGURATION (Admin Setup)
    ┌─────────────────────┐
    │ report_templates    │ Template rapot per academic year/class
    │ - name, class_id    │
    │ - academic_year_id  │
    └──────────┬──────────┘
               │ has many
               ↓
    ┌─────────────────────┐
    │ report_sections     │ Section: Akademik, Karakter, Ekskul
    │ - name, order       │
    │ - grading_format    │ (score/grade/hafal)
    └──────────┬──────────┘
               │ has many
               ↓
    ┌──────────────────────────┐
    │ report_section_items     │ Item materi yang masuk rapot
    │ - material_category_id?  │ (nullable - flexible level)
    │ - material_type_id?      │
    │ - material_item_id?      │
    │ - order                  │
    └──────────────────────────┘

[2] DATA INPUT (Teacher/Monitoring)
    ┌──────────────────────────────┐
    │ student_material_progress    │ SINGLE SOURCE OF TRUTH
    │ - student_id                 │
    │ - material_item_id           │
    │ - academic_year_id, semester │
    │ - hafal (boolean)            │ ← Format 1: Checklist
    │ - nilai (0-100)              │ ← Format 2: Score
    │ - grade (A/B/C/D) [NEW]      │ ← Format 3: Grade
    │ - notes, teacher_id          │
    └──────────────────────────────┘

[3] OUTPUT (Rapot Display & PDF)
    ┌─────────────────────┐
    │ student_reports     │ Summary per student
    │ - student_id        │
    │ - template_id [NEW] │ ← Link to which template used
    │ - academic_year_id  │
    │ - semester          │
    │ - class_rank        │
    │ - sick_days, etc    │ ← From attendance_logs
    │ - teacher_notes     │
    │ - is_published      │
    └─────────────────────┘

[4] BIODATA (Student Info)
    ┌─────────────────────┐
    │ students            │ Extended with 15 new fields
    │ - name, gender      │
    │ - nomor_induk [NEW] │
    │ - tempat_lahir      │
    │ - tanggal_lahir     │
    │ - anak_ke           │
    │ - alamat, telepon   │
    │ - nama_ayah/ibu     │
    │ - pekerjaan_ortu    │
    │ - wali info         │
    └─────────────────────┘
```

---

### Database Changes Summary

**DROP Tables** (5 tables):
```sql
DROP TABLE IF EXISTS report_template_subjects CASCADE;
DROP TABLE IF EXISTS report_subjects CASCADE;
DROP TABLE IF EXISTS student_character_assessments CASCADE;
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS material_templates CASCADE;
```

**CREATE Tables** (2 new tables):
```sql
CREATE TABLE report_sections (...);
CREATE TABLE report_section_items (...);
```

**ALTER Tables** (3 tables):
```sql
ALTER TABLE student_material_progress ADD COLUMN grade VARCHAR(5);
ALTER TABLE student_reports ADD COLUMN template_id UUID REFERENCES report_templates(id);
ALTER TABLE students ADD COLUMN nomor_induk VARCHAR(50), ... (15 fields);
```

**UPDATE Tables** (1 table):
```sql
UPDATE report_templates ... (adjust structure if needed)
```

---

## User Requirements

### A. Student Biodata (15 fields total)
From image.png:
1. Nama Peserta Didik (Lengkap)
2. Nomor Induk
3. Tempat Tanggal Lahir
4. Jenis Kelamin
5. Anak ke
6. Alamat Peserta Didik
7. Nomor Telepon Rumah
8. Nama Orang Tua (Ayah & Ibu)
9. Alamat Orang Tua
10. Nomor Telepon Rumah (Orang Tua)
11. Pekerjaan Orang Tua (Ayah & Ibu)
12. Nama Wali Peserta Didik
13. Alamat Wali
14. Pekerjaan Wali

### B. Character Values (13 Nilai Luhur)
From B.png:
1. Jujur
2. Amanah
3. Berhemat
4. Disiplin
5. Rasa tanggung jawab
6. Kesyukuran
7. Kreatifitas/Kesungguhan
8. Praktek mengagungkan
9. Rukun
10. Kompak
11. Kerjasama yang baik
12. Peduli lingkungan
13. Cinta jama'ah

### C. Extracurricular Activities
From C.png:
- PERSINAS ASAD
- BCM (Bermain Cerita dan Menyanyi)
- FUTSAL
- TAHFIDZ
- Grading: A/B/C/D with notes

### D. Academic Grades (From Materi Hierarchy)
From A.png:
1. Aqidah Akhlak
2. Fiqih/Praktik Ibadah
3. Bacaan Al-Qur'an juz 7 & 8
4. **Hafalan** (with sub-items):
   - Asmaul Husna no 1-99
   - Do'a perlindungan dari penganiayaan
   - Do'a ketika takut pada orang kafir
   - Do'a ketika bertempat ditempat baru
   - Do'a ketika bermimpi baik dan jelek
   - Surat Al-Fajr
   - Surat Al-Ghasyiyah
5. **Dalil-dalil** (with sub-items):
   - Akhlaqul Karimah
   - Alim-Faqih
   - Mandiri
   - Rukun
6. Pegon
7. Imla' (Menulis Arab)
8. Tajwid

---

## Current State Analysis

### Existing Database Tables
```
✓ students               - Has basic info, MISSING biodata fields
✓ attendance_logs        - Has status (H/I/S/A), date, student_id
✓ material_categories    - Category hierarchy
✓ material_types         - Type hierarchy
✓ material_items         - Individual items
✓ report_subjects        - Links material_type_id
✓ student_grades         - Score, grade per subject
✓ student_character_assessments - Only 4 aspects (need 13)
✓ student_reports        - Summary with attendance
```

### Missing Components
1. **Database**: 15 biodata columns in `students`
2. **Database**: `character_value_aspects` table (13 values)
3. **Database**: `student_character_values` table
4. **Database**: `extracurricular_activities` table
5. **Database**: `student_extracurriculars` table
6. **UI**: Student profile view component
7. **UI**: Student biodata edit modal
8. **Logic**: Attendance sync function
9. **Logic**: Material-to-subject mapping
10. **Logic**: Character values CRUD
11. **Logic**: Extracurricular CRUD
12. **PDF**: Updated report template

---

## Implementation Phases

### Overview
Total: **6 Phases** (Simplified from original 7 phases)

1. **Phase 1**: Database Cleanup & Migration (DELETE old + CREATE new)
2. **Phase 2**: Student Biodata (15 fields biodata siswa)
3. **Phase 3**: Template Management UI (Admin setup rapot template)
4. **Phase 4**: Grade Input Integration (Link Monitoring → student_material_progress)
5. **Phase 5**: Rapot Display & PDF (Read from material_progress, show by template)
6. **Phase 6**: Attendance Auto-sync (attendance_logs → student_reports)

---

### Phase 1: Database Cleanup & Migration ⚠️ CRITICAL

**Goal**: Hapus table lama, buat struktur baru

**Steps**:
1. Drop 5 old tables
2. Create 2 new tables (`report_sections`, `report_section_items`)
3. Alter 3 existing tables (add columns)
4. Seed default data (if any)

**Estimated Time**: 30 minutes
**Dependency**: None
**Risk**: Medium (data loss - acceptable per user confirmation)

---

### Phase 2: Student Biodata

**Goal**: Input & display biodata lengkap siswa

**Steps**:
1. Create types for biodata
2. Update student actions (getStudentBiodata, updateStudentBiodata)
3. Create StudentProfileView component
4. Create StudentBiodataModal component
5. Integrate into Siswa page

**Estimated Time**: 2-3 hours
**Dependency**: Phase 1 complete
**Risk**: Low

---

### Phase 3: Template Management UI

**Goal**: Admin bisa buat/edit template rapot dengan section fleksibel

**Steps**:
1. Create template types & interfaces
2. Build template CRUD actions
3. Create TemplateBuilder UI (drag-drop sections)
4. Create MaterialSelector (pilih dari category/type/item)
5. Create SectionConfig (nama, format penilaian, order)

**Estimated Time**: 4-6 hours
**Dependency**: Phase 1 complete
**Risk**: High (complex UI)

---

### Phase 4: Grade Input Integration

**Goal**: Guru input nilai di Monitoring, tersimpan di student_material_progress

**Steps**:
1. Update existing Monitoring page (if exists)
2. Support 3 format input: hafal/nilai/grade
3. Add validation & auto-save
4. Link to academic year & semester

**Estimated Time**: 2-3 hours
**Dependency**: Phase 1 complete
**Risk**: Medium (might need UI redesign)

---

### Phase 5: Rapot Display & PDF

**Goal**: Tampilkan rapot per siswa berdasarkan template, generate PDF

**Steps**:
1. Create rapot display actions (read from material_progress filtered by template)
2. Build RapotView component (group by section)
3. Calculate averages, rankings
4. Update PDF template with new structure
5. Support biodata, grades, attendance in PDF

**Estimated Time**: 4-5 hours
**Dependency**: Phase 2, 3, 4 complete
**Risk**: High (complex data aggregation)

---

### Phase 6: Attendance Auto-sync

**Goal**: Kehadiran otomatis sinkron dari attendance_logs ke student_reports

**Steps**:
1. Create attendance summary function (count H/I/S/A)
2. Add "Sync Attendance" button in rapot
3. Auto-populate sick_days, permission_days, absent_days
4. Calculate attendance percentage

**Estimated Time**: 1-2 hours
**Dependency**: Phase 5 complete
**Risk**: Low

---

### Priority Order (Recommended)

1. ⚠️ **Phase 1** (MUST DO FIRST - breaks everything if not done)
2. 🟢 **Phase 2** (Independent, can do parallel)
3. 🔴 **Phase 3** (Critical for template system)
4. 🟡 **Phase 4** (Depends on how Monitoring currently works)
5. 🔴 **Phase 5** (Depends on Phase 3 & 4)
6. 🟢 **Phase 6** (Quick win, can do last)

---

## Step-by-Step Instructions

---

## PHASE 1: Database Cleanup & Migration

### Step 1.1: Drop Old Tables

**File to Create**: `supabase/migrations/20251210_cleanup_old_rapot_tables.sql`

```sql
-- Migration: Cleanup Old Rapot Tables
-- Description: Remove deprecated tables before building new structure
-- Date: 2025-12-10
-- IMPORTANT: This will delete all data in these tables

BEGIN;

-- Drop in correct order (dependencies first)
DROP TABLE IF EXISTS report_template_subjects CASCADE;
DROP TABLE IF EXISTS report_subjects CASCADE;
DROP TABLE IF EXISTS student_character_assessments CASCADE;
DROP TABLE IF EXISTS student_grades CASCADE;
DROP TABLE IF EXISTS material_templates CASCADE;

COMMIT;
```

**How to Apply**:
```bash
# Using Supabase CLI
supabase db push

# OR using MCP tool
# Call: mcp__generus-mandiri-v2__apply_migration
# Params: { name: "cleanup_old_rapot_tables", query: "<SQL above>" }
```

---

### Step 1.2: Create New Tables

**File to Create**: `supabase/migrations/20251210_create_report_sections.sql`

```sql
-- Migration: Create Report Sections Tables
-- Description: Flexible section-based rapot template system
-- Date: 2025-12-10

BEGIN;

-- Table 1: Report Sections
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,

  -- Section info
  name VARCHAR(100) NOT NULL, -- "Nilai Akademik", "Akhlak Luhur", "Ekstrakurikuler"
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,

  -- Grading format for this section
  grading_format VARCHAR(20) NOT NULL DEFAULT 'score',
  -- Options: 'score' (0-100), 'grade' (A/B/C/D), 'hafal' (boolean), 'both' (score+grade)

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT check_grading_format
    CHECK (grading_format IN ('score', 'grade', 'hafal', 'both'))
);

-- Table 2: Report Section Items (Flexible material selection)
CREATE TABLE IF NOT EXISTS report_section_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES report_sections(id) ON DELETE CASCADE,

  -- Flexible material linking (only ONE should be filled, others NULL)
  material_category_id UUID REFERENCES material_categories(id) ON DELETE CASCADE,
  material_type_id UUID REFERENCES material_types(id) ON DELETE CASCADE,
  material_item_id UUID REFERENCES material_items(id) ON DELETE CASCADE,

  -- Display options
  display_order INTEGER NOT NULL DEFAULT 0,
  custom_name VARCHAR(200), -- Optional override for display name
  is_required BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure at least ONE material reference is set
  CONSTRAINT check_at_least_one_material
    CHECK (
      (material_category_id IS NOT NULL AND material_type_id IS NULL AND material_item_id IS NULL) OR
      (material_category_id IS NULL AND material_type_id IS NOT NULL AND material_item_id IS NULL) OR
      (material_category_id IS NULL AND material_type_id IS NULL AND material_item_id IS NOT NULL)
    )
);

-- Indexes for performance
CREATE INDEX idx_report_sections_template ON report_sections(template_id);
CREATE INDEX idx_report_sections_order ON report_sections(display_order);
CREATE INDEX idx_report_section_items_section ON report_section_items(section_id);
CREATE INDEX idx_report_section_items_category ON report_section_items(material_category_id);
CREATE INDEX idx_report_section_items_type ON report_section_items(material_type_id);
CREATE INDEX idx_report_section_items_item ON report_section_items(material_item_id);

-- Enable RLS
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_section_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow read for authenticated users
CREATE POLICY "Allow read report_sections for authenticated users"
  ON report_sections FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read report_section_items for authenticated users"
  ON report_section_items FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies: Allow write for admins (adjust based on your RLS pattern)
-- TODO: Add admin write policies based on existing patterns

COMMIT;
```

---

### Step 1.3: Alter Existing Tables

**File to Create**: `supabase/migrations/20251210_alter_existing_tables.sql`

```sql
-- Migration: Alter Existing Tables for New Rapot System
-- Description: Add necessary columns to existing tables
-- Date: 2025-12-10

BEGIN;

-- 1. Add grade column to student_material_progress
ALTER TABLE student_material_progress
  ADD COLUMN IF NOT EXISTS grade VARCHAR(5);

-- Add comment for clarity
COMMENT ON COLUMN student_material_progress.grade IS 'Grade letter (A/B/C/D) - nullable, use when grading_format is grade or both';

-- 2. Add template_id to student_reports
ALTER TABLE student_reports
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL;

-- Add index
CREATE INDEX IF NOT EXISTS idx_student_reports_template
  ON student_reports(template_id);

-- Add comment
COMMENT ON COLUMN student_reports.template_id IS 'Links to the report template used for this report';

-- 3. Remove average_score (will be calculated dynamically)
ALTER TABLE student_reports
  DROP COLUMN IF EXISTS average_score;

COMMIT;
```

---

### Step 1.4: Add Student Biodata Columns

**File to Create**: `supabase/migrations/20251210_add_student_biodata.sql`

```sql
-- Migration: Add Student Biodata Fields
-- Description: Add 15 new columns to students table for complete biodata
-- Date: 2025-12-09

BEGIN;

-- Add student identity fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nomor_induk VARCHAR(50),
  ADD COLUMN IF NOT EXISTS tempat_lahir TEXT,
  ADD COLUMN IF NOT EXISTS tanggal_lahir DATE,
  ADD COLUMN IF NOT EXISTS anak_ke INTEGER;

-- Add student contact fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS alamat TEXT,
  ADD COLUMN IF NOT EXISTS nomor_telepon VARCHAR(20);

-- Add parent fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nama_ayah TEXT,
  ADD COLUMN IF NOT EXISTS nama_ibu TEXT,
  ADD COLUMN IF NOT EXISTS alamat_orangtua TEXT,
  ADD COLUMN IF NOT EXISTS telepon_orangtua VARCHAR(20),
  ADD COLUMN IF NOT EXISTS pekerjaan_ayah TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_ibu TEXT;

-- Add guardian fields
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS nama_wali TEXT,
  ADD COLUMN IF NOT EXISTS alamat_wali TEXT,
  ADD COLUMN IF NOT EXISTS pekerjaan_wali TEXT;

-- Add index for nomor_induk (frequently queried)
CREATE INDEX IF NOT EXISTS idx_students_nomor_induk ON students(nomor_induk);

COMMIT;
```

**How to Apply**:
```bash
# Using Supabase CLI
supabase db push

# OR using MCP tool (if available)
# Call: mcp__generus-mandiri-v2__apply_migration
# Params: { name: "add_student_biodata", query: "<SQL above>" }
```

---

### Step 1.2: Create Character Values Tables

**File to Create**: `supabase/migrations/20251209_create_character_values.sql`

```sql
-- Migration: Create Character Values Tables
-- Description: Tables for 13 "Nilai-nilai Luhur" character assessments
-- Date: 2025-12-09

BEGIN;

-- Master table: 13 Character Value Aspects
CREATE TABLE IF NOT EXISTS character_value_aspects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure unique names
  CONSTRAINT unique_character_value_name UNIQUE(name)
);

-- Student character values per semester
CREATE TABLE IF NOT EXISTS student_character_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  aspect_id UUID NOT NULL REFERENCES character_value_aspects(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),

  -- Text description for each value
  description TEXT,

  -- Optional: Grade (A/B/C/D) if user wants it
  grade VARCHAR(5),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One value per aspect per student per semester
  CONSTRAINT unique_student_character_value
    UNIQUE(student_id, aspect_id, academic_year_id, semester)
);

-- Indexes for performance
CREATE INDEX idx_student_character_values_student
  ON student_character_values(student_id);
CREATE INDEX idx_student_character_values_aspect
  ON student_character_values(aspect_id);
CREATE INDEX idx_student_character_values_year_semester
  ON student_character_values(academic_year_id, semester);

-- Enable RLS
ALTER TABLE character_value_aspects ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_character_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow read for authenticated users
CREATE POLICY "Allow read character_value_aspects for authenticated users"
  ON character_value_aspects FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read student_character_values for authenticated users"
  ON student_character_values FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies: Allow write for admins/teachers
-- TODO: Adjust based on your existing RLS patterns for teachers/admins

COMMIT;
```

---

### Step 1.3: Seed Character Value Aspects

**File to Create**: `supabase/migrations/20251209_seed_character_values.sql`

```sql
-- Migration: Seed Character Value Aspects
-- Description: Insert 13 default "Nilai-nilai Luhur" values
-- Date: 2025-12-09

BEGIN;

INSERT INTO character_value_aspects (name, display_order) VALUES
  ('Jujur', 1),
  ('Amanah', 2),
  ('Berhemat', 3),
  ('Disiplin', 4),
  ('Rasa tanggung jawab', 5),
  ('Kesyukuran', 6),
  ('Kreatifitas/Kesungguhan', 7),
  ('Praktek mengagungkan', 8),
  ('Rukun', 9),
  ('Kompak', 10),
  ('Kerjasama yang baik', 11),
  ('Peduli lingkungan', 12),
  ('Cinta jama''ah', 13)
ON CONFLICT (name) DO NOTHING;

COMMIT;
```

---

### Step 1.4: Create Extracurricular Tables

**File to Create**: `supabase/migrations/20251209_create_extracurriculars.sql`

```sql
-- Migration: Create Extracurricular Tables
-- Description: Tables for extracurricular activities and student grades
-- Date: 2025-12-09

BEGIN;

-- Master table: Extracurricular Activities
CREATE TABLE IF NOT EXISTS extracurricular_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT unique_extracurricular_name UNIQUE(name)
);

-- Student extracurricular grades
CREATE TABLE IF NOT EXISTS student_extracurriculars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  activity_id UUID NOT NULL REFERENCES extracurricular_activities(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),

  -- Predikat: A/B/C/D
  grade VARCHAR(5),

  -- Keterangan
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One grade per activity per student per semester
  CONSTRAINT unique_student_extracurricular
    UNIQUE(student_id, activity_id, academic_year_id, semester)
);

-- Indexes
CREATE INDEX idx_student_extracurriculars_student
  ON student_extracurriculars(student_id);
CREATE INDEX idx_student_extracurriculars_activity
  ON student_extracurriculars(activity_id);
CREATE INDEX idx_student_extracurriculars_year_semester
  ON student_extracurriculars(academic_year_id, semester);

-- Enable RLS
ALTER TABLE extracurricular_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_extracurriculars ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow read for authenticated users
CREATE POLICY "Allow read extracurricular_activities for authenticated users"
  ON extracurricular_activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow read student_extracurriculars for authenticated users"
  ON student_extracurriculars FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
```

---

### Step 1.5: Seed Extracurricular Activities

**File to Create**: `supabase/migrations/20251209_seed_extracurriculars.sql`

```sql
-- Migration: Seed Extracurricular Activities
-- Description: Insert 4 default extracurricular activities
-- Date: 2025-12-09

BEGIN;

INSERT INTO extracurricular_activities (name, display_order) VALUES
  ('PERSINAS ASAD', 1),
  ('BCM (Bermain Cerita dan Menyanyi)', 2),
  ('FUTSAL', 3),
  ('TAHFIDZ', 4)
ON CONFLICT (name) DO NOTHING;

COMMIT;
```

---

### Step 1.6: Update Student Reports Table (Optional)

**File to Create**: `supabase/migrations/20251209_update_student_reports.sql`

```sql
-- Migration: Update Student Reports Table
-- Description: Ensure student_reports can handle new data
-- Date: 2025-12-09

BEGIN;

-- Add columns if not exists (for attendance sync tracking)
ALTER TABLE student_reports
  ADD COLUMN IF NOT EXISTS attendance_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attendance_last_sync_by UUID REFERENCES profiles(id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_reports_student_year_semester
  ON student_reports(student_id, academic_year_id, semester);

COMMIT;
```

---

**Database Migration Summary**:
- ✅ 15 new columns in `students` table
- ✅ 2 new tables: `character_value_aspects`, `student_character_values`
- ✅ 2 new tables: `extracurricular_activities`, `student_extracurriculars`
- ✅ Seeded 13 character values
- ✅ Seeded 4 extracurricular activities
- ✅ RLS policies applied
- ✅ Indexes for performance

---

## PHASE 2: Student Biodata UI

### Step 2.1: Update Student Types

**File to Update**: `src/app/(admin)/users/siswa/types.ts`

**If file doesn't exist**, create it:

```typescript
// src/app/(admin)/users/siswa/types.ts

export interface StudentBiodata {
  // Basic Identity
  id: string;
  name: string;
  nomor_induk?: string | null;
  gender: 'Laki-laki' | 'Perempuan' | null;
  tempat_lahir?: string | null;
  tanggal_lahir?: string | null; // ISO date string (YYYY-MM-DD)
  anak_ke?: number | null;

  // Contact
  alamat?: string | null;
  nomor_telepon?: string | null;

  // Parent Info
  nama_ayah?: string | null;
  nama_ibu?: string | null;
  alamat_orangtua?: string | null;
  telepon_orangtua?: string | null;
  pekerjaan_ayah?: string | null;
  pekerjaan_ibu?: string | null;

  // Guardian Info
  nama_wali?: string | null;
  alamat_wali?: string | null;
  pekerjaan_wali?: string | null;

  // Existing Relations
  classes?: Array<{ id: string; name: string }>;
  kelompok_id?: string | null;
  kelompok?: { id: string; name: string } | null;
  desa_id?: string | null;
  desa?: { id: string; name: string } | null;
  daerah_id?: string | null;
  daerah?: { id: string; name: string } | null;

  // Timestamps
  created_at?: string;
  updated_at?: string;
}

export interface StudentBiodataFormData {
  // Identity
  name: string;
  nomor_induk: string;
  gender: 'Laki-laki' | 'Perempuan' | '';
  tempat_lahir: string;
  tanggal_lahir: string;
  anak_ke: string; // string for form input, convert to number

  // Contact
  alamat: string;
  nomor_telepon: string;

  // Parent
  nama_ayah: string;
  nama_ibu: string;
  alamat_orangtua: string;
  telepon_orangtua: string;
  pekerjaan_ayah: string;
  pekerjaan_ibu: string;

  // Guardian
  nama_wali: string;
  alamat_wali: string;
  pekerjaan_wali: string;
}
```

---

### Step 2.2: Update Student Actions

**File to Update**: `src/app/(admin)/users/siswa/actions.ts`

**Add or update the following functions**:

```typescript
// src/app/(admin)/users/siswa/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { StudentBiodata } from './types'

/**
 * Get student with complete biodata
 */
export async function getStudentBiodata(
  studentId: string
): Promise<{ success: boolean; data?: StudentBiodata; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('students')
      .select(
        `
        id,
        name,
        nomor_induk,
        gender,
        tempat_lahir,
        tanggal_lahir,
        anak_ke,
        alamat,
        nomor_telepon,
        nama_ayah,
        nama_ibu,
        alamat_orangtua,
        telepon_orangtua,
        pekerjaan_ayah,
        pekerjaan_ibu,
        nama_wali,
        alamat_wali,
        pekerjaan_wali,
        kelompok_id,
        kelompok:kelompok_id(id, name),
        desa_id,
        desa:desa_id(id, name),
        daerah_id,
        daerah:daerah_id(id, name),
        created_at,
        updated_at
      `
      )
      .eq('id', studentId)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching student biodata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch student biodata',
    }
  }
}

/**
 * Update student biodata
 */
export async function updateStudentBiodata(
  studentId: string,
  biodata: Partial<StudentBiodata>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Extract only the fields that exist in the database
    const updateData: any = {}

    if (biodata.name !== undefined) updateData.name = biodata.name
    if (biodata.nomor_induk !== undefined) updateData.nomor_induk = biodata.nomor_induk
    if (biodata.gender !== undefined) updateData.gender = biodata.gender
    if (biodata.tempat_lahir !== undefined) updateData.tempat_lahir = biodata.tempat_lahir
    if (biodata.tanggal_lahir !== undefined) updateData.tanggal_lahir = biodata.tanggal_lahir
    if (biodata.anak_ke !== undefined) updateData.anak_ke = biodata.anak_ke
    if (biodata.alamat !== undefined) updateData.alamat = biodata.alamat
    if (biodata.nomor_telepon !== undefined) updateData.nomor_telepon = biodata.nomor_telepon
    if (biodata.nama_ayah !== undefined) updateData.nama_ayah = biodata.nama_ayah
    if (biodata.nama_ibu !== undefined) updateData.nama_ibu = biodata.nama_ibu
    if (biodata.alamat_orangtua !== undefined) updateData.alamat_orangtua = biodata.alamat_orangtua
    if (biodata.telepon_orangtua !== undefined) updateData.telepon_orangtua = biodata.telepon_orangtua
    if (biodata.pekerjaan_ayah !== undefined) updateData.pekerjaan_ayah = biodata.pekerjaan_ayah
    if (biodata.pekerjaan_ibu !== undefined) updateData.pekerjaan_ibu = biodata.pekerjaan_ibu
    if (biodata.nama_wali !== undefined) updateData.nama_wali = biodata.nama_wali
    if (biodata.alamat_wali !== undefined) updateData.alamat_wali = biodata.alamat_wali
    if (biodata.pekerjaan_wali !== undefined) updateData.pekerjaan_wali = biodata.pekerjaan_wali

    updateData.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('students')
      .update(updateData)
      .eq('id', studentId)

    if (error) throw error

    revalidatePath('/users/siswa')
    revalidatePath(`/users/siswa/${studentId}`)
    revalidatePath('/rapot')

    return { success: true }
  } catch (error) {
    console.error('Error updating student biodata:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update student biodata',
    }
  }
}
```

---

### Step 2.3: Create Student Profile View Component

**File to Create**: `src/app/(admin)/users/siswa/components/StudentProfileView.tsx`

```typescript
// src/app/(admin)/users/siswa/components/StudentProfileView.tsx
'use client'

import { useState } from 'react'
import type { StudentBiodata } from '../types'
import { Button } from '@/components/ui/button/Button'
import { PencilIcon } from '@heroicons/react/24/outline'

interface StudentProfileViewProps {
  student: StudentBiodata
  onEdit?: () => void
  canEdit?: boolean
}

export function StudentProfileView({
  student,
  onEdit,
  canEdit = true,
}: StudentProfileViewProps) {
  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const renderField = (label: string, value: string | number | null | undefined) => (
    <div className="flex flex-col gap-1">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100">{value || '-'}</dd>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      {canEdit && onEdit && (
        <div className="flex justify-end">
          <Button
            onClick={onEdit}
            variant="outline"
            size="sm"
            leftIcon={<PencilIcon className="h-4 w-4" />}
          >
            Edit Biodata
          </Button>
        </div>
      )}

      {/* Card 1: Identitas Siswa */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Identitas Siswa
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField('Nama Lengkap', student.name)}
          {renderField('Nomor Induk', student.nomor_induk)}
          {renderField('Jenis Kelamin', student.gender)}
          {renderField('Tempat Lahir', student.tempat_lahir)}
          {renderField('Tanggal Lahir', formatDate(student.tanggal_lahir))}
          {renderField('Anak ke', student.anak_ke)}
        </dl>
      </div>

      {/* Card 2: Kontak */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Kontak</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField('Alamat', student.alamat)}
          {renderField('Nomor Telepon', student.nomor_telepon)}
        </dl>
      </div>

      {/* Card 3: Data Orang Tua */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          Data Orang Tua
        </h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField('Nama Ayah', student.nama_ayah)}
          {renderField('Pekerjaan Ayah', student.pekerjaan_ayah)}
          {renderField('Nama Ibu', student.nama_ibu)}
          {renderField('Pekerjaan Ibu', student.pekerjaan_ibu)}
          <div className="sm:col-span-2">
            {renderField('Alamat Orang Tua', student.alamat_orangtua)}
          </div>
          {renderField('Telepon Orang Tua', student.telepon_orangtua)}
        </dl>
      </div>

      {/* Card 4: Data Wali */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Data Wali</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {renderField('Nama Wali', student.nama_wali)}
          {renderField('Pekerjaan Wali', student.pekerjaan_wali)}
          <div className="sm:col-span-2">{renderField('Alamat Wali', student.alamat_wali)}</div>
        </dl>
      </div>

      {/* Card 5: Organisasi */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Organisasi</h3>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {renderField('Daerah', student.daerah?.name)}
          {renderField('Desa', student.desa?.name)}
          {renderField('Kelompok', student.kelompok?.name)}
        </dl>
      </div>
    </div>
  )
}
```

---

### Step 2.4: Create Student Biodata Edit Modal

**File to Create**: `src/app/(admin)/users/siswa/components/StudentBiodataModal.tsx`

```typescript
// src/app/(admin)/users/siswa/components/StudentBiodataModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal/Modal'
import { Button } from '@/components/ui/button/Button'
import { TextInput } from '@/components/form/input/TextInput'
import { SelectInput } from '@/components/form/input/SelectInput'
import type { StudentBiodata, StudentBiodataFormData } from '../types'
import { updateStudentBiodata } from '../actions'
import { toast } from 'sonner'

interface StudentBiodataModalProps {
  isOpen: boolean
  onClose: () => void
  student: StudentBiodata | null
  onSuccess?: () => void
}

export function StudentBiodataModal({
  isOpen,
  onClose,
  student,
  onSuccess,
}: StudentBiodataModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'identity' | 'contact' | 'parent' | 'guardian'>(
    'identity'
  )

  const [formData, setFormData] = useState<StudentBiodataFormData>({
    name: '',
    nomor_induk: '',
    gender: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    anak_ke: '',
    alamat: '',
    nomor_telepon: '',
    nama_ayah: '',
    nama_ibu: '',
    alamat_orangtua: '',
    telepon_orangtua: '',
    pekerjaan_ayah: '',
    pekerjaan_ibu: '',
    nama_wali: '',
    alamat_wali: '',
    pekerjaan_wali: '',
  })

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name || '',
        nomor_induk: student.nomor_induk || '',
        gender: student.gender || '',
        tempat_lahir: student.tempat_lahir || '',
        tanggal_lahir: student.tanggal_lahir || '',
        anak_ke: student.anak_ke?.toString() || '',
        alamat: student.alamat || '',
        nomor_telepon: student.nomor_telepon || '',
        nama_ayah: student.nama_ayah || '',
        nama_ibu: student.nama_ibu || '',
        alamat_orangtua: student.alamat_orangtua || '',
        telepon_orangtua: student.telepon_orangtua || '',
        pekerjaan_ayah: student.pekerjaan_ayah || '',
        pekerjaan_ibu: student.pekerjaan_ibu || '',
        nama_wali: student.nama_wali || '',
        alamat_wali: student.alamat_wali || '',
        pekerjaan_wali: student.pekerjaan_wali || '',
      })
    }
  }, [student])

  const handleChange = (field: keyof StudentBiodataFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!student) return

    setIsSubmitting(true)

    try {
      // Convert form data to database format
      const updateData: Partial<StudentBiodata> = {
        name: formData.name,
        nomor_induk: formData.nomor_induk || null,
        gender: (formData.gender as 'Laki-laki' | 'Perempuan') || null,
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
        anak_ke: formData.anak_ke ? parseInt(formData.anak_ke, 10) : null,
        alamat: formData.alamat || null,
        nomor_telepon: formData.nomor_telepon || null,
        nama_ayah: formData.nama_ayah || null,
        nama_ibu: formData.nama_ibu || null,
        alamat_orangtua: formData.alamat_orangtua || null,
        telepon_orangtua: formData.telepon_orangtua || null,
        pekerjaan_ayah: formData.pekerjaan_ayah || null,
        pekerjaan_ibu: formData.pekerjaan_ibu || null,
        nama_wali: formData.nama_wali || null,
        alamat_wali: formData.alamat_wali || null,
        pekerjaan_wali: formData.pekerjaan_wali || null,
      }

      const result = await updateStudentBiodata(student.id, updateData)

      if (result.success) {
        toast.success('Biodata siswa berhasil diperbarui')
        onSuccess?.()
        onClose()
      } else {
        toast.error(result.error || 'Gagal memperbarui biodata siswa')
      }
    } catch (error) {
      console.error('Error submitting biodata:', error)
      toast.error('Terjadi kesalahan saat menyimpan biodata')
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabs = [
    { id: 'identity' as const, label: 'Identitas' },
    { id: 'contact' as const, label: 'Kontak' },
    { id: 'parent' as const, label: 'Orang Tua' },
    { id: 'guardian' as const, label: 'Wali' },
  ]

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Biodata Siswa" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium
                  ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {/* Tab 1: Identitas */}
          {activeTab === 'identity' && (
            <>
              <TextInput
                label="Nama Lengkap"
                value={formData.name}
                onChange={(value) => handleChange('name', value)}
                required
              />
              <TextInput
                label="Nomor Induk"
                value={formData.nomor_induk}
                onChange={(value) => handleChange('nomor_induk', value)}
              />
              <SelectInput
                label="Jenis Kelamin"
                value={formData.gender}
                onChange={(value) => handleChange('gender', value)}
                options={[
                  { value: '', label: 'Pilih jenis kelamin' },
                  { value: 'Laki-laki', label: 'Laki-laki' },
                  { value: 'Perempuan', label: 'Perempuan' },
                ]}
              />
              <TextInput
                label="Tempat Lahir"
                value={formData.tempat_lahir}
                onChange={(value) => handleChange('tempat_lahir', value)}
              />
              <TextInput
                label="Tanggal Lahir"
                type="date"
                value={formData.tanggal_lahir}
                onChange={(value) => handleChange('tanggal_lahir', value)}
              />
              <TextInput
                label="Anak ke"
                type="number"
                value={formData.anak_ke}
                onChange={(value) => handleChange('anak_ke', value)}
              />
            </>
          )}

          {/* Tab 2: Kontak */}
          {activeTab === 'contact' && (
            <>
              <TextInput
                label="Alamat"
                value={formData.alamat}
                onChange={(value) => handleChange('alamat', value)}
                multiline
                rows={3}
              />
              <TextInput
                label="Nomor Telepon"
                value={formData.nomor_telepon}
                onChange={(value) => handleChange('nomor_telepon', value)}
              />
            </>
          )}

          {/* Tab 3: Orang Tua */}
          {activeTab === 'parent' && (
            <>
              <TextInput
                label="Nama Ayah"
                value={formData.nama_ayah}
                onChange={(value) => handleChange('nama_ayah', value)}
              />
              <TextInput
                label="Pekerjaan Ayah"
                value={formData.pekerjaan_ayah}
                onChange={(value) => handleChange('pekerjaan_ayah', value)}
              />
              <TextInput
                label="Nama Ibu"
                value={formData.nama_ibu}
                onChange={(value) => handleChange('nama_ibu', value)}
              />
              <TextInput
                label="Pekerjaan Ibu"
                value={formData.pekerjaan_ibu}
                onChange={(value) => handleChange('pekerjaan_ibu', value)}
              />
              <TextInput
                label="Alamat Orang Tua"
                value={formData.alamat_orangtua}
                onChange={(value) => handleChange('alamat_orangtua', value)}
                multiline
                rows={3}
              />
              <TextInput
                label="Telepon Orang Tua"
                value={formData.telepon_orangtua}
                onChange={(value) => handleChange('telepon_orangtua', value)}
              />
            </>
          )}

          {/* Tab 4: Wali */}
          {activeTab === 'guardian' && (
            <>
              <TextInput
                label="Nama Wali"
                value={formData.nama_wali}
                onChange={(value) => handleChange('nama_wali', value)}
              />
              <TextInput
                label="Pekerjaan Wali"
                value={formData.pekerjaan_wali}
                onChange={(value) => handleChange('pekerjaan_wali', value)}
              />
              <TextInput
                label="Alamat Wali"
                value={formData.alamat_wali}
                onChange={(value) => handleChange('alamat_wali', value)}
                multiline
                rows={3}
              />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
```

---

### Step 2.5: Integrate into Student Detail Page

**File to Update**: `src/app/(admin)/users/siswa/[id]/page.tsx` (or similar)

**If the file exists**, add the biodata view. **If not**, create a detail page:

```typescript
// src/app/(admin)/users/siswa/[id]/page.tsx
import { Suspense } from 'react'
import { StudentDetailClient } from './StudentDetailClient'

export default function StudentDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<div>Loading...</div>}>
        <StudentDetailClient studentId={params.id} />
      </Suspense>
    </div>
  )
}
```

**Create Client Component**:

```typescript
// src/app/(admin)/users/siswa/[id]/StudentDetailClient.tsx
'use client'

import { useState, useEffect } from 'react'
import { StudentProfileView } from '../components/StudentProfileView'
import { StudentBiodataModal } from '../components/StudentBiodataModal'
import { getStudentBiodata } from '../actions'
import type { StudentBiodata } from '../types'
import { toast } from 'sonner'

interface StudentDetailClientProps {
  studentId: string
}

export function StudentDetailClient({ studentId }: StudentDetailClientProps) {
  const [student, setStudent] = useState<StudentBiodata | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const fetchStudent = async () => {
    setIsLoading(true)
    const result = await getStudentBiodata(studentId)
    if (result.success && result.data) {
      setStudent(result.data)
    } else {
      toast.error(result.error || 'Gagal memuat data siswa')
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchStudent()
  }, [studentId])

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!student) {
    return <div>Student not found</div>
  }

  return (
    <>
      <StudentProfileView
        student={student}
        onEdit={() => setIsEditModalOpen(true)}
        canEdit={true}
      />

      <StudentBiodataModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        student={student}
        onSuccess={fetchStudent}
      />
    </>
  )
}
```

---

**Phase 2 Complete**: Student biodata UI is now ready!

---

## PHASE 3: Attendance Integration

### Step 3.1: Create Attendance Summary Function

**File to Update**: `src/app/(admin)/rapot/actions.ts`

**Add the following function**:

```typescript
// src/app/(admin)/rapot/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'

export interface AttendanceSummary {
  totalMeetings: number
  hadir: number // H
  izin: number // I
  sakit: number // S
  alpha: number // A
  percentage: number
}

/**
 * Get student attendance summary for a specific academic year and semester
 */
export async function getStudentAttendanceSummary(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<{ success: boolean; data?: AttendanceSummary; error?: string }> {
  try {
    const supabase = await createClient()

    // 1. Get academic year date range
    const { data: academicYear, error: yearError } = await supabase
      .from('academic_years')
      .select('start_date, end_date')
      .eq('id', academicYearId)
      .single()

    if (yearError) throw yearError

    // 2. Calculate semester date range
    // Assumption: Semester 1 = first half, Semester 2 = second half
    const startDate = new Date(academicYear.start_date)
    const endDate = new Date(academicYear.end_date)
    const midDate = new Date((startDate.getTime() + endDate.getTime()) / 2)

    const semesterStart = semester === 1 ? startDate : midDate
    const semesterEnd = semester === 1 ? midDate : endDate

    // 3. Get all meetings in this semester
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, date, class_id, class_ids')
      .gte('date', semesterStart.toISOString().split('T')[0])
      .lte('date', semesterEnd.toISOString().split('T')[0])

    if (meetingsError) throw meetingsError

    const meetingIds = meetings.map((m) => m.id)

    if (meetingIds.length === 0) {
      return {
        success: true,
        data: { totalMeetings: 0, hadir: 0, izin: 0, sakit: 0, alpha: 0, percentage: 0 },
      }
    }

    // 4. Get attendance logs for this student
    const { data: logs, error: logsError } = await supabase
      .from('attendance_logs')
      .select('status, meeting_id')
      .eq('student_id', studentId)
      .in('meeting_id', meetingIds)

    if (logsError) throw logsError

    // 5. Aggregate counts
    const summary: AttendanceSummary = {
      totalMeetings: meetingIds.length,
      hadir: logs.filter((l) => l.status === 'H').length,
      izin: logs.filter((l) => l.status === 'I').length,
      sakit: logs.filter((l) => l.status === 'S').length,
      alpha: logs.filter((l) => l.status === 'A').length,
      percentage: 0,
    }

    // 6. Calculate percentage
    if (summary.totalMeetings > 0) {
      summary.percentage = (summary.hadir / summary.totalMeetings) * 100
    }

    return { success: true, data: summary }
  } catch (error) {
    console.error('Error fetching attendance summary:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch attendance summary',
    }
  }
}

/**
 * Sync attendance data to student report
 */
export async function syncAttendanceToReport(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const summaryResult = await getStudentAttendanceSummary(studentId, academicYearId, semester)

    if (!summaryResult.success || !summaryResult.data) {
      throw new Error(summaryResult.error || 'Failed to get attendance summary')
    }

    const summary = summaryResult.data

    // Update student_reports table
    const supabase = await createClient()
    const { error } = await supabase
      .from('student_reports')
      .update({
        sick_days: summary.sakit,
        permission_days: summary.izin,
        absent_days: summary.alpha,
        attendance_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('semester', semester)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error syncing attendance:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync attendance',
    }
  }
}
```

---

### Step 3.2: Add Sync Button to Report UI

**File to Update**: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

**Add a "Sinkronisasi Kehadiran" button**:

```typescript
// Add this to the attendance section of the report UI

import { syncAttendanceToReport, getStudentAttendanceSummary } from '../../actions'
import { Button } from '@/components/ui/button/Button'
import { ArrowPathIcon } from '@heroicons/react/24/outline'
import { toast } from 'sonner'

// Inside your component:
const [isSyncing, setIsSyncing] = useState(false)

const handleSyncAttendance = async () => {
  setIsSyncing(true)
  try {
    // First, show preview
    const summaryResult = await getStudentAttendanceSummary(
      studentId,
      academicYearId,
      semester
    )

    if (summaryResult.success && summaryResult.data) {
      const summary = summaryResult.data
      const confirmMessage = `
        Data kehadiran akan disinkronkan:
        - Total Pertemuan: ${summary.totalMeetings}
        - Hadir: ${summary.hadir}
        - Izin: ${summary.izin}
        - Sakit: ${summary.sakit}
        - Alpha: ${summary.alpha}

        Lanjutkan?
      `

      if (confirm(confirmMessage)) {
        const syncResult = await syncAttendanceToReport(studentId, academicYearId, semester)
        if (syncResult.success) {
          toast.success('Kehadiran berhasil disinkronkan')
          // Refresh report data
          mutate()
        } else {
          toast.error(syncResult.error || 'Gagal menyinkronkan kehadiran')
        }
      }
    }
  } catch (error) {
    toast.error('Terjadi kesalahan saat menyinkronkan kehadiran')
  } finally {
    setIsSyncing(false)
  }
}

// In JSX:
<Button
  onClick={handleSyncAttendance}
  disabled={isSyncing}
  variant="outline"
  size="sm"
  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
>
  {isSyncing ? 'Menyinkronkan...' : 'Sinkronisasi Kehadiran'}
</Button>
```

---

**Phase 3 Complete**: Attendance is now synced with Rapot!

---

## PHASE 4: Materi Integration (NEEDS USER CLARIFICATION)

### ⚠️ IMPORTANT: Questions for User

Before implementing Phase 4, we need answers to these questions:

1. **Materi Level**: For "Nilai Akademik", which level should be used as subjects?
   - [ ] Category only (e.g., "Hafalan" as 1 subject)
   - [ ] Type only (e.g., "Do'a-do'a" as 1 subject)
   - [ ] Item (e.g., each individual do'a graded separately)
   - [ ] Category + Items (e.g., "Hafalan" with sub-items underneath)

2. **Grading Method**: For sub-items like hafalan do'a:
   - [ ] Score 0-100 for each item
   - [ ] Hafal/Belum Hafal (binary)
   - [ ] Combined (some items scored, some binary)

3. **Subject Mapping**: Should subjects be:
   - [ ] Auto-synced from Materi (admin selects which categories/types to include)
   - [ ] Manually created but linkable to Materi items

### Placeholder Implementation

**Once user provides answers**, implement based on their choice:

#### Option A: Category-level Subjects

```sql
-- Add column to report_subjects
ALTER TABLE report_subjects ADD COLUMN material_category_id UUID REFERENCES material_categories(id);
```

#### Option B: Type-level Subjects

```sql
-- Add column to report_subjects
ALTER TABLE report_subjects ADD COLUMN material_type_id UUID REFERENCES material_types(id);
```

#### Option C: Item-level Subjects

```sql
-- Add column to report_subjects
ALTER TABLE report_subjects ADD COLUMN material_item_id UUID REFERENCES material_items(id);
```

**Actions to implement**:
```typescript
export async function syncMaterialToSubjects(options: {
  level: 'category' | 'type' | 'item'
  selectedIds: string[]
  academicYearId: string
}) {
  // Implementation based on user's choice
}
```

---

## PHASE 5: Character Values Integration

### Step 5.1: Create Character Values Actions

**File to Update**: `src/app/(admin)/rapot/actions.ts`

**Add these functions**:

```typescript
// src/app/(admin)/rapot/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CharacterValueAspect {
  id: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
}

export interface StudentCharacterValue {
  id: string
  student_id: string
  aspect_id: string
  academic_year_id: string
  semester: number
  description: string | null
  grade: string | null
  aspect: CharacterValueAspect
}

/**
 * Get all character value aspects (13 Nilai Luhur)
 */
export async function getCharacterValueAspects(): Promise<{
  success: boolean
  data?: CharacterValueAspect[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('character_value_aspects')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching character value aspects:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch character value aspects',
    }
  }
}

/**
 * Get student character values for a specific academic year and semester
 */
export async function getStudentCharacterValues(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<{
  success: boolean
  data?: StudentCharacterValue[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('student_character_values')
      .select(
        `
        id,
        student_id,
        aspect_id,
        academic_year_id,
        semester,
        description,
        grade,
        aspect:aspect_id(*)
      `
      )
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('semester', semester)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching student character values:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch student character values',
    }
  }
}

/**
 * Update or create student character value
 */
export async function updateStudentCharacterValue(
  studentId: string,
  aspectId: string,
  academicYearId: string,
  semester: number,
  description: string | null,
  grade?: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('student_character_values').upsert(
      {
        student_id: studentId,
        aspect_id: aspectId,
        academic_year_id: academicYearId,
        semester,
        description,
        grade: grade || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'student_id,aspect_id,academic_year_id,semester',
      }
    )

    if (error) throw error

    revalidatePath('/rapot')

    return { success: true }
  } catch (error) {
    console.error('Error updating student character value:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update student character value',
    }
  }
}
```

---

### Step 5.2: Create Character Values Section Component

**File to Create**: `src/app/(admin)/rapot/components/CharacterValuesSection.tsx`

```typescript
// src/app/(admin)/rapot/components/CharacterValuesSection.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  getCharacterValueAspects,
  getStudentCharacterValues,
  updateStudentCharacterValue,
} from '../actions'
import type { CharacterValueAspect, StudentCharacterValue } from '../actions'
import { Button } from '@/components/ui/button/Button'
import { toast } from 'sonner'

interface CharacterValuesSectionProps {
  studentId: string
  academicYearId: string
  semester: number
  isEditable?: boolean
}

export function CharacterValuesSection({
  studentId,
  academicYearId,
  semester,
  isEditable = true,
}: CharacterValuesSectionProps) {
  const [aspects, setAspects] = useState<CharacterValueAspect[]>([])
  const [values, setValues] = useState<Map<string, StudentCharacterValue>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  // Track changes
  const [editedDescriptions, setEditedDescriptions] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadData()
  }, [studentId, academicYearId, semester])

  const loadData = async () => {
    // Load aspects
    const aspectsResult = await getCharacterValueAspects()
    if (aspectsResult.success && aspectsResult.data) {
      setAspects(aspectsResult.data)
    }

    // Load student values
    const valuesResult = await getStudentCharacterValues(studentId, academicYearId, semester)
    if (valuesResult.success && valuesResult.data) {
      const valuesMap = new Map(valuesResult.data.map((v) => [v.aspect_id, v]))
      setValues(valuesMap)

      // Initialize edited descriptions
      const descriptionsMap = new Map(
        valuesResult.data.map((v) => [v.aspect_id, v.description || ''])
      )
      setEditedDescriptions(descriptionsMap)
    }
  }

  const handleDescriptionChange = (aspectId: string, description: string) => {
    setEditedDescriptions((prev) => new Map(prev).set(aspectId, description))
  }

  const handleSave = async (aspectId: string) => {
    const description = editedDescriptions.get(aspectId)
    if (description === undefined) return

    setIsSaving(true)
    try {
      const result = await updateStudentCharacterValue(
        studentId,
        aspectId,
        academicYearId,
        semester,
        description || null
      )

      if (result.success) {
        toast.success('Nilai berhasil disimpan')
        loadData() // Refresh
      } else {
        toast.error(result.error || 'Gagal menyimpan nilai')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan nilai')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const promises = aspects.map((aspect) => {
        const description = editedDescriptions.get(aspect.id)
        if (description !== undefined) {
          return updateStudentCharacterValue(
            studentId,
            aspect.id,
            academicYearId,
            semester,
            description || null
          )
        }
        return Promise.resolve({ success: true })
      })

      await Promise.all(promises)
      toast.success('Semua nilai berhasil disimpan')
      loadData()
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan nilai')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Catatan Nilai-nilai Luhur
        </h3>
        {isEditable && (
          <Button onClick={handleSaveAll} disabled={isSaving} variant="primary" size="sm">
            {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Nilai
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Deskripsi
              </th>
              {isEditable && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {aspects.map((aspect, index) => {
              const currentDescription = editedDescriptions.get(aspect.id) || ''
              const hasChanged = currentDescription !== (values.get(aspect.id)?.description || '')

              return (
                <tr key={aspect.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {index + 1}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {aspect.name}
                  </td>
                  <td className="px-4 py-3">
                    {isEditable ? (
                      <textarea
                        value={currentDescription}
                        onChange={(e) => handleDescriptionChange(aspect.id, e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        rows={2}
                        placeholder="Masukkan deskripsi..."
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {currentDescription || '-'}
                      </p>
                    )}
                  </td>
                  {isEditable && (
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Button
                        onClick={() => handleSave(aspect.id)}
                        disabled={!hasChanged || isSaving}
                        variant="outline"
                        size="sm"
                      >
                        Simpan
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

### Step 5.3: Integrate into Report Detail Page

**File to Update**: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

```typescript
import { CharacterValuesSection } from '../../components/CharacterValuesSection'

// Inside your report detail component:
<CharacterValuesSection
  studentId={studentId}
  academicYearId={academicYearId}
  semester={semester}
  isEditable={canEdit}
/>
```

---

**Phase 5 Complete**: Character values (13 Nilai Luhur) are now integrated!

---

## PHASE 6: Extracurricular Integration

### Step 6.1: Create Extracurricular Actions

**File to Update**: `src/app/(admin)/rapot/actions.ts`

**Add these functions**:

```typescript
// src/app/(admin)/rapot/actions.ts
'use server'

export interface ExtracurricularActivity {
  id: string
  name: string
  description: string | null
  display_order: number
  is_active: boolean
}

export interface StudentExtracurricular {
  id: string
  student_id: string
  activity_id: string
  academic_year_id: string
  semester: number
  grade: string | null
  description: string | null
  activity: ExtracurricularActivity
}

/**
 * Get all extracurricular activities
 */
export async function getExtracurricularActivities(): Promise<{
  success: boolean
  data?: ExtracurricularActivity[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('extracurricular_activities')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching extracurricular activities:', error)
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch extracurricular activities',
    }
  }
}

/**
 * Get student extracurricular grades
 */
export async function getStudentExtracurriculars(
  studentId: string,
  academicYearId: string,
  semester: number
): Promise<{
  success: boolean
  data?: StudentExtracurricular[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('student_extracurriculars')
      .select(
        `
        id,
        student_id,
        activity_id,
        academic_year_id,
        semester,
        grade,
        description,
        activity:activity_id(*)
      `
      )
      .eq('student_id', studentId)
      .eq('academic_year_id', academicYearId)
      .eq('semester', semester)

    if (error) throw error

    return { success: true, data: data || [] }
  } catch (error) {
    console.error('Error fetching student extracurriculars:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch student extracurriculars',
    }
  }
}

/**
 * Update or create student extracurricular grade
 */
export async function updateStudentExtracurricular(
  studentId: string,
  activityId: string,
  academicYearId: string,
  semester: number,
  grade: string | null,
  description: string | null
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from('student_extracurriculars').upsert(
      {
        student_id: studentId,
        activity_id: activityId,
        academic_year_id: academicYearId,
        semester,
        grade,
        description,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'student_id,activity_id,academic_year_id,semester',
      }
    )

    if (error) throw error

    revalidatePath('/rapot')

    return { success: true }
  } catch (error) {
    console.error('Error updating student extracurricular:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update student extracurricular',
    }
  }
}
```

---

### Step 6.2: Create Extracurricular Section Component

**File to Create**: `src/app/(admin)/rapot/components/ExtracurricularSection.tsx`

```typescript
// src/app/(admin)/rapot/components/ExtracurricularSection.tsx
'use client'

import { useState, useEffect } from 'react'
import {
  getExtracurricularActivities,
  getStudentExtracurriculars,
  updateStudentExtracurricular,
} from '../actions'
import type { ExtracurricularActivity, StudentExtracurricular } from '../actions'
import { Button } from '@/components/ui/button/Button'
import { SelectInput } from '@/components/form/input/SelectInput'
import { toast } from 'sonner'

interface ExtracurricularSectionProps {
  studentId: string
  academicYearId: string
  semester: number
  isEditable?: boolean
}

export function ExtracurricularSection({
  studentId,
  academicYearId,
  semester,
  isEditable = true,
}: ExtracurricularSectionProps) {
  const [activities, setActivities] = useState<ExtracurricularActivity[]>([])
  const [grades, setGrades] = useState<Map<string, StudentExtracurricular>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  // Track changes
  const [editedGrades, setEditedGrades] = useState<Map<string, string>>(new Map())
  const [editedDescriptions, setEditedDescriptions] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    loadData()
  }, [studentId, academicYearId, semester])

  const loadData = async () => {
    // Load activities
    const activitiesResult = await getExtracurricularActivities()
    if (activitiesResult.success && activitiesResult.data) {
      setActivities(activitiesResult.data)
    }

    // Load student grades
    const gradesResult = await getStudentExtracurriculars(studentId, academicYearId, semester)
    if (gradesResult.success && gradesResult.data) {
      const gradesMap = new Map(gradesResult.data.map((g) => [g.activity_id, g]))
      setGrades(gradesMap)

      // Initialize edited values
      const gradesEditMap = new Map(gradesResult.data.map((g) => [g.activity_id, g.grade || '']))
      const descriptionsEditMap = new Map(
        gradesResult.data.map((g) => [g.activity_id, g.description || ''])
      )
      setEditedGrades(gradesEditMap)
      setEditedDescriptions(descriptionsEditMap)
    }
  }

  const handleGradeChange = (activityId: string, grade: string) => {
    setEditedGrades((prev) => new Map(prev).set(activityId, grade))
  }

  const handleDescriptionChange = (activityId: string, description: string) => {
    setEditedDescriptions((prev) => new Map(prev).set(activityId, description))
  }

  const handleSave = async (activityId: string) => {
    const grade = editedGrades.get(activityId)
    const description = editedDescriptions.get(activityId)

    setIsSaving(true)
    try {
      const result = await updateStudentExtracurricular(
        studentId,
        activityId,
        academicYearId,
        semester,
        grade || null,
        description || null
      )

      if (result.success) {
        toast.success('Nilai berhasil disimpan')
        loadData()
      } else {
        toast.error(result.error || 'Gagal menyimpan nilai')
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan nilai')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAll = async () => {
    setIsSaving(true)
    try {
      const promises = activities.map((activity) => {
        const grade = editedGrades.get(activity.id)
        const description = editedDescriptions.get(activity.id)

        return updateStudentExtracurricular(
          studentId,
          activity.id,
          academicYearId,
          semester,
          grade || null,
          description || null
        )
      })

      await Promise.all(promises)
      toast.success('Semua nilai berhasil disimpan')
      loadData()
    } catch (error) {
      toast.error('Terjadi kesalahan saat menyimpan nilai')
    } finally {
      setIsSaving(false)
    }
  }

  const gradeOptions = [
    { value: '', label: 'Pilih Predikat' },
    { value: 'A', label: 'A' },
    { value: 'B', label: 'B' },
    { value: 'C', label: 'C' },
    { value: 'D', label: 'D' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Ekstrakurikuler</h3>
        {isEditable && (
          <Button onClick={handleSaveAll} disabled={isSaving} variant="primary" size="sm">
            {isSaving ? 'Menyimpan...' : 'Simpan Semua'}
          </Button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                No
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Kegiatan
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Predikat
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Keterangan
              </th>
              {isEditable && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {activities.map((activity, index) => {
              const currentGrade = editedGrades.get(activity.id) || ''
              const currentDescription = editedDescriptions.get(activity.id) || ''
              const savedGrade = grades.get(activity.id)?.grade || ''
              const savedDescription = grades.get(activity.id)?.description || ''
              const hasChanged =
                currentGrade !== savedGrade || currentDescription !== savedDescription

              return (
                <tr key={activity.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {index + 1}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                    {activity.name}
                  </td>
                  <td className="px-4 py-3">
                    {isEditable ? (
                      <select
                        value={currentGrade}
                        onChange={(e) => handleGradeChange(activity.id, e.target.value)}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      >
                        {gradeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {currentGrade || '-'}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isEditable ? (
                      <textarea
                        value={currentDescription}
                        onChange={(e) => handleDescriptionChange(activity.id, e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        rows={2}
                        placeholder="Masukkan keterangan..."
                      />
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {currentDescription || '-'}
                      </p>
                    )}
                  </td>
                  {isEditable && (
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <Button
                        onClick={() => handleSave(activity.id)}
                        disabled={!hasChanged || isSaving}
                        variant="outline"
                        size="sm"
                      >
                        Simpan
                      </Button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

### Step 6.3: Integrate into Report Detail Page

**File to Update**: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

```typescript
import { ExtracurricularSection } from '../../components/ExtracurricularSection'

// Inside your report detail component:
<ExtracurricularSection
  studentId={studentId}
  academicYearId={academicYearId}
  semester={semester}
  isEditable={canEdit}
/>
```

---

**Phase 6 Complete**: Extracurricular activities are now integrated!

---

## PHASE 7: PDF Report Update

### Step 7.1: Update PDF Document Structure

**File to Update**: `src/app/(admin)/rapot/components/PDFReportDocument.tsx`

**Add new sections to the PDF template**:

```typescript
// src/app/(admin)/rapot/components/PDFReportDocument.tsx

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { StudentBiodata } from '../../users/siswa/types'
import type { StudentCharacterValue, StudentExtracurricular } from '../actions'

// Update the props interface
interface PDFReportDocumentProps {
  student: StudentBiodata
  academicYear: { name: string }
  semester: number
  grades: any[]
  attendanceSummary: {
    totalMeetings: number
    hadir: number
    izin: number
    sakit: number
    alpha: number
    percentage: number
  }
  characterValues: StudentCharacterValue[]
  extracurriculars: StudentExtracurricular[]
  teacherNotes?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  section: {
    marginBottom: 20,
  },
  heading: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subheading: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
  },
  tableCell: {
    padding: 5,
    borderRightWidth: 1,
    borderColor: '#000',
  },
  // Add more styles as needed
})

export function PDFReportDocument({
  student,
  academicYear,
  semester,
  grades,
  attendanceSummary,
  characterValues,
  extracurriculars,
  teacherNotes,
}: PDFReportDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.heading}>RAPOR SISWA</Text>
          <Text>Tahun Ajaran: {academicYear.name}</Text>
          <Text>Semester: {semester}</Text>
        </View>

        {/* Section 1: Student Biodata */}
        <View style={styles.section}>
          <Text style={styles.subheading}>Data Siswa</Text>
          <View>
            <Text>Nama: {student.name}</Text>
            <Text>Nomor Induk: {student.nomor_induk || '-'}</Text>
            <Text>Jenis Kelamin: {student.gender || '-'}</Text>
            <Text>
              Tempat, Tanggal Lahir: {student.tempat_lahir || '-'},{' '}
              {student.tanggal_lahir || '-'}
            </Text>
            <Text>Anak ke: {student.anak_ke || '-'}</Text>
            <Text>Alamat: {student.alamat || '-'}</Text>
            <Text>Nama Ayah: {student.nama_ayah || '-'}</Text>
            <Text>Nama Ibu: {student.nama_ibu || '-'}</Text>
          </View>
        </View>

        {/* Section 2: Academic Grades */}
        <View style={styles.section}>
          <Text style={styles.subheading}>Nilai Akademik</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { width: '10%' }]}>
                <Text>No</Text>
              </View>
              <View style={[styles.tableCell, { width: '50%' }]}>
                <Text>Mata Pelajaran</Text>
              </View>
              <View style={[styles.tableCell, { width: '20%' }]}>
                <Text>Nilai</Text>
              </View>
              <View style={[styles.tableCell, { width: '20%' }]}>
                <Text>Predikat</Text>
              </View>
            </View>
            {grades.map((grade, index) => (
              <View key={grade.id} style={styles.tableRow}>
                <View style={[styles.tableCell, { width: '10%' }]}>
                  <Text>{index + 1}</Text>
                </View>
                <View style={[styles.tableCell, { width: '50%' }]}>
                  <Text>{grade.subject_name}</Text>
                </View>
                <View style={[styles.tableCell, { width: '20%' }]}>
                  <Text>{grade.score}</Text>
                </View>
                <View style={[styles.tableCell, { width: '20%' }]}>
                  <Text>{grade.grade}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 3: Character Values */}
        <View style={styles.section}>
          <Text style={styles.subheading}>Catatan Nilai-nilai Luhur</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { width: '10%' }]}>
                <Text>No</Text>
              </View>
              <View style={[styles.tableCell, { width: '40%' }]}>
                <Text>Nilai</Text>
              </View>
              <View style={[styles.tableCell, { width: '50%' }]}>
                <Text>Deskripsi</Text>
              </View>
            </View>
            {characterValues.map((value, index) => (
              <View key={value.id} style={styles.tableRow}>
                <View style={[styles.tableCell, { width: '10%' }]}>
                  <Text>{index + 1}</Text>
                </View>
                <View style={[styles.tableCell, { width: '40%' }]}>
                  <Text>{value.aspect.name}</Text>
                </View>
                <View style={[styles.tableCell, { width: '50%' }]}>
                  <Text>{value.description || '-'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 4: Extracurricular */}
        <View style={styles.section}>
          <Text style={styles.subheading}>Ekstrakurikuler</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={[styles.tableCell, { width: '10%' }]}>
                <Text>No</Text>
              </View>
              <View style={[styles.tableCell, { width: '40%' }]}>
                <Text>Kegiatan</Text>
              </View>
              <View style={[styles.tableCell, { width: '20%' }]}>
                <Text>Predikat</Text>
              </View>
              <View style={[styles.tableCell, { width: '30%' }]}>
                <Text>Keterangan</Text>
              </View>
            </View>
            {extracurriculars.map((extra, index) => (
              <View key={extra.id} style={styles.tableRow}>
                <View style={[styles.tableCell, { width: '10%' }]}>
                  <Text>{index + 1}</Text>
                </View>
                <View style={[styles.tableCell, { width: '40%' }]}>
                  <Text>{extra.activity.name}</Text>
                </View>
                <View style={[styles.tableCell, { width: '20%' }]}>
                  <Text>{extra.grade || '-'}</Text>
                </View>
                <View style={[styles.tableCell, { width: '30%' }]}>
                  <Text>{extra.description || '-'}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Section 5: Attendance */}
        <View style={styles.section}>
          <Text style={styles.subheading}>Kehadiran</Text>
          <View>
            <Text>Total Pertemuan: {attendanceSummary.totalMeetings}</Text>
            <Text>Hadir: {attendanceSummary.hadir}</Text>
            <Text>Izin: {attendanceSummary.izin}</Text>
            <Text>Sakit: {attendanceSummary.sakit}</Text>
            <Text>Alpha: {attendanceSummary.alpha}</Text>
            <Text>Persentase Kehadiran: {attendanceSummary.percentage.toFixed(2)}%</Text>
          </View>
        </View>

        {/* Section 6: Teacher Notes */}
        {teacherNotes && (
          <View style={styles.section}>
            <Text style={styles.subheading}>Catatan Guru</Text>
            <Text>{teacherNotes}</Text>
          </View>
        )}
      </Page>
    </Document>
  )
}
```

---

### Step 7.2: Update PDF Generation Function

**File to Update**: `src/app/(admin)/rapot/[studentId]/components/StudentReportDetailClient.tsx`

```typescript
// When generating PDF, fetch all new data:

const handleGeneratePDF = async () => {
  // Fetch student biodata
  const biodataResult = await getStudentBiodata(studentId)

  // Fetch attendance summary
  const attendanceResult = await getStudentAttendanceSummary(
    studentId,
    academicYearId,
    semester
  )

  // Fetch character values
  const characterValuesResult = await getStudentCharacterValues(
    studentId,
    academicYearId,
    semester
  )

  // Fetch extracurriculars
  const extracurricularsResult = await getStudentExtracurriculars(
    studentId,
    academicYearId,
    semester
  )

  // Fetch grades (existing logic)
  const gradesResult = await getStudentGrades(studentId, academicYearId, semester)

  // Generate PDF with all data
  const pdfBlob = await pdf(
    <PDFReportDocument
      student={biodataResult.data}
      academicYear={academicYear}
      semester={semester}
      grades={gradesResult.data}
      attendanceSummary={attendanceResult.data}
      characterValues={characterValuesResult.data}
      extracurriculars={extracurricularsResult.data}
      teacherNotes={report.teacher_notes}
    />
  ).toBlob()

  // Download logic
  const url = URL.createObjectURL(pdfBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Rapor_${student.name}_${academicYear.name}_Semester_${semester}.pdf`
  link.click()
}
```

---

**Phase 7 Complete**: PDF report now includes all new data!

---

---

## Critical Files to Modify/Create

### Database Migrations (Create)
1. `supabase/migrations/20251210_cleanup_old_rapot_tables.sql` - Drop 5 old tables
2. `supabase/migrations/20251210_create_report_sections.sql` - Create 2 new tables
3. `supabase/migrations/20251210_alter_existing_tables.sql` - Alter 3 tables
4. `supabase/migrations/20251210_add_student_biodata.sql` - Add 15 biodata columns

### Types & Interfaces (Create/Update)
1. `src/app/(admin)/rapot/types.ts` - Update with new structures
2. `src/app/(admin)/users/siswa/types.ts` - Add StudentBiodata interface

### Server Actions (Update/Create)
1. `src/app/(admin)/rapot/actions.ts` - Complete rewrite (read from material_progress)
2. `src/app/(admin)/users/siswa/actions.ts` - Add biodata CRUD functions
3. `src/app/(admin)/rapot/settings/actions.ts` - Template management CRUD

### UI Components (Create/Update)
1. `src/app/(admin)/rapot/settings/components/TemplateBuilder.tsx` - NEW
2. `src/app/(admin)/rapot/settings/components/MaterialSelector.tsx` - NEW
3. `src/app/(admin)/rapot/settings/components/SectionConfig.tsx` - NEW
4. `src/app/(admin)/rapot/[studentId]/components/StudentReportView.tsx` - UPDATE
5. `src/app/(admin)/rapot/components/PDFReportDocument.tsx` - UPDATE
6. `src/app/(admin)/users/siswa/components/StudentProfileView.tsx` - NEW
7. `src/app/(admin)/users/siswa/components/StudentBiodataModal.tsx` - NEW

### Pages (Update)
1. `src/app/(admin)/rapot/settings/page.tsx` - Template management UI
2. `src/app/(admin)/rapot/[studentId]/page.tsx` - Student rapot display
3. `src/app/(admin)/users/siswa/[id]/page.tsx` - Student detail with biodata

---

## Implementation Summary

### What Gets Deleted
- ❌ 5 database tables (with all their data)
- ❌ All code in `src/app/(admin)/rapot/` that uses old tables
- ❌ Old report subjects & grades entry UI

### What Gets Created
- ✅ 2 new database tables (report_sections, report_section_items)
- ✅ 1 new column in student_material_progress (grade)
- ✅ 15 new columns in students (biodata)
- ✅ 1 new column in student_reports (template_id)
- ✅ Complete template management UI
- ✅ New rapot display reading from material_progress
- ✅ Student biodata UI (view + edit)

### What Gets Updated
- 🔄 `student_material_progress` - Becomes single source of truth
- 🔄 `student_reports` - Links to template, removes average_score
- 🔄 `report_templates` - Continues to work, gets sections
- 🔄 Rapot actions - Completely rewritten to use new structure
- 🔄 PDF template - Updated to show biodata + new format

### Data Flow (New System)
```
1. Admin creates template → report_templates + report_sections + report_section_items
2. Admin selects materi items (from any level) → report_section_items
3. Teacher inputs grades → student_material_progress (hafal/nilai/grade)
4. Rapot reads template → filters material_progress by template items
5. PDF generated → shows biodata + grades grouped by section + attendance
```

---

## Testing Checklist

### Database Testing
- [ ] All 4 migrations run successfully without errors
- [ ] 5 old tables dropped successfully (no foreign key errors)
- [ ] 2 new tables created (report_sections, report_section_items)
- [ ] 15 biodata columns added to `students` table
- [ ] `grade` column added to `student_material_progress`
- [ ] `template_id` column added to `student_reports`
- [ ] `average_score` column removed from `student_reports`
- [ ] RLS policies work correctly (users can read, admins can write)

### Student Biodata Testing
- [ ] Student profile view displays all 14 fields correctly
- [ ] Edit modal opens and closes properly
- [ ] All 4 tabs (Identity, Contact, Parent, Guardian) navigate correctly
- [ ] Form validation works (required fields, date format, etc.)
- [ ] Biodata updates save successfully
- [ ] Changes reflect immediately after save

### Attendance Integration Testing
- [ ] Attendance summary calculates correctly (H/I/S/A counts)
- [ ] Percentage calculation is accurate
- [ ] "Sinkronisasi Kehadiran" button works
- [ ] Confirmation modal shows correct preview
- [ ] Data syncs to student_reports table
- [ ] Sync timestamp updates correctly

### Character Values Testing
- [ ] All 13 Nilai Luhur display in correct order
- [ ] Descriptions can be edited and saved
- [ ] "Simpan Semua" button saves all at once
- [ ] Individual "Simpan" buttons work per row
- [ ] Changes persist after page reload
- [ ] View-only mode works (when isEditable=false)

### Extracurricular Testing
- [ ] All 4 activities display correctly
- [ ] Grade dropdown (A/B/C/D) works
- [ ] Description textarea saves correctly
- [ ] "Simpan Semua" and individual save buttons work
- [ ] Changes persist after page reload
- [ ] View-only mode works (when isEditable=false)

### PDF Report Testing
- [ ] PDF generates without errors
- [ ] Student biodata appears correctly in PDF
- [ ] Academic grades render properly
- [ ] Character values table displays correctly
- [ ] Extracurricular table displays correctly
- [ ] Attendance summary shows accurate data
- [ ] Teacher notes appear if present
- [ ] PDF downloads with correct filename
- [ ] PDF formatting is readable and properly aligned

### Performance Testing
- [ ] Page loads within 2 seconds
- [ ] No console errors during normal usage
- [ ] Data fetching uses SWR caching efficiently
- [ ] No duplicate network requests
- [ ] PDF generation completes within 5 seconds

---

## Rollback Plan

If any issues occur during implementation:

### Phase 1 Rollback (Database)
```sql
-- Rollback biodata columns
ALTER TABLE students
  DROP COLUMN IF EXISTS nomor_induk,
  DROP COLUMN IF EXISTS tempat_lahir,
  DROP COLUMN IF EXISTS tanggal_lahir,
  DROP COLUMN IF EXISTS anak_ke,
  DROP COLUMN IF EXISTS alamat,
  DROP COLUMN IF EXISTS nomor_telepon,
  DROP COLUMN IF EXISTS nama_ayah,
  DROP COLUMN IF EXISTS nama_ibu,
  DROP COLUMN IF EXISTS alamat_orangtua,
  DROP COLUMN IF EXISTS telepon_orangtua,
  DROP COLUMN IF EXISTS pekerjaan_ayah,
  DROP COLUMN IF EXISTS pekerjaan_ibu,
  DROP COLUMN IF EXISTS nama_wali,
  DROP COLUMN IF EXISTS alamat_wali,
  DROP COLUMN IF EXISTS pekerjaan_wali;

-- Rollback character values tables
DROP TABLE IF EXISTS student_character_values;
DROP TABLE IF EXISTS character_value_aspects;

-- Rollback extracurriculars tables
DROP TABLE IF EXISTS student_extracurriculars;
DROP TABLE IF EXISTS extracurricular_activities;
```

### Phase 2-7 Rollback (Code)
Simply revert the code changes via Git:
```bash
git checkout main -- src/app/(admin)/users/siswa/
git checkout main -- src/app/(admin)/rapot/
```

---

## Notes for Implementation

1. **Start with Database**: Always complete Phase 1 first before any code changes
2. **Test Incrementally**: Test each phase before moving to the next
3. **Use TypeScript**: Ensure all types are properly defined to avoid runtime errors
4. **Error Handling**: Add try-catch blocks and user-friendly error messages
5. **Loading States**: Show loading indicators during async operations
6. **Validation**: Add form validation for required fields and data formats
7. **Permissions**: Ensure RLS policies match your existing patterns
8. **Responsive Design**: Test UI on mobile, tablet, and desktop
9. **Accessibility**: Ensure forms are keyboard navigable and screen-reader friendly
10. **Documentation**: Update user docs after completing each phase

---

## Implementation Status

- [ ] Phase 1: Database Migrations
- [ ] Phase 2: Student Biodata UI
- [ ] Phase 3: Attendance Integration
- [ ] Phase 5: Character Values Integration
- [ ] Phase 6: Extracurricular Integration
- [ ] Phase 4: Materi Integration (PENDING USER INPUT)
- [ ] Phase 7: PDF Report Update

---

## Contact & Support

If you encounter issues during implementation:
1. Check browser console for errors
2. Check Supabase logs for database errors
3. Review RLS policies if data doesn't appear
4. Ensure migrations ran successfully
5. Test with a fresh user account

---

**End of Implementation Plan**

This plan is complete and ready for implementation. Each phase can be executed independently (except Phase 4 which needs clarification). Follow the step-by-step instructions, test thoroughly, and you'll have a fully integrated Rapot system!
