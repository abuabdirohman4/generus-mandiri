// Types for existing components - re-exported from centralized type files
import type { ClassMaster } from '@/types/class'
import type {
  MaterialCategory,
  MaterialType,
  MaterialItem,
  MaterialItemClass,
  DayMaterialAssignment,
  DayMaterialItem,
  Semester,
  Month,
  Week,
  DayOfWeek,
} from '@/types/material'

export type {
  ClassMaster,
  MaterialCategory,
  MaterialType,
  MaterialItem,
  MaterialItemClass,
  DayMaterialAssignment,
  DayMaterialItem,
  Semester,
  Month,
  Week,
  DayOfWeek,
}

// Utility functions
export function getDayName(day: DayOfWeek): string {
  const days: Record<DayOfWeek, string> = {
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
  const numerals: Record<Week, string> = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV'
  };
  return numerals[week];
}

export function getMonthName(month: Month): string {
  const months: Record<Month, string> = {
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