export interface AcademicYear {
    id: string;
    name: string; // "2024/2025"
    start_year: number;
    end_year: number;
    start_date: string; // ISO date
    end_date: string; // ISO date
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface AcademicYearInput {
    name: string;
    start_year: number;
    end_year: number;
    start_date: string;
    end_date: string;
}

export interface StudentEnrollment {
    id: string;
    student_id: string;
    class_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    enrollment_date: string;
    status: 'active' | 'graduated' | 'transferred' | 'dropped';
    notes?: string;
    created_at: string;
    updated_at: string;

    // Joined data (optional, populated by queries with joins)
    student?: {
        id: string;
        name: string;
        nis?: string;
        [key: string]: any;
    };
    class?: {
        id: string;
        name: string;
        [key: string]: any;
    };
    academic_year?: AcademicYear;
}

export interface EnrollmentInput {
    student_id: string;
    class_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    enrollment_date?: string;
    status?: 'active' | 'graduated' | 'transferred' | 'dropped';
    notes?: string;
}
