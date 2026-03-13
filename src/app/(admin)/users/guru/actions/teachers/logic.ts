/**
 * Teachers Logic (Layer 2)
 *
 * Pure business logic for teacher (guru) operations.
 * NO 'use server' directive. No database access. No side effects.
 */

import type { TeacherData } from '../types'

/**
 * Validate teacher data for creation (password required)
 */
export function validateCreateTeacherData(data: TeacherData): void {
    if (!data.username?.trim()) throw new Error('Username harus diisi')
    if (!data.full_name?.trim()) throw new Error('Nama lengkap harus diisi')
    if (!data.email?.trim()) throw new Error('Email harus diisi')
    if (!data.password) throw new Error('Password harus diisi')
    if (!data.daerah_id) throw new Error('Daerah harus dipilih')
    if (data.kelompok_id && !data.desa_id) throw new Error('Desa harus dipilih untuk guru dengan kelompok')
    if (data.desa_id && !data.daerah_id) throw new Error('Daerah harus dipilih untuk guru dengan desa')
}

/**
 * Validate teacher data for update (password optional)
 */
export function validateUpdateTeacherData(data: TeacherData): void {
    if (!data.username?.trim()) throw new Error('Username harus diisi')
    if (!data.full_name?.trim()) throw new Error('Nama lengkap harus diisi')
    if (!data.email?.trim()) throw new Error('Email harus diisi')
    if (!data.daerah_id) throw new Error('Daerah harus dipilih')
    if (data.kelompok_id && !data.desa_id) throw new Error('Desa harus dipilih untuk guru dengan kelompok')
    if (data.desa_id && !data.daerah_id) throw new Error('Daerah harus dipilih untuk guru dengan desa')
}

/**
 * Extract all unique class IDs from teacher list
 */
export function extractClassIds(teachers: any[]): Set<string> {
    const allClassIds = new Set<string>()
    teachers.forEach(teacher => {
        const teacherClasses = Array.isArray(teacher.teacher_classes)
            ? teacher.teacher_classes
            : teacher.teacher_classes ? [teacher.teacher_classes] : []
        teacherClasses.forEach((tc: any) => {
            const classId = Array.isArray(tc.class_id) ? tc.class_id[0] : tc.class_id
            if (classId) allClassIds.add(classId)
        })
    })
    return allClassIds
}

/**
 * Build a classesMap from classes data (flat format + separate kelompok map)
 */
export function buildClassesMap(
    classesData: any[],
    kelompokMap: Map<string, any>
): Map<string, any> {
    const classesMap = new Map<string, any>()
    classesData.forEach((cls: any) => {
        const kelompok = kelompokMap.get(cls.kelompok_id)
        classesMap.set(cls.id, {
            name: cls.name,
            kelompok_id: cls.kelompok_id,
            kelompok: kelompok || null,
        })
    })
    return classesMap
}

/**
 * Build classesMap from classes data with inline kelompok (PostgREST array format)
 */
export function buildClassesMapWithKelompok(classesData: any[]): Map<string, any> {
    const classesMap = new Map<string, any>()
    classesData.forEach((cls: any) => {
        const kelompok = Array.isArray(cls.kelompok) ? cls.kelompok[0] : cls.kelompok
        classesMap.set(cls.id, {
            name: cls.name,
            kelompok_id: cls.kelompok_id,
            kelompok,
        })
    })
    return classesMap
}

/**
 * Build kelompokMap from kelompok data
 */
export function buildKelompokMap(kelompokData: any[]): Map<string, any> {
    const kelompokMap = new Map<string, any>()
    kelompokData.forEach((k: any) => {
        kelompokMap.set(k.id, { id: k.id, name: k.name })
    })
    return kelompokMap
}

/**
 * Transform teacher data to include formatted class names and flat org names
 */
export function transformTeacher(teacher: any, classesMap: Map<string, any>): any {
    interface ClassData {
        className: string
        kelompokName: string
        kelompokId: string
    }

    let classesData: ClassData[] = []

    if (classesMap.size > 0) {
        const teacherClasses = Array.isArray(teacher.teacher_classes)
            ? teacher.teacher_classes
            : teacher.teacher_classes ? [teacher.teacher_classes] : []
        classesData = teacherClasses.map((tc: any) => {
            const classId = Array.isArray(tc.class_id) ? tc.class_id[0] : tc.class_id
            if (!classId) return null
            const classData = classesMap.get(classId)
            if (!classData) return null
            const kelompok = classData.kelompok
            return {
                className: classData.name || '',
                kelompokName: kelompok?.name || '',
                kelompokId: kelompok?.id || '',
            }
        }).filter((c: ClassData | null): c is ClassData => c !== null && !!c.className)
    }

    const uniqueKelompokIds = new Set(classesData.map((c: ClassData) => c.kelompokId).filter(Boolean))
    const isSingleKelompok = uniqueKelompokIds.size <= 1

    const classNamesWithKelompok = classesData.map((c: ClassData) => {
        if (isSingleKelompok) return c.className
        return c.kelompokName ? `${c.className} (${c.kelompokName})` : c.className
    })

    return {
        ...teacher,
        class_names: classNamesWithKelompok.length > 0 ? classNamesWithKelompok.join(', ') : '-',
        daerah_name: Array.isArray(teacher.daerah) ? teacher.daerah[0]?.name : teacher.daerah?.name || '',
        desa_name: Array.isArray(teacher.desa) ? teacher.desa[0]?.name : teacher.desa?.name || '',
        kelompok_name: Array.isArray(teacher.kelompok) ? teacher.kelompok[0]?.name : teacher.kelompok?.name || '',
    }
}
