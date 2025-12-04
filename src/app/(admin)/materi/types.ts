// Types for existing components
export interface ClassMaster {
  id: string;
  name: string;
  semester?: number | null; // Semester info from material_item_classes mapping
  category?: {
    id: string;
    code: string;
    name: string;
  };
}

// New flexible material structure types
export interface MaterialCategory {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface MaterialType {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
  category?: MaterialCategory;
}

export interface MaterialItem {
  id: string;
  material_type_id: string;
  name: string;
  description: string | null;
  content: string | null;
  created_at: string;
  updated_at: string;
  material_type?: MaterialType;
  classes?: ClassMaster[]; // Classes this item is mapped to
}

export interface MaterialItemClass {
  id: string;
  material_item_id: string;
  class_master_id: string;
  semester: number | null; // 1 = Ganjil, 2 = Genap
  created_at: string;
  updated_at: string;
  material_item?: MaterialItem;
  class_master?: ClassMaster;
}

export interface DayMaterialAssignment {
  id: string;
  class_master_id: string;
  semester: number;
  month: number;
  week: number;
  day_of_week: number;
  material_type_id: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  material_type?: MaterialType;
  items?: DayMaterialItem[];
}

export interface DayMaterialItem {
  id: string;
  assignment_id: string;
  material_item_id: string;
  display_order: number;
  custom_content: string | null;
  created_at: string;
  updated_at: string;
  material_item?: MaterialItem;
}

export type Semester = 1 | 2;
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Week = 1 | 2 | 3 | 4;
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6;

// Utility functions
export function getDayName(day: DayOfWeek): string {
  const days = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat',
    6: 'Sabtu'
  };
  return days[day];
}

export function romanNumeral(week: Week): string {
  const numerals = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV'
  };
  return numerals[week];
}

export function getMonthName(month: Month): string {
  const months = {
    1: 'Januari',
    2: 'Februari',
    3: 'Maret',
    4: 'April',
    5: 'Mei',
    6: 'Juni',
    7: 'Juli',
    8: 'Agustus',
    9: 'September',
    10: 'Oktober',
    11: 'November',
    12: 'Desember'
  };
  return months[month];
}

export function getSemesterMonths(semester: Semester): Month[] {
  if (semester === 1) {
    return [1, 2, 3, 4, 5, 6]; // Januari - Juni
  } else {
    return [7, 8, 9, 10, 11, 12]; // Juli - Desember
  }
}