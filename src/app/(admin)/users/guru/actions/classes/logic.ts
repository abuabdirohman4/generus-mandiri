/**
 * Classes Logic (Layer 2)
 *
 * Pure business logic for teacher class assignment operations.
 * NO 'use server' directive. No database access. No side effects.
 */

/**
 * Build teacher-class assignment mappings for bulk insert
 */
export function buildClassAssignmentMappings(
    teacherId: string,
    classIds: string[]
): Array<{ teacher_id: string; class_id: string }> {
    return classIds.map(classId => ({ teacher_id: teacherId, class_id: classId }))
}

/**
 * Transform teacher_classes query result to simplified format
 */
export function mapTeacherClassesToResult(rawClasses: any[]): Array<{
    id: string
    class_id: string
    class_name: string
    kelompok_id: string
}> {
    return (rawClasses || []).map((tc: any) => ({
        id: tc.id,
        class_id: tc.class_id,
        class_name: Array.isArray(tc.class) ? tc.class[0]?.name || '' : tc.class?.name || '',
        kelompok_id: Array.isArray(tc.class) ? tc.class[0]?.kelompok_id || '' : tc.class?.kelompok_id || '',
    }))
}

/**
 * Validate that classes are within Admin Desa scope
 */
export function validateClassesForDesa(
    classes: any[],
    desaId: string
): { valid: boolean; error?: string } {
    const invalidClasses = classes.filter(cls => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok
        return kelompok?.desa_id !== desaId
    })
    if (invalidClasses.length > 0) {
        return { valid: false, error: 'Beberapa kelas tidak berada dalam desa Anda' }
    }
    return { valid: true }
}

/**
 * Validate that classes are within Admin Daerah scope
 */
export function validateClassesForDaerah(
    classes: any[],
    daerahId: string
): { valid: boolean; error?: string } {
    const invalidClasses = classes.filter(cls => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok
        const desa = Array.isArray(kelompok?.desa) ? kelompok.desa[0] : kelompok?.desa
        return desa?.daerah_id !== daerahId
    })
    if (invalidClasses.length > 0) {
        return { valid: false, error: 'Beberapa kelas tidak berada dalam daerah Anda' }
    }
    return { valid: true }
}

/**
 * Validate that classes belong to Admin Kelompok's kelompok
 */
export function validateClassesForKelompok(
    classes: any[],
    kelompokId: string
): { valid: boolean; error?: string } {
    const invalidClasses = classes.filter(cls => cls.kelompok_id !== kelompokId)
    if (invalidClasses.length > 0) {
        return { valid: false, error: 'Anda hanya dapat menambahkan atau menghapus kelas dari kelompok Anda sendiri' }
    }
    return { valid: true }
}
