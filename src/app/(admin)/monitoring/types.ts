export interface MaterialProgress {
    id: string;
    student_id: string;
    material_item_id: string;
    academic_year_id: string;
    semester: 1 | 2;

    // FLEXIBLE SCORING:
    hafal?: boolean;  // Quick checkbox mode
    nilai?: number;   // Detailed score mode (0-100)
    // Display logic: nilai takes priority, fallback to hafal

    notes?: string; // Kolom "Ket"
    completion_date?: string;
    teacher_id?: string;
    created_at: string;
    updated_at: string;

    // Joined data
    student?: {
        id: string;
        name: string;
        nis?: string;
    };
    material_item?: {
        id: string;
        name: string;
        description?: string;
    };
    teacher?: {
        id: string;
        full_name: string;
    };
}

export interface ProgressInput {
    student_id: string;
    material_item_id: string;
    academic_year_id: string;
    semester: 1 | 2;
    hafal?: boolean;  // For checkbox mode
    nilai?: number;   // For score mode (0-100)
    notes?: string;
    completion_date?: string;
}

export interface ClassProgressSummary {
    class_id: string;
    class_name: string;
    total_students: number;
    total_materials: number;
    progress_by_student: StudentProgressSummary[];
    progress_by_material: MaterialProgressSummary[];
}

export interface StudentProgressSummary {
    student_id: string;
    student_name: string;
    total_hafal: number;
    total_belum: number;
    average_score: number; // Average nilai
    percentage: number;
}

export interface MaterialProgressSummary {
    material_id: string;
    material_name: string;
    students_hafal: number;
    students_belum: number;
    average_score: number;
    completion_rate: number;
}

// Helper function to get display score
export function getDisplayScore(progress: MaterialProgress): number {
    // Priority: nilai > hafal
    if (progress.nilai !== null && progress.nilai !== undefined) {
        return progress.nilai;
    }
    return progress.hafal ? 100 : 0;
}

// Helper function to get predikat for rapot
export function getPredikat(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    return 'D';
}

// Helper function to get deskripsi predikat
export function getDeskripsiPredikat(score: number): string {
    if (score >= 90) return 'Terlampaui';
    if (score >= 80) return 'Memenuhi';
    if (score >= 70) return 'Cukup Memenuhi';
    return 'Tidak Memenuhi';
}

// Combined predikat with description
export function getPredikatWithDesc(score: number): { predikat: string; deskripsi: string } {
    return {
        predikat: getPredikat(score),
        deskripsi: getDeskripsiPredikat(score)
    };
}
