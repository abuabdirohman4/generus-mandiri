export interface SimpleMaterialSection {
  id?: string;
  title: string;
  content: string;
}

export interface DayMaterial {
  class_master_id: string;
  semester: number;
  month: number;
  week: number;
  day_of_week: number; // 1-6 (Senin-Sabtu)
  content: SimpleMaterialSection;
}

// Types for existing components
export interface ClassMaster {
  id: string;
  name: string;
}

export type Semester = 1 | 2;
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export type Week = 1 | 2 | 3 | 4;
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6;

export interface LearningMaterial {
  id: string;
  class_master_id: string;
  semester: number;
  month: number;
  week: number;
  day_of_week: number;
  content: {
    quran?: string | { title?: string; items?: string[] };
    hafalan?: string | { title?: string; items?: string[] };
    doa?: string | { title?: string; items?: string[] };
    akhlaq?: string | { title?: string; items?: string[] };
    hadits?: string | { title?: string; items?: string[] };
    kamis?: string | { title?: string; items?: string[] };
    jumat?: string | { title?: string; items?: string[] };
    sabtu?: string | { title?: string; items?: string[] };
  };
  created_at: string;
  updated_at: string;
}

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