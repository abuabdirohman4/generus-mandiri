/**
 * Student Transform - Data transformation layer
 *
 * This module contains ONLY data transformation logic.
 * Transforms raw database rows to domain models.
 *
 * All functions are pure (no side effects, no database access).
 */

import type { StudentRow } from '@/repositories/studentRepository'
import type { StudentWithClasses } from '@/types/student'

// ============================================================================
// ORGANIZATIONAL NAME EXTRACTION
// ============================================================================

/**
 * Safely extract daerah name (handles array/object variations)
 */
export function extractDaerahName(daerah: any): string {
  if (!daerah) return ''

  if (Array.isArray(daerah)) {
    if (
      daerah.length > 0 &&
      daerah[0] &&
      typeof daerah[0] === 'object' &&
      'name' in daerah[0]
    ) {
      return String((daerah[0] as any).name || '')
    }
    return ''
  }

  if (typeof daerah === 'object' && daerah !== null && 'name' in daerah) {
    return String((daerah as any).name || '')
  }

  return ''
}

/**
 * Safely extract desa name (handles array/object variations)
 */
export function extractDesaName(desa: any): string {
  if (!desa) return ''

  if (Array.isArray(desa)) {
    if (
      desa.length > 0 &&
      desa[0] &&
      typeof desa[0] === 'object' &&
      'name' in desa[0]
    ) {
      return String((desa[0] as any).name || '')
    }
    return ''
  }

  if (typeof desa === 'object' && desa !== null && 'name' in desa) {
    return String((desa as any).name || '')
  }

  return ''
}

/**
 * Safely extract kelompok name (handles array/object variations)
 */
export function extractKelompokName(kelompok: any): string {
  if (!kelompok) return ''

  if (Array.isArray(kelompok)) {
    if (
      kelompok.length > 0 &&
      kelompok[0] &&
      typeof kelompok[0] === 'object' &&
      'name' in kelompok[0]
    ) {
      return String((kelompok[0] as any).name || '')
    }
    return ''
  }

  if (typeof kelompok === 'object' && kelompok !== null && 'name' in kelompok) {
    return String((kelompok as any).name || '')
  }

  return ''
}

// ============================================================================
// CLASS EXTRACTION
// ============================================================================

/**
 * Extract classes from junction table (student_classes)
 */
export function extractStudentClasses(
  studentClasses: any[]
): Array<{ id: string; name: string }> {
  if (!Array.isArray(studentClasses) || studentClasses.length === 0) {
    return []
  }

  return studentClasses
    .filter((sc: any) => sc && sc.classes && typeof sc.classes === 'object')
    .map((sc: any) => sc.classes)
    .filter((cls: any) => cls && (cls.id || cls.name))
    .map((cls: any) => ({
      id: String(cls.id || ''),
      name: String(cls.name || ''),
    }))
}

/**
 * Get primary class (first class for backward compatibility)
 */
export function getPrimaryClass(
  classes: Array<{ id: string; name: string }>
): { id: string; name: string } | null {
  if (!classes || !Array.isArray(classes) || classes.length === 0) {
    return null
  }

  return classes[0]
}

// ============================================================================
// STUDENT TRANSFORMATION
// ============================================================================

/**
 * Transform single student row to domain model
 */
export function transformStudentRow(row: StudentRow): StudentWithClasses {
  const classes = extractStudentClasses(row.student_classes || [])
  const primaryClass = getPrimaryClass(classes)

  return {
    id: row.id,
    name: row.name,
    gender: row.gender,
    class_id: primaryClass?.id || row.class_id || null,
    class_name: primaryClass?.name || '',
    kelompok_id: row.kelompok_id,
    desa_id: row.desa_id,
    daerah_id: row.daerah_id,
    status: row.status || 'active',
    created_at: row.created_at,
    updated_at: row.updated_at,
    classes,
    daerah_name: extractDaerahName(row.daerah),
    desa_name: extractDesaName(row.desa),
    kelompok_name: extractKelompokName(row.kelompok),
  }
}

/**
 * Transform multiple student rows to domain models
 */
export function transformStudentRows(
  rows: StudentRow[] | null | undefined
): StudentWithClasses[] {
  if (!Array.isArray(rows) || rows.length === 0) {
    return []
  }

  return rows
    .filter((row) => row && typeof row === 'object')
    .map((row) => {
      try {
        return transformStudentRow(row)
      } catch (error) {
        console.error('Error transforming student row:', error, row)
        // Return minimal valid student object
        return {
          id: String(row.id || ''),
          name: String(row.name || ''),
          gender: row.gender || null,
          class_id: row.class_id || null,
          kelompok_id: row.kelompok_id || null,
          desa_id: row.desa_id || null,
          daerah_id: row.daerah_id || null,
          created_at: String(row.created_at || ''),
          updated_at: String(row.updated_at || ''),
          classes: [],
          class_name: '',
          daerah_name: '',
          desa_name: '',
          kelompok_name: '',
          status: row.status || 'active',
        }
      }
    })
}

// ============================================================================
// CLASS NAME ENRICHMENT (for backward compatibility)
// ============================================================================

/**
 * Enrich students with class names from a map
 * Used when students have class_id but no junction table entry
 */
export function enrichStudentClassNames(
  students: StudentWithClasses[],
  classNameMap: Map<string, string>
): StudentWithClasses[] {
  return students.map((student) => {
    // If student already has classes from junction table, don't modify
    if (student.classes && student.classes.length > 0) {
      return student
    }

    // If student has class_id but no classes array, add from map
    if (student.class_id) {
      const className = classNameMap.get(student.class_id) || 'Unknown Class'
      return {
        ...student,
        classes: [
          {
            id: student.class_id,
            name: className,
          },
        ],
      }
    }

    return student
  })
}
