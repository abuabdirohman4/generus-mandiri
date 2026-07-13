export interface MaterialProgress {
    id: string;
    student_id: string;
    material_item_id: string;
    academic_year_id: string;
    semester: 1 | 2;

    // FLEXIBLE SCORING:
    done?: boolean;   // Quick checkbox mode
    nilai?: number;   // Detailed score mode (0-100)
    // Display logic: nilai takes priority, fallback to done

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
    done?: boolean;   // For checkbox mode
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
    total_done: number;
    total_belum: number;
    average_score: number; // Average nilai
    percentage: number;
}

export interface MaterialProgressSummary {
    material_id: string;
    material_name: string;
    students_done: number;
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
    return progress.done ? 100 : 0;
}

// ─── Monthly Target Progress ──────────────────────────────────────────────────

export interface MonthlyTargetProgress {
  month: number
  total_targets: number
  completed: number  // nilai >= passing_score
  percentage: number // (completed / total_targets) * 100
}

export interface CrossClassHistoryItem {
  progress: MaterialProgress | null  // null = belum pernah diisi
  material_item: {
    id: string
    name: string
    material_type?: {
      id: string
      name: string
    }
  }
  academic_year_name: string
  class_master_name: string
  class_master_id: string
  academic_year_id: string
  semester: 1 | 2
}
