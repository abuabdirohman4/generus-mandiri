/**
 * Utility functions for determining student categories based on class names
 */

export function determineCategoryFromClassName(className: string): string {
  const lowerClassName = className.toLowerCase();
  
  if (lowerClassName.includes('paud')) return 'Paud';
  if (/kelas [1-6]/.test(lowerClassName)) return 'Caberawit';
  if (/pra remaja/.test(lowerClassName)) return 'Pra Remaja';
  if (/remaja|pra nikah/.test(lowerClassName)) return 'Remaja';
  if (/kelompok/.test(lowerClassName)) return 'Orang Tua';
  
  // Default fallback
  return 'Caberawit';
}

export function determineCategoryFromClassId(classId: string, className: string): string {
  // For now, use class name. In the future, we could store category in classes table
  return determineCategoryFromClassName(className);
}

export const CATEGORY_OPTIONS = [
  { value: 'Paud', label: 'Paud' },
  { value: 'Caberawit', label: 'Caberawit' },
  { value: 'Pra Remaja', label: 'Pra Remaja' },
  { value: 'Remaja', label: 'Remaja' },
  { value: 'Orang Tua', label: 'Orang Tua' }
] as const;

export type StudentCategory = typeof CATEGORY_OPTIONS[number]['value'];
