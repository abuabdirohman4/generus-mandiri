/**
 * Helper functions for checking class types
 */

import type { ClassData } from '@/types/class'

export type { ClassData }


/**
 * Check if a class is Caberawit (Paud/Kelas 1-6) based on class_master.category_group
 * Returns true if any class_master has category_group 'caberawit'
 */
export function isCaberawitClass(classData: ClassData): boolean {
  if (!classData.class_master_mappings || classData.class_master_mappings.length === 0) {
    return false
  }

  return classData.class_master_mappings.some(mapping => {
    // Handle both object and array formats from Supabase
    const classMaster = Array.isArray(mapping.class_master)
      ? mapping.class_master[0]
      : mapping.class_master

    return classMaster?.category_group === 'caberawit'
  })
}

/**
 * Check if a class is Teacher class (Pengajar)
 * Returns true if the class name contains 'pengajar' (case-insensitive)
 */
export function isTeacherClass(classData: ClassData): boolean {
  if (!classData.name) {
    return false
  }

  return classData.name.toLowerCase().includes('pengajar')
}

/**
 * Check if a class is eligible for Sambung Desa meetings
 * Returns true if class is NOT Caberawit (PAUD/Kelas 1-6) AND NOT Teacher class
 * Used to filter classes for Sambung Desa meeting type
 */
export function isSambungDesaEligible(classData: ClassData): boolean {
  return !isCaberawitClass(classData) && !isTeacherClass(classData)
}

/**
 * Check if a class name is a Pra Nikah class
 * Returns true if the name contains 'pra nikah' (case-insensitive)
 */
export function isPraNikahName(name: string): boolean {
  if (!name) return false
  return name.toLowerCase().includes('pra nikah')
}

/**
 * Check if a class is Pra Nikah class
 * Returns true if the class name contains 'pra nikah' (case-insensitive)
 */
export function isPraNikahClass(classData: ClassData): boolean {
  if (!classData.name) return false
  return isPraNikahName(classData.name)
}

