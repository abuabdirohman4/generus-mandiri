// TypeScript types for learning materials
export interface MaterialContent {
  quran?: {
    title: string
    items: string[]
  }
  hafalan?: {
    title: string
    items: Array<string | {
      title?: string
      arabic?: string
      latin?: string
      meaning?: string
      reference?: string
    }>
  }
  doa?: {
    title: string
    items: Array<string | {
      title?: string
      arabic?: string
      latin?: string
      meaning?: string
      reference?: string
    }>
  }
  akhlaq?: {
    title: string
    items: Array<string | {
      title?: string
      arabic?: string
      latin?: string
      meaning?: string
      reference?: string
    }>
  }
  hadits?: {
    title: string
    items: Array<string | {
      title?: string
      arabic?: string
      latin?: string
      meaning?: string
      reference?: string
    }>
  }
  kamis?: {
    title: string
    items: string[]
  }
  jumat?: {
    title: string
    items: string[]
  }
  sabtu?: {
    title: string
    items: string[]
  }
}

export interface LearningMaterial {
  id: string
  class_master_id: string
  semester: number
  month: number
  week: number
  day_of_week: number
  content: MaterialContent
  created_at: string
  updated_at: string
}

export interface MaterialFilters {
  classMasterId?: string
  semester?: number
  month?: number
  week?: number
  dayOfWeek?: number
}

export interface ClassMaster {
  id: string
  name: string
  category_id: string
}

// Utility types
export type Semester = 1 | 2
export type Month = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
export type Week = 1 | 2 | 3 | 4
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 // 1=Senin, 6=Sabtu

// Helper functions
export const getDayName = (dayOfWeek: DayOfWeek): string => {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  return days[dayOfWeek - 1]
}

export const getMonthName = (month: Month): string => {
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]
  return months[month - 1]
}

export const romanNumeral = (week: Week): string => {
  const numerals = ['I', 'II', 'III', 'IV']
  return numerals[week - 1]
}

export const getSemesterMonths = (semester: Semester): Month[] => {
  return semester === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12]
}
