/**
 * Helper functions for checking class types
 */

export interface ClassData {
  name?: string
  class_master_mappings?: Array<{
    class_master?: {
      id?: string
      name?: string
      category?: {
        id?: string
        code?: string
        name?: string
      }
    } | Array<{
      id?: string
      name?: string
      category?: {
        id?: string
        code?: string
        name?: string
      }
    }>
  }>
}

/**
 * Check if a class is Caberawit (Paud/Kelas 1-6) based on category from class_master
 * Returns true if the class has a class_master with category code 'CABERAWIT' or 'PAUD' (case-insensitive)
 */
export function isCaberawitClass(classData: ClassData): boolean {
  console.log("function isCaberawitClass classData", classData)
  if (!classData.class_master_mappings || classData.class_master_mappings.length === 0) {
    return false
  }
  
  return classData.class_master_mappings.some(mapping => {
    // Handle both object and array formats from Supabase
    const classMaster = Array.isArray(mapping.class_master) 
      ? mapping.class_master[0] 
      : mapping.class_master
    
    if (!classMaster || !classMaster.category) {
      return false
    }
    
    // Check category code (preferred) or category name
    const categoryCode = classMaster.category.code?.toUpperCase() || ''
    const categoryName = classMaster.category.name?.toUpperCase() || ''
    
    return categoryCode === 'CABERAWIT' || categoryCode === 'PAUD' ||
           categoryName === 'CABERAWIT' || categoryName === 'PAUD'
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

