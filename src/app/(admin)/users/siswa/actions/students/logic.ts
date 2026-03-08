/**
 * Student Logic (Layer 2)
 *
 * Pure and async business logic for student operations.
 * NO 'use server' directive - testable without mocking.
 * Pure functions have no side effects.
 */

import type { StudentWithClasses } from '@/types/student'

/**
 * Transform raw Supabase student records into StudentWithClasses.
 * Accepts optional classNameMap for resolving class names when junction table
 * entries are missing (backward compatibility for teacher queries).
 */
export async function transformStudentsData(
    students: any[],
    classNameMap: Map<string, string> = new Map()
): Promise<StudentWithClasses[]> {
    if (!Array.isArray(students)) {
        return []
    }

    return students
        .filter(student => student && typeof student === 'object')
        .map(student => {
            try {
                // Extract all classes from junction table
                const studentClasses = Array.isArray(student.student_classes) ? student.student_classes : []
                const classesArray = studentClasses
                    .filter((sc: any) => sc && sc.classes && typeof sc.classes === 'object')
                    .map((sc: any) => sc.classes)
                    .filter((cls: any) => cls && (cls.id || cls.name))
                    .map((cls: any) => ({
                        id: String(cls.id || ''),
                        name: String(cls.name || '')
                    }))

                // If no classes from junction table, use class_id directly (backward compatibility)
                if (classesArray.length === 0 && student.class_id) {
                    const className = classNameMap.get(String(student.class_id)) || student.class_name || 'Unknown Class'
                    classesArray.push({
                        id: String(student.class_id),
                        name: String(className)
                    })
                }

                // Get primary class (first class) for backward compatibility
                const primaryClass = classesArray[0] || null

                // Remove junction table raw data before spreading
                const studentWithoutClasses: any = { ...student }
                delete studentWithoutClasses.classes
                delete studentWithoutClasses.student_classes

                const getDaerahName = () => {
                    if (!student.daerah) return ''
                    if (Array.isArray(student.daerah)) {
                        if (student.daerah.length > 0 && student.daerah[0] && typeof student.daerah[0] === 'object' && 'name' in student.daerah[0]) {
                            return String((student.daerah[0] as any).name || '')
                        }
                        return ''
                    }
                    if (typeof student.daerah === 'object' && student.daerah !== null && 'name' in student.daerah) {
                        return String((student.daerah as any).name || '')
                    }
                    return ''
                }

                const getDesaName = () => {
                    if (!student.desa) return ''
                    if (Array.isArray(student.desa)) {
                        if (student.desa.length > 0 && student.desa[0] && typeof student.desa[0] === 'object' && 'name' in student.desa[0]) {
                            return String((student.desa[0] as any).name || '')
                        }
                        return ''
                    }
                    if (typeof student.desa === 'object' && student.desa !== null && 'name' in student.desa) {
                        return String((student.desa as any).name || '')
                    }
                    return ''
                }

                const getKelompokName = () => {
                    if (!student.kelompok) return ''
                    if (Array.isArray(student.kelompok)) {
                        if (student.kelompok.length > 0 && student.kelompok[0] && typeof student.kelompok[0] === 'object' && 'name' in student.kelompok[0]) {
                            return String((student.kelompok[0] as any).name || '')
                        }
                        return ''
                    }
                    if (typeof student.kelompok === 'object' && student.kelompok !== null && 'name' in student.kelompok) {
                        return String((student.kelompok as any).name || '')
                    }
                    return ''
                }

                return {
                    ...studentWithoutClasses,
                    classes: Array.isArray(classesArray) ? classesArray : [],
                    class_id: primaryClass?.id || student.class_id || null,
                    class_name: primaryClass?.name || '',
                    daerah_name: getDaerahName(),
                    desa_name: getDesaName(),
                    kelompok_name: getKelompokName(),
                    status: student.status || 'active'
                }
            } catch (error) {
                console.error('Error transforming student data:', error, student)
                return {
                    id: String(student.id || ''),
                    name: String(student.name || ''),
                    gender: student.gender || null,
                    class_id: student.class_id || null,
                    kelompok_id: student.kelompok_id || null,
                    desa_id: student.desa_id || null,
                    daerah_id: student.daerah_id || null,
                    created_at: String(student.created_at || ''),
                    updated_at: String(student.updated_at || ''),
                    classes: [],
                    class_name: '',
                    daerah_name: '',
                    desa_name: '',
                    kelompok_name: '',
                    status: student.status || 'active'
                }
            }
        })
}

/**
 * Build a classNameMap by querying missing class names.
 * Used when students only have class_id (no junction table entries).
 */
export function collectMissingClassIds(students: any[]): Set<string> {
    const classIdsToQuery = new Set<string>()
    students.forEach(student => {
        if (!student || typeof student !== 'object') return
        const studentClasses = Array.isArray(student.student_classes) ? student.student_classes : []
        if (studentClasses.length === 0 && student.class_id) {
            classIdsToQuery.add(String(student.class_id))
        }
    })
    return classIdsToQuery
}

export function validateStudentData(data: {
    name?: string
    gender?: string
    classId?: string
}): { ok: boolean; error?: string } {
    if (!data.name || !data.gender || !data.classId) {
        return { ok: false, error: 'Semua field harus diisi' }
    }

    if (!['Laki-laki', 'Perempuan'].includes(data.gender)) {
        return { ok: false, error: 'Jenis kelamin tidak valid' }
    }

    return { ok: true }
}

export function buildStudentHierarchy(
    userProfile: {
        kelompok_id: string | null
        desa_id: string | null
        daerah_id: string | null
        role: string
    },
    kelompokId?: string,
    kelompokData?: {
        id: string
        desa_id: string
        desa?: {
            id: string
            daerah_id: string
            daerah?: { id: string }
        }
    }
): {
    kelompok_id: string | null
    desa_id: string | null
    daerah_id: string | null
} {
    if (kelompokId && kelompokData) {
        if (userProfile.role === 'admin' && userProfile.desa_id && !userProfile.kelompok_id) {
            const kelompokDesa = Array.isArray(kelompokData.desa) ? (kelompokData.desa as any)[0] : kelompokData.desa
            if (kelompokDesa?.id !== userProfile.desa_id) {
                throw new Error('Kelompok tidak berada di desa Anda')
            }
        }

        const desa = Array.isArray(kelompokData.desa) ? (kelompokData.desa as any)[0] : kelompokData.desa
        const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah

        return {
            kelompok_id: kelompokId,
            desa_id: desa?.id || null,
            daerah_id: daerah?.id || null
        }
    }

    return {
        kelompok_id: userProfile.kelompok_id,
        desa_id: userProfile.desa_id,
        daerah_id: userProfile.daerah_id
    }
}
