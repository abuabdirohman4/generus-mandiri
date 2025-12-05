export interface ReportSubject {
    id: string;
    material_type_id: string;
    display_name: string;
    code: string;
    display_order: number;
    is_active: boolean;
    is_required: boolean;
    grading_type: 'numeric' | 'letter' | 'both';
    created_at: string;
    updated_at: string;

    // Optional joined data
    material_type?: {
        id: string;
        name: string;
    };
}

export interface ReportTemplate {
    id: string;
    name: string;
    class_id?: string | null;
    academic_year_id?: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;

    // Optional joined data
    subjects?: ReportTemplateSubject[];
    class?: {
        id: string;
        name: string;
    };
    academic_year?: {
        id: string;
        name: string;
    };
}

export interface ReportTemplateSubject {
    id: string;
    template_id: string;
    subject_id: string;
    is_required: boolean;
    display_order: number;
    created_at: string;

    // Optional joined data
    subject?: ReportSubject;
}

export interface StudentGrade {
    id: string;
    student_id: string;
    subject_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    score?: number | null;
    grade?: string | null;
    description?: string | null;
    teacher_id?: string | null;
    created_at: string;
    updated_at: string;

    // Optional joined data
    subject?: ReportSubject;
    student?: {
        id: string;
        name: string;
    };
}

export interface StudentCharacterAssessment {
    id: string;
    student_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    character_aspect: string;
    grade?: string | null;
    description?: string | null;
    created_at: string;
    updated_at: string;
}

export interface StudentReport {
    id: string;
    student_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    class_id: string;
    average_score?: number | null;
    class_rank?: number | null;
    attendance_percentage?: number | null;
    sick_days: number;
    permission_days: number;
    absent_days: number;
    teacher_notes?: string | null;
    teacher_id?: string | null;
    generated_at?: string | null;
    is_published: boolean;
    created_at: string;
    updated_at: string;

    // Joined data
    student?: {
        id: string;
        name: string;
        nis?: string;
    };
    class?: {
        id: string;
        name: string;
    };
    academic_year?: {
        id: string;
        name: string;
    };
    grades?: StudentGrade[];
    character_assessments?: StudentCharacterAssessment[];
}

// Input Types
export interface GradeInput {
    student_id: string;
    subject_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    score?: number;
    grade?: string;
    description?: string;
}

export interface CharacterAssessmentInput {
    student_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    character_aspect: string;
    grade?: string;
    description?: string;
}

export interface ReportTemplateInput {
    name: string;
    class_id?: string;
    academic_year_id?: string;
    is_active?: boolean;
    subject_ids?: string[]; // Simplified input for creating template with subjects
}

export interface PDFExportOptions {
    pageSize?: 'A4' | 'Letter';
    orientation?: 'portrait' | 'landscape';
    margin?: { top: number; right: number; bottom: number; left: number };
    includePageNumbers?: boolean;
    includeWatermark?: boolean;
}
