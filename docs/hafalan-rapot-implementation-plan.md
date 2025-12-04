# Implementation Plan: Academic Year, Hafalan Monitoring & E-Rapor System

## Overview
Implementasi sistem tahun ajaran, monitoring hafalan siswa, dan e-rapor akademik dengan support untuk multiple academic years, semester tracking, dan historical data.

## User Review Required

> [!IMPORTANT]
> **Breaking Changes & Data Migration**
> - Sistem tahun ajaran akan mengubah cara data siswa dan kelas di-track
> - Perlu migrasi data existing students ke enrollment tahun ajaran aktif
> - Hafalan dan rapot akan ter-scope ke tahun ajaran tertentu

> [!WARNING]
> **UI/UX Changes**
> - Semua halaman terkait (Hafalan, Rapot, Materi) akan menambahkan filter Tahun Ajaran & Semester
> - User perlu memilih tahun ajaran aktif saat pertama kali menggunakan fitur baru

---

## Phase 1: Academic Year System Foundation

### Database Schema

#### 1.1 Tabel `academic_years`
```sql
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(20) NOT NULL UNIQUE, -- "2024/2025", "2025/2026"
  start_year INT NOT NULL,
  end_year INT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_year_range UNIQUE(start_year, end_year),
  CONSTRAINT valid_year_range CHECK (end_year = start_year + 1)
);

-- Index untuk query performa
CREATE INDEX idx_academic_years_active ON academic_years(is_active) WHERE is_active = true;
CREATE INDEX idx_academic_years_dates ON academic_years(start_date, end_date);
```

#### 1.2 Tabel `student_enrollments`
```sql
CREATE TABLE student_enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'graduated', 'transferred', 'dropped')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_enrollment UNIQUE(student_id, academic_year_id, semester, class_id)
);

-- Indexes
CREATE INDEX idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX idx_enrollments_class ON student_enrollments(class_id);
CREATE INDEX idx_enrollments_year ON student_enrollments(academic_year_id);
CREATE INDEX idx_enrollments_active ON student_enrollments(status) WHERE status = 'active';
```

### Server Actions

#### [NEW] [actions/academic-years.ts](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/actions/academic-years.ts)
```typescript
'use server'

export async function getAcademicYears(): Promise<AcademicYear[]>
export async function getActiveAcademicYear(): Promise<AcademicYear | null>
export async function createAcademicYear(data: AcademicYearInput): Promise<AcademicYear>
export async function setActiveAcademicYear(id: string): Promise<void>
```

#### [NEW] [actions/enrollments.ts](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/actions/enrollments.ts)
```typescript
'use server'

export async function enrollStudent(data: EnrollmentInput): Promise<Enrollment>
export async function getStudentEnrollments(studentId: string): Promise<Enrollment[]>
export async function getClassEnrollments(classId: string, academicYearId: string, semester: number): Promise<Enrollment[]>
export async function updateEnrollmentStatus(id: string, status: string): Promise<void>
```

### UI Components

#### [NEW] [components/AcademicYearSelector.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/components/AcademicYearSelector.tsx)
- Dropdown untuk pilih tahun ajaran
- Dropdown untuk pilih semester (1/2)
- Auto-select active academic year
- Reusable di semua halaman (Hafalan, Rapot, Materi)

#### [NEW] [app/(admin)/settings/academic-years/page.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/settings/academic-years/page.tsx)
- CRUD tahun ajaran
- Set tahun ajaran aktif
- View enrollment statistics per tahun

---

## Phase 2: Hafalan Monitoring System

### Database Schema

#### 2.1 Tabel `material_categories` (Extend existing)
```sql
-- Kategori hafalan: Do'a Harian, Surat Pendek, Asmaul Husna, dll
-- Sudah ada di sistem materi, tinggal digunakan
```

#### 2.2 Tabel `student_material_progress`
```sql
CREATE TABLE student_material_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  material_item_id UUID NOT NULL REFERENCES material_items(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  status VARCHAR(20) NOT NULL DEFAULT 'belum' CHECK (status IN ('hafal', 'belum', 'ket')),
  completion_date DATE,
  notes TEXT,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_progress UNIQUE(student_id, material_item_id, academic_year_id, semester)
);

-- Indexes
CREATE INDEX idx_progress_student ON student_material_progress(student_id);
CREATE INDEX idx_progress_material ON student_material_progress(material_item_id);
CREATE INDEX idx_progress_year_semester ON student_material_progress(academic_year_id, semester);
CREATE INDEX idx_progress_status ON student_material_progress(status);
```

### Server Actions

#### [NEW] [app/(admin)/hafalan/actions.ts](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/hafalan/actions.ts)
```typescript
'use server'

export async function getStudentProgress(studentId: string, academicYearId: string, semester: number): Promise<MaterialProgress[]>
export async function getClassProgress(classId: string, academicYearId: string, semester: number): Promise<ClassProgressSummary>
export async function updateMaterialProgress(data: ProgressInput): Promise<void>
export async function bulkUpdateProgress(updates: ProgressInput[]): Promise<void>
export async function getMaterialsByCategory(categoryId: string, classId: string, semester: number): Promise<MaterialItem[]>
```

### UI Pages & Components

#### [NEW] [app/(admin)/hafalan/page.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/hafalan/page.tsx)
**Layout:**
- **Header:** 
  - Dropdown: Tahun Ajaran
  - Dropdown: Semester (1/2)
  - Dropdown: Kelas
- **Content:**
  - Tabs per kategori hafalan (Do'a Harian, Surat Pendek, Asmaul Husna)
  - Table dengan kolom: No, Nama Materi, [Siswa 1], [Siswa 2], ... [Siswa N]
  - Cell: Checkbox atau status badge (Hafal ✓, Belum -, Ket)
  - Inline editing untuk cepat update status

#### [NEW] [app/(admin)/hafalan/[studentId]/page.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/hafalan/[studentId]/page.tsx)
**Detail Progress Individual:**
- Header: Info siswa + filter tahun/semester
- List semua materi dengan status progress
- Timeline/history progress

---

## Phase 3: E-Rapor System

### Database Schema

#### 3.1 Reuse Existing Material Structure

**TIDAK PERLU tabel `report_categories` baru!**

Kita akan **reuse** tabel yang sudah ada:
- `material_categories` → Untuk grouping (Alim, Fiqih, Akhlak, dll)
- `material_types` → Untuk subject di rapot (Bacaan Quran, Hafalan, dll)

#### 3.2 Tabel `report_subjects` (Konfigurasi Subject untuk Rapot)
```sql
CREATE TABLE report_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_type_id UUID NOT NULL REFERENCES material_types(id),
  display_name VARCHAR(100) NOT NULL, -- Nama untuk tampilan di rapot (bisa beda dari material_type.name)
  code VARCHAR(50) NOT NULL UNIQUE,
  display_order INT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_required BOOLEAN DEFAULT true, -- Wajib diisi atau tidak
  grading_type VARCHAR(20) DEFAULT 'numeric' CHECK (grading_type IN ('numeric', 'letter', 'both')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed data examples (link ke material_types yang sudah ada)
INSERT INTO report_subjects (material_type_id, display_name, code, display_order, grading_type) VALUES
((SELECT id FROM material_types WHERE name LIKE '%Bacaan%'), 'Bacaan Al Quran', 'bacaan_quran', 1, 'both'),
((SELECT id FROM material_types WHERE name LIKE '%Hafalan%'), 'Hafalan Juz 30', 'hafalan_juz30', 2, 'both'),
((SELECT id FROM material_types WHERE name LIKE '%Imla%' OR name LIKE '%Tulis%'), 'Tulis Arab (Imla)', 'tulis_arab', 3, 'both');

-- Indexes
CREATE INDEX idx_report_subjects_material_type ON report_subjects(material_type_id);
CREATE INDEX idx_report_subjects_active ON report_subjects(is_active) WHERE is_active = true;
```

#### 3.2.1 Tabel `report_templates` (Konfigurasi Rapot)
```sql
CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  class_id UUID REFERENCES classes(id), -- NULL = template global, tidak NULL = template per kelas
  academic_year_id UUID REFERENCES academic_years(id), -- NULL = berlaku semua tahun
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction table untuk subject yang diinclude di template
CREATE TABLE report_template_subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES report_subjects(id),
  is_required BOOLEAN DEFAULT true, -- Apakah wajib diisi
  display_order INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_template_subject UNIQUE(template_id, subject_id)
);

-- Indexes
CREATE INDEX idx_templates_class ON report_templates(class_id);
CREATE INDEX idx_templates_year ON report_templates(academic_year_id);
CREATE INDEX idx_template_subjects_template ON report_template_subjects(template_id);
```

#### 3.3 Tabel `student_grades`
```sql
CREATE TABLE student_grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES report_subjects(id),
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  score DECIMAL(5,2), -- 0-100
  grade VARCHAR(5), -- A, B+, B, C, D
  description TEXT,
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_grade UNIQUE(student_id, subject_id, academic_year_id, semester)
);

-- Indexes
CREATE INDEX idx_grades_student ON student_grades(student_id);
CREATE INDEX idx_grades_subject ON student_grades(subject_id);
CREATE INDEX idx_grades_year_semester ON student_grades(academic_year_id, semester);
```

#### 3.4 Tabel `student_character_assessments`
```sql
CREATE TABLE student_character_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  character_aspect VARCHAR(100) NOT NULL, -- 'jujur', 'amanah', 'berhemat', dll
  grade VARCHAR(5), -- A, B, C
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_character UNIQUE(student_id, academic_year_id, semester, character_aspect)
);
```

#### 3.5 Tabel `student_reports`
```sql
CREATE TABLE student_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES academic_years(id),
  semester INT NOT NULL CHECK (semester IN (1, 2)),
  class_id UUID NOT NULL REFERENCES classes(id),
  
  -- Calculated fields
  average_score DECIMAL(5,2),
  class_rank INT,
  attendance_percentage DECIMAL(5,2),
  
  -- Attendance details
  sick_days INT DEFAULT 0,
  permission_days INT DEFAULT 0,
  absent_days INT DEFAULT 0,
  
  -- Teacher notes
  teacher_notes TEXT,
  teacher_id UUID REFERENCES profiles(id),
  
  -- Report metadata
  generated_at TIMESTAMP,
  is_published BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_report UNIQUE(student_id, academic_year_id, semester)
);

-- Indexes
CREATE INDEX idx_reports_student ON student_reports(student_id);
CREATE INDEX idx_reports_year_semester ON student_reports(academic_year_id, semester);
CREATE INDEX idx_reports_published ON student_reports(is_published) WHERE is_published = true;
```

### Server Actions

#### [NEW] [app/(admin)/rapot/actions.ts](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/rapot/actions.ts)
```typescript
'use server'

// Grades
export async function getStudentGrades(studentId: string, academicYearId: string, semester: number): Promise<StudentGrade[]>
export async function updateGrade(data: GradeInput): Promise<void>
export async function bulkUpdateGrades(updates: GradeInput[]): Promise<void>
export async function calculateGradeFromScore(score: number): string

// Character Assessments
export async function getCharacterAssessments(studentId: string, academicYearId: string, semester: number): Promise<CharacterAssessment[]>
export async function updateCharacterAssessment(data: CharacterInput): Promise<void>

// Report Templates (Konfigurasi)
export async function getReportTemplates(classId?: string, academicYearId?: string): Promise<ReportTemplate[]>
export async function createReportTemplate(data: ReportTemplateInput): Promise<ReportTemplate>
export async function updateReportTemplate(id: string, data: ReportTemplateInput): Promise<void>
export async function getTemplateSubjects(templateId: string): Promise<ReportSubject[]>
export async function updateTemplateSubjects(templateId: string, subjectIds: string[]): Promise<void>

// Reports
export async function generateReport(studentId: string, academicYearId: string, semester: number): Promise<StudentReport>
export async function getStudentReport(studentId: string, academicYearId: string, semester: number): Promise<StudentReport>
export async function publishReport(reportId: string): Promise<void>
export async function getClassReports(classId: string, academicYearId: string, semester: number): Promise<StudentReport[]>

// Export PDF
export async function exportReportPDF(reportId: string, options?: PDFExportOptions): Promise<Blob>
export async function exportClassReportsPDF(classId: string, academicYearId: string, semester: number, options?: PDFExportOptions): Promise<Blob>
export async function exportBulkReportsPDF(studentIds: string[], academicYearId: string, semester: number): Promise<Blob>

// PDF Export Options
interface PDFExportOptions {
  pageSize?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  margin?: { top: number; right: number; bottom: number; left: number }
  includePageNumbers?: boolean
  includeWatermark?: boolean
}
```

### UI Pages & Components

#### [NEW] [app/(admin)/rapot/page.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/rapot/page.tsx)
**Class Report List:**
- Filter: Tahun Ajaran, Semester, Kelas
- Table: List siswa dengan quick stats (Rata-rata, Peringkat, Kehadiran)
- Actions: 
  - View Detail
  - Generate Report
  - Export PDF (single)
  - **Export All PDF** (bulk download semua siswa dalam 1 file ZIP)

#### [NEW] [app/(admin)/rapot/[studentId]/page.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/rapot/[studentId]/page.tsx)
**Student Report Detail (sesuai design UI yang sudah ada):**

**Header:**
- Dropdown: Tahun Ajaran
- Dropdown: Semester
- Button: Cetak (print-friendly layout)
- Button: PDF (download single PDF)

**Content:**
- Student Info Card (Nama, NIS, Kelas, Status)
- Quick Stats (Rata-rata, Peringkat, Kehadiran)
- Sections per kategori (dinamis berdasarkan template):
  - 📖 Alim: Baca-Tulis & Hafalan
  - 🕌 Fiqih & Ibadah
  - ⭐ Akhlakul Karimah
  - 📅 Rekap Kehadiran
  - 📝 Catatan Wali Kelas
- Footer (Tanda tangan)

**Sidebar:**
- Daftar Siswa (dengan search)
- Quick navigation antar siswa

**Print/PDF Features:**
- CSS `@media print` untuk layout print-friendly
- Auto page breaks setelah setiap kategori
- Margin optimal untuk printing (2cm all sides)
- Header/footer di setiap halaman (nama siswa, halaman)
- Option untuk include/exclude kategori tertentu saat export

#### [NEW] [app/(admin)/rapot/settings/page.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/app/(admin)/rapot/settings/page.tsx)
**Konfigurasi Template Rapot:**
- **Header:** Pilih Kelas (atau "Template Global")
- **Kategori List:** 
  - Tampilkan semua kategori (Alim, Fiqih, Akhlak, Ekskul)
  - Checkbox untuk enable/disable kategori
  - Drag & drop untuk reorder
- **Mata Pelajaran per Kategori:**
  - List semua subjects dalam kategori
  - Checkbox untuk include/exclude
  - Toggle "Wajib Diisi" atau "Opsional"
  - Drag & drop untuk reorder
- **Actions:**
  - Save Template
  - Preview Rapot dengan template ini
  - Reset to Default

#### [NEW] [components/GradeInput.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/components/GradeInput.tsx)
- Input nilai (0-100)
- Auto-calculate predikat (A/B/C/D)
- Textarea untuk deskripsi
- Validation

#### [NEW] [components/PDFExportModal.tsx](file:///Users/abuabdirohman/Documents/Open%20Source/school-management/src/components/PDFExportModal.tsx)
- Options untuk PDF export:
  - Page size (A4/Letter)
  - Orientation (Portrait/Landscape)
  - Include page numbers
  - Include watermark
  - Select categories to include
- Preview before download
- Progress bar untuk bulk export

---

## Phase 4: Integration & Auto-Calculation

### Hafalan → Rapot Integration

#### Logic untuk auto-populate nilai hafalan ke rapot:
```typescript
// Hitung persentase hafalan yang sudah selesai
const hafalanProgress = await getStudentProgress(studentId, academicYearId, semester)
const totalMaterials = hafalanProgress.length
const completedMaterials = hafalanProgress.filter(p => p.status === 'hafal').length
const score = (completedMaterials / totalMaterials) * 100

// Convert ke grade
const grade = calculateGradeFromScore(score)

// Update ke student_grades untuk subject 'hafalan'
await updateGrade({
  student_id: studentId,
  subject_id: hafalanSubjectId,
  academic_year_id: academicYearId,
  semester: semester,
  score: score,
  grade: grade,
  description: `${completedMaterials} dari ${totalMaterials} materi hafalan selesai`
})
```

### Absensi → Rapot Integration

#### Logic untuk sync data kehadiran:
```typescript
// Ambil data absensi dari tabel meetings/attendance
const attendanceData = await getStudentAttendance(studentId, academicYearId, semester)

// Update ke student_reports
await updateReport({
  student_id: studentId,
  academic_year_id: academicYearId,
  semester: semester,
  attendance_percentage: attendanceData.percentage,
  sick_days: attendanceData.sick,
  permission_days: attendanceData.permission,
  absent_days: attendanceData.absent
})
```

---

## Verification Plan

### Automated Tests
```bash
# Database migrations
npm run supabase:migration:test

# Server actions
npm run test:actions -- academic-years
npm run test:actions -- enrollments
npm run test:actions -- hafalan
npm run test:actions -- rapot

# Integration tests
npm run test:integration -- hafalan-to-rapot
```

### Manual Verification

1. **Academic Year System:**
   - [ ] Create tahun ajaran baru
   - [ ] Set tahun ajaran aktif
   - [ ] Enroll siswa ke kelas untuk tahun ajaran baru
   - [ ] Verify filter tahun ajaran muncul di semua halaman

2. **Hafalan Monitoring:**
   - [ ] Pilih kelas, tahun ajaran, semester
   - [ ] Input progress hafalan untuk beberapa siswa
   - [ ] Verify data tersimpan dengan benar
   - [ ] Verify inline editing works smoothly

3. **E-Rapor:**
   - [ ] Configure template rapot (pilih kategori & mata pelajaran)
   - [ ] Generate rapot untuk 1 siswa
   - [ ] Verify nilai hafalan auto-populate dari monitoring
   - [ ] Verify kehadiran auto-populate dari absensi
   - [ ] Input nilai manual untuk mata pelajaran lain
   - [ ] Preview & export PDF single student
   - [ ] Export bulk PDF untuk seluruh kelas
   - [ ] Verify layout print-friendly (margin, page breaks)
   - [ ] Test print dari browser (Ctrl+P)

4. **Cross-Year Testing:**
   - [ ] Create data untuk tahun ajaran 2024/2025
   - [ ] Create data untuk tahun ajaran 2025/2026
   - [ ] Verify data tidak tercampur
   - [ ] Verify siswa bisa naik kelas (enrollment baru)

---

## Migration Strategy

### Data Migration Script
```sql
-- Migrate existing students to current academic year
INSERT INTO student_enrollments (student_id, class_id, academic_year_id, semester, status)
SELECT 
  s.id,
  s.class_id,
  (SELECT id FROM academic_years WHERE is_active = true),
  1, -- Default semester 1
  'active'
FROM students s
WHERE s.deleted_at IS NULL
  AND s.class_id IS NOT NULL
ON CONFLICT DO NOTHING;
```

### Rollback Plan
- Backup database sebelum migration
- Keep old tables (jangan drop) sampai verifikasi selesai
- Provide script untuk rollback jika ada masalah

---

## Timeline Estimate

- **Phase 1 (Academic Year):** 3-4 days
- **Phase 2 (Hafalan):** 5-6 days
- **Phase 3 (E-Rapor):** 7-8 days
- **Phase 4 (Integration):** 2-3 days
- **Testing & Bug Fixes:** 3-4 days

**Total:** ~3-4 weeks

---

## Notes

- Semua filter (Tahun Ajaran, Semester, Kelas) harus konsisten di semua halaman
- Gunakan Zustand store untuk persist selected filters
- Implementasi lazy loading untuk data besar (banyak siswa)
- Pertimbangkan caching untuk data yang jarang berubah (academic years, subjects)
- PDF generation bisa menggunakan library seperti `react-pdf` atau `puppeteer`

## Phase 5: Materi Page UI Improvements (Semester Display)

### Problem Statement
- Materi sekarang sudah support semester (1 atau 2) di `material_item_classes`
- Tapi UI belum menampilkan informasi semester dengan jelas
- 95% data existing belum punya semester assignment

### Phased Approach

#### **Phase 5.1: Soft Launch - Badge & Filter**

**UI Changes:**
```
Sidebar (Kelas View):
Kelas 1 (127)
├─ Adab [S1] (30)          ← Badge untuk semester
├─ Adab [S2] (24)
├─ Hafalan Doa Harian [S1] (15)
├─ Akhlaq [-] (10)         ← Belum ada semester
└─ ...

Main Content:
Filter: [Kelas ▼] [Semester: Semua ▼]
                    ├─ Semua (default)
                    ├─ Semester 1
                    ├─ Semester 2
                    └─ Belum Dikategorikan
```

**Features:**
- Badge `[S1]`, `[S2]`, `[-]` di setiap item
- Dropdown filter semester di main content
- Bulk action: "Set Semester untuk Selected Items"

#### **Phase 5.2: Migration Tools**

### Implementation Approach

**Direct to Nested Structure** - Skip phased approach, langsung implementasi nested semester.

#### **UI Changes - Nested Semester:**
```
Sidebar (Kelas View):
Kelas 1 (127)
├─ 📅 Semester 1 (60)        ← Paling atas, always visible
│  ├─ Adab (30)
│  ├─ Hafalan Doa Harian (15)
│  └─ Baca Huruf Al Quran (15)
│  
├─ 📅 Semester 2 (50)        ← Kedua, always visible
│  ├─ Adab (24)
│  └─ Hafalan Surat Pendek (26)
│  
└─ ⚠️ Belum Dikategorikan (17)  ← Paling bawah, WARNING color
   ├─ Akhlaq (10)
   └─ Kemandirian (7)
```

**Key Features:**
- Semester 1 & 2 **always at top** - prioritas utama
- "Belum Dikategorikan" **at bottom** - jelas terlihat, warning color (amber)
- Collapsible sections dengan expand/collapse
- Count visible untuk tracking progress

#### **Bulk Update Modal - Class & Semester Assignment**

**Modal UI:**
```
┌─────────────────────────────────────────────────────┐
│ Update Mapping Kelas & Semester                     │
├─────────────────────────────────────────────────────┤
│ 15 materi terpilih                                  │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Pilih Kelas                                     │ │
│ │ ☑ Kelas 1A                                      │ │
│ │ ☑ Kelas 2 SD                                    │ │
│ │ ☐ Kelas 3 SD                                    │ │
│ │ ☐ Kelas 4 SD                                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Pilih Semester                                  │ │
│ │ ☑ Semester 1                                    │ │
│ │ ☑ Semester 2                                    │ │
│ └─────────────────────────────────────────────────┘ │
│                                                      │
│ Mode:                                                │
│ ○ Replace (hapus mapping lama, set yang baru)       │
│ ○ Add (tambah ke mapping yang sudah ada)            │
│                                                      │
│ Preview: Akan membuat 30 mapping baru               │
│ (15 materi × 2 kelas × 1 semester)                  │
│                                                      │
│ [Batal] [Update]                                     │
└─────────────────────────────────────────────────────┘
```

**Features:**
1. **Multi-select Kelas** - Pilih beberapa kelas sekaligus
2. **Multi-select Semester** - Pilih semester 1, 2, atau keduanya
3. **Mode Selection:**
   - **Replace:** Hapus mapping lama, set yang baru
   - **Add:** Tambah ke mapping existing (tidak hapus yang lama)
4. **Preview Count:** Tampilkan berapa mapping yang akan dibuat
5. **Load Existing Data:** Saat buka modal, checkbox sudah tercentang sesuai mapping existing

**Server Action:**
```typescript
export async function bulkUpdateMaterialMapping(
  materialItemIds: string[],
  classIds: string[],
  semesters: (1 | 2)[],
  mode: 'replace' | 'add'
): Promise<{
  success: boolean
  created: number
  deleted: number
}>
```

**Logic:**
```typescript
// Mode: Replace
1. Delete existing mappings untuk material items ini
2. Create new mappings: materialItemIds × classIds × semesters

// Mode: Add
1. Get existing mappings
2. Create only NEW combinations (skip duplicates)
3. Keep existing mappings intact
```

#### **Implementation Details**

**Component: BulkMappingUpdateModal.tsx**
```typescript
interface BulkMappingUpdateModalProps {
  isOpen: boolean
  onClose: () => void
  selectedMaterialIds: string[]
  onSuccess: () => void
}

const BulkMappingUpdateModal = ({ selectedMaterialIds, ... }) => {
  const [selectedClasses, setSelectedClasses] = useState<Set<string>>(new Set())
  const [selectedSemesters, setSelectedSemesters] = useState<Set<1 | 2>>(new Set())
  const [mode, setMode] = useState<'replace' | 'add'>('replace')
  
  // Load existing mappings untuk pre-select checkboxes
  useEffect(() => {
    loadExistingMappings(selectedMaterialIds).then(mappings => {
      const classes = new Set(mappings.map(m => m.class_id))
      const semesters = new Set(mappings.map(m => m.semester))
      setSelectedClasses(classes)
      setSelectedSemesters(semesters)
    })
  }, [selectedMaterialIds])
  
  // Calculate preview count
  const previewCount = selectedMaterialIds.length * 
                       selectedClasses.size * 
                       selectedSemesters.size
  
  return (
    <Modal>
      {/* Multi-select kelas */}
      {/* Multi-select semester */}
      {/* Mode radio buttons */}
      {/* Preview count */}
    </Modal>
  )
}
```

**Trigger Bulk Update:**
- Checkbox multi-select di table materi
- Button "Update Mapping" muncul saat ada item terpilih
- Shortcut: Select all in category/type

### Migration Checklist

**Implementation (Week 1-2):**
- [ ] Implement nested semester structure in sidebar
  - [ ] Semester 1 section (always first)
  - [ ] Semester 2 section (always second)
  - [ ] Belum Dikategorikan section (always last, warning color)
  - [ ] Collapsible functionality
- [ ] Create BulkMappingUpdateModal component
  - [ ] Multi-select kelas UI
  - [ ] Multi-select semester UI
  - [ ] Mode selection (Replace/Add)
  - [ ] Preview count
  - [ ] Load existing mappings
- [ ] Create bulk update server action
  - [ ] Handle replace mode
  - [ ] Handle add mode
  - [ ] Transaction safety
- [ ] Add multi-select UI to materi table
  - [ ] Checkbox column
  - [ ] Select all functionality
  - [ ] "Update Mapping" button

**Testing (Week 2):**
- [ ] Test nested structure display
- [ ] Test bulk update - replace mode
- [ ] Test bulk update - add mode
- [ ] Test existing data loading
- [ ] Test edge cases (empty selections, duplicates)

### Success Metrics

- **UI:** Nested structure clearly shows semester organization
- **UX:** Bulk update reduces time from 5 min → 30 sec for 20 items
- **Data Quality:** >80% of materials have semester assigned within 1 week

