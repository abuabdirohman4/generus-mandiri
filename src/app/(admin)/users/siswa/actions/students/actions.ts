'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { handleApiError } from '@/lib/errorUtils'
import {
    canSoftDeleteStudent,
    canHardDeleteStudent,
    type UserProfile,
    type Student as StudentPermission,
} from './permissions'
import type { StudentWithClasses } from '@/types/student'
import {
    fetchAllStudents,
    fetchStudentsByIds,
    fetchStudentById,
    fetchStudentBiodata,
    fetchStudentAttendanceHistory,
    insertStudent,
    insertStudentClass,
    updateStudentRecord,
    fetchCurrentStudentClasses,
    deleteStudentClasses,
    insertStudentClasses,
    softDeleteStudent as softDeleteStudentQuery,
    hardDeleteStudent as hardDeleteStudentQuery,
    deleteStudentClassesByStudentId,
    checkStudentHasAttendance as checkStudentHasAttendanceQuery,
    updateStudentBiodata as updateStudentBiodataQuery,
    fetchClassNames,
    insertStudentsBatch,
    insertStudentClassesBatch,
} from './queries'
import {
    transformStudentsData,
    collectMissingClassIds,
    validateStudentData,
    buildStudentHierarchy,
} from './logic'

// Re-export centralized type for consistency
export type Student = StudentWithClasses

/**
 * Mendapatkan profile user saat ini
 */
export async function getUserProfile() {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            throw new Error('User not authenticated')
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select(`
        role,
        kelompok_id,
        desa_id,
        daerah_id,
        teacher_classes!teacher_classes_teacher_id_fkey(
          class_id,
          classes:class_id(id, name)
        )
      `)
            .eq('id', user.id)
            .single()

        // Transform teacher_classes to classes array
        const classesData = profile?.teacher_classes?.map((tc: any) => tc.classes).filter(Boolean) || []

        if (!profile) {
            throw new Error('User profile not found')
        }

        return {
            role: profile.role,
            kelompok_id: profile.kelompok_id,
            desa_id: profile.desa_id,
            daerah_id: profile.daerah_id,
            class_id: classesData[0]?.id || null,
            class_name: classesData[0]?.name || null,
            classes: classesData
        }
    } catch (error) {
        handleApiError(error, 'memuat data', 'Gagal memuat profile user')
        throw error
    }
}

/**
 * Mendapatkan daftar siswa dengan informasi kelas (mendukung multiple classes via junction table)
 */
export async function getAllStudents(classId?: string): Promise<Student[]> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            throw new Error('User not authenticated')
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select(`
        role,
        kelompok_id,
        desa_id,
        daerah_id,
        teacher_classes(class_id)
      `)
            .eq('id', user.id)
            .single()

        // For teacher with class assignments
        if (profile?.role === 'teacher' && profile.teacher_classes && profile.teacher_classes.length > 0) {
            const teacherClassIds = profile.teacher_classes.map((tc: any) => tc.class_id)
            const adminClient = await createAdminClient()

            const studentIdsFromJunction = new Set<string>()
            const studentIdsFromClassId = new Set<string>()

            const { data: studentClassData } = await adminClient
                .from('student_classes')
                .select('student_id')
                .in('class_id', teacherClassIds)

            if (studentClassData && studentClassData.length > 0) {
                studentClassData.forEach((sc: any) => { studentIdsFromJunction.add(sc.student_id) })
            }

            const { data: studentsFromClassId } = await adminClient
                .from('students')
                .select('id')
                .is('deleted_at', null)
                .in('class_id', teacherClassIds)

            if (studentsFromClassId && studentsFromClassId.length > 0) {
                studentsFromClassId.forEach((s: any) => { studentIdsFromClassId.add(s.id) })
            }

            const studentIds = [...new Set([...studentIdsFromJunction, ...studentIdsFromClassId])]

            if (studentIds.length === 0) {
                return []
            }

            if (classId) {
                const classIds = classId.split(',')
                const filteredClassIds = classIds.filter(id => teacherClassIds.includes(id))
                if (filteredClassIds.length === 0) return []

                const filteredIdsFromJunction = new Set<string>()
                const filteredIdsFromClassId = new Set<string>()

                const { data: filteredStudentClassData } = await adminClient
                    .from('student_classes')
                    .select('student_id')
                    .in('class_id', filteredClassIds)

                if (filteredStudentClassData && filteredStudentClassData.length > 0) {
                    filteredStudentClassData.forEach((sc: any) => { filteredIdsFromJunction.add(sc.student_id) })
                }

                const { data: filteredStudentsFromClassId } = await adminClient
                    .from('students')
                    .select('id')
                    .is('deleted_at', null)
                    .in('class_id', filteredClassIds)

                if (filteredStudentsFromClassId && filteredStudentsFromClassId.length > 0) {
                    filteredStudentsFromClassId.forEach((s: any) => { filteredIdsFromClassId.add(s.id) })
                }

                const filteredStudentIds = [...new Set([...filteredIdsFromJunction, ...filteredIdsFromClassId])]
                const finalStudentIds = studentIds.filter(id => filteredStudentIds.includes(id))

                if (finalStudentIds.length === 0) return []

                const { data: students, error } = await fetchStudentsByIds(adminClient, finalStudentIds)
                if (error) throw error

                const missing = collectMissingClassIds(students || [])
                let classNameMap = new Map<string, string>()
                if (missing.size > 0) {
                    const { data: classesData } = await fetchClassNames(adminClient, Array.from(missing))
                    if (Array.isArray(classesData)) {
                        classesData.forEach((c: any) => { if (c?.id) classNameMap.set(String(c.id), String(c.name || '')) })
                    }
                }

                return transformStudentsData(students || [], classNameMap)
            }

            const { data: students, error: studentsError } = await fetchStudentsByIds(adminClient, studentIds)
            if (studentsError) throw studentsError

            const missing = collectMissingClassIds(students || [])
            let classNameMap = new Map<string, string>()
            if (missing.size > 0) {
                const { data: classesData } = await fetchClassNames(adminClient, Array.from(missing))
                if (Array.isArray(classesData)) {
                    classesData.forEach((c: any) => { if (c?.id) classNameMap.set(String(c.id), String(c.name || '')) })
                }
            }

            return transformStudentsData(students || [], classNameMap)

        } else if (profile?.role === 'teacher' && (profile.kelompok_id || profile.desa_id || profile.daerah_id)) {
            // Teacher with hierarchical access (Guru Desa/Daerah)
            const adminClient = await createAdminClient()

            let studentsQuery = adminClient
                .from('students')
                .select(`
          id,
          name,
          gender,
          class_id,
          kelompok_id,
          desa_id,
          daerah_id,
          status,
          created_at,
          updated_at,
          student_classes(
            classes:class_id(id, name)
          ),
          daerah:daerah_id(name),
          desa:desa_id(name),
          kelompok:kelompok_id(name)
        `)
                .is('deleted_at', null)
                .order('name')

            if (profile.kelompok_id) {
                studentsQuery = studentsQuery.eq('kelompok_id', profile.kelompok_id)
            } else if (profile.desa_id) {
                studentsQuery = studentsQuery.eq('desa_id', profile.desa_id)
            } else if (profile.daerah_id) {
                studentsQuery = studentsQuery.eq('daerah_id', profile.daerah_id)
            }

            if (classId) {
                const classIds = classId.split(',')
                const { data: studentClassData } = await adminClient
                    .from('student_classes')
                    .select('student_id')
                    .in('class_id', classIds)

                if (studentClassData && studentClassData.length > 0) {
                    const sIds = studentClassData.map(sc => sc.student_id)
                    studentsQuery = studentsQuery.in('id', sIds)
                } else {
                    return []
                }
            }

            const { data: students, error } = await studentsQuery
            if (error) throw error

            const missing = collectMissingClassIds(students || [])
            let classNameMap = new Map<string, string>()
            if (missing.size > 0) {
                const { data: classesData } = await fetchClassNames(adminClient, Array.from(missing))
                if (Array.isArray(classesData)) {
                    classesData.forEach((c: any) => { if (c?.id) classNameMap.set(String(c.id), String(c.name || '')) })
                }
            }

            return transformStudentsData(students || [], classNameMap)
        }

        // For non-teacher roles
        const { data: students, error } = await fetchAllStudents(supabase, classId)
        if (error) throw error

        return transformStudentsData(students || [])
    } catch (error) {
        handleApiError(error, 'memuat data', 'Gagal memuat daftar siswa')
        throw error
    }
}

/**
 * Membuat siswa baru
 */
export async function createStudent(formData: FormData) {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const name = formData.get('name')?.toString()
        const gender = formData.get('gender')?.toString()
        const classId = formData.get('classId')?.toString()
        const kelompokId = formData.get('kelompok_id')?.toString()

        // Validation (Layer 2)
        const validation = validateStudentData({ name, gender, classId })
        if (!validation.ok) {
            throw new Error(validation.error)
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: userProfile } = await supabase
            .from('profiles')
            .select('kelompok_id, desa_id, daerah_id, role')
            .eq('id', user.id)
            .single()

        if (!userProfile) throw new Error('User profile not found')

        // Get kelompok data if provided
        let kelompokData: any
        if (kelompokId) {
            const { data, error: kelompokError } = await supabase
                .from('kelompok')
                .select(`
          id,
          desa_id,
          desa:desa_id(
            id,
            daerah_id,
            daerah:daerah_id(id)
          )
        `)
                .eq('id', kelompokId)
                .single()

            if (kelompokError || !data) throw new Error('Kelompok tidak ditemukan')
            kelompokData = data
        }

        // Build hierarchy (Layer 2)
        const hierarchy = buildStudentHierarchy(userProfile, kelompokId, kelompokData)

        // Verify class exists
        const { data: classData } = await supabase.from('classes').select('name').eq('id', classId!).single()
        if (!classData) throw new Error('Class not found')

        // Insert student (Layer 1)
        const { data: newStudent, error } = await insertStudent(adminClient, {
            name: name!,
            gender: gender!,
            class_id: classId!,
            kelompok_id: hierarchy.kelompok_id,
            desa_id: hierarchy.desa_id,
            daerah_id: hierarchy.daerah_id,
        })

        if (error) {
            console.error('Create student error:', error)
            throw error
        }

        // Insert to junction table (Layer 1)
        if (newStudent?.id) {
            const { error: junctionError } = await insertStudentClass(adminClient, newStudent.id, classId!)

            if (junctionError) {
                if (junctionError.code === '23505') {
                    console.log('Student already assigned to this class')
                } else {
                    console.error('Junction table insert failed:', junctionError)
                    await adminClient.from('students').delete().eq('id', newStudent.id)
                    throw new Error(`Failed to assign student to class: ${junctionError.message}`)
                }
            }
        }

        revalidatePath('/users/siswa')
        revalidatePath('/absensi')
        return { success: true, student: newStudent }
    } catch (error) {
        handleApiError(error, 'menyimpan data', 'Gagal membuat siswa')
        throw error
    }
}

/**
 * Mengupdate data siswa
 */
export async function updateStudent(studentId: string, formData: FormData) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, teacher_classes(class_id), desa_id, kelompok_id')
            .eq('id', user.id)
            .single()

        if (!profile) throw new Error('User profile not found')

        const name = formData.get('name')?.toString()
        const gender = formData.get('gender')?.toString()
        const kelompokId = formData.get('kelompok_id')?.toString()

        const classIdsStr = formData.get('classIds')?.toString() || formData.get('classId')?.toString()
        const classIds = classIdsStr ? classIdsStr.split(',').filter(Boolean) : []

        if (!name || !gender) throw new Error('Nama dan jenis kelamin harus diisi')
        if (classIds.length === 0) throw new Error('Pilih minimal satu kelas')
        if (!['Laki-laki', 'Perempuan'].includes(gender)) throw new Error('Jenis kelamin tidak valid')

        const primaryClassId = classIds[0]

        let finalKelompokId: string | null | undefined = undefined
        let finalDesaId: string | null | undefined = undefined
        let finalDaerahId: string | null | undefined = undefined

        if (kelompokId) {
            const { data: kelompokData, error: kelompokError } = await supabase
                .from('kelompok')
                .select(`
          id,
          desa_id,
          desa:desa_id(
            id,
            daerah_id,
            daerah:daerah_id(id)
          )
        `)
                .eq('id', kelompokId)
                .single()

            if (kelompokError || !kelompokData) throw new Error('Kelompok tidak ditemukan')

            if (profile.role === 'admin' && profile.desa_id && !profile.kelompok_id) {
                const kelompokDesa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
                if (kelompokDesa?.id !== profile.desa_id) {
                    throw new Error('Kelompok tidak berada di desa Anda')
                }
            }

            finalKelompokId = kelompokId
            const desa = Array.isArray(kelompokData.desa) ? kelompokData.desa[0] : kelompokData.desa
            finalDesaId = desa?.id || null
            const daerah = Array.isArray(desa?.daerah) ? desa?.daerah[0] : desa?.daerah
            finalDaerahId = daerah?.id || null
        }

        if (profile.role === 'teacher') {
            const teacherClassIds = profile.teacher_classes?.map((tc: any) => tc.class_id) || []
            const invalidClasses = classIds.filter(id => !teacherClassIds.includes(id))
            if (invalidClasses.length > 0) {
                throw new Error('Anda hanya dapat mengupdate siswa ke kelas yang Anda ajarkan')
            }
        }

        const client = (profile.role === 'teacher' || profile.role === 'admin' || profile.role === 'superadmin')
            ? await createAdminClient()
            : supabase

        const updateData: any = {
            name,
            gender,
            class_id: primaryClassId,
            updated_at: new Date().toISOString()
        }

        if (finalKelompokId !== undefined) {
            updateData.kelompok_id = finalKelompokId
            updateData.desa_id = finalDesaId
            updateData.daerah_id = finalDaerahId
        }

        // Update student (Layer 1)
        const { data: updatedStudent, error } = await updateStudentRecord(client, studentId, updateData)

        if (error) {
            if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
                throw new Error('Tidak memiliki izin untuk mengupdate siswa ini')
            }
            if (error.code === '23503') throw new Error('Kelas tidak ditemukan')
            if (error.code === 'PGRST116') throw new Error('Siswa tidak ditemukan')
            throw error
        }

        // Sync junction table (Layer 1)
        if (updatedStudent?.id) {
            const { data: currentClasses, error: currentClassesError } = await fetchCurrentStudentClasses(client, studentId)

            if (currentClassesError) {
                console.error('Error fetching current classes:', currentClassesError)
            }

            const currentClassIds = new Set(currentClasses?.map(c => c.class_id) || [])
            const newClassIds = new Set(classIds)

            const toDelete = Array.from(currentClassIds).filter(id => !newClassIds.has(id))
            if (toDelete.length > 0) {
                const { error: deleteError } = await deleteStudentClasses(client, studentId, toDelete)
                if (deleteError && deleteError.code !== 'PGRST301') {
                    console.error('Error deleting classes from junction table:', deleteError)
                }
            }

            const toInsert = Array.from(newClassIds).filter(id => !currentClassIds.has(id))
            if (toInsert.length > 0) {
                const { error: insertError } = await insertStudentClasses(client, studentId, toInsert)
                if (insertError && insertError.code !== '23505' && insertError.code !== 'PGRST301') {
                    console.error('Error inserting to junction table:', insertError)
                }
            }
        }

        revalidatePath('/users/siswa')
        return { success: true, student: updatedStudent }
    } catch (error) {
        handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa')
        throw error
    }
}

/**
 * Check if student has attendance records
 */
export async function checkStudentHasAttendance(studentId: string): Promise<boolean> {
    try {
        const adminClient = await createAdminClient()
        const { data } = await checkStudentHasAttendanceQuery(adminClient, studentId)
        return !!data
    } catch (error) {
        console.error('Error checking student attendance:', error)
        return false
    }
}

/**
 * Menghapus siswa dengan permission check
 */
export async function deleteStudent(
    studentId: string,
    permanent: boolean = false
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { success: false, error: 'User not authenticated' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name, role, daerah_id, desa_id, kelompok_id, permissions')
            .eq('id', user.id)
            .single()

        if (!profile) return { success: false, error: 'User profile not found' }

        const { data: student, error: studentError } = await adminClient
            .from('students')
            .select('id, name, gender, daerah_id, desa_id, kelompok_id, status, deleted_at')
            .eq('id', studentId)
            .single()

        if (studentError) {
            if (studentError.code === 'PGRST116') return { success: false, error: 'Siswa tidak ditemukan' }
            handleApiError(studentError, 'menghapus data', 'Gagal menghapus siswa')
            return { success: false, error: 'Gagal menghapus siswa' }
        }

        if (!student) return { success: false, error: 'Siswa tidak ditemukan' }

        if (permanent) {
            if (!canHardDeleteStudent(profile as UserProfile, student as StudentPermission)) {
                if (profile.role !== 'superadmin') {
                    return { success: false, error: 'Hanya superadmin yang dapat menghapus siswa secara permanen' }
                }
                if (!student.deleted_at) {
                    return { success: false, error: 'Siswa harus di-soft delete terlebih dahulu sebelum hard delete' }
                }
                return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
            }

            // Delete from junction table first (Layer 1)
            const { error: junctionDeleteError } = await deleteStudentClassesByStudentId(adminClient, studentId)
            if (junctionDeleteError && junctionDeleteError.code !== 'PGRST301') {
                console.error('Error deleting from junction table:', junctionDeleteError)
            }

            // Hard delete (Layer 1)
            const { error: deleteError } = await hardDeleteStudentQuery(adminClient, studentId)
            if (deleteError) {
                if (deleteError.code === 'PGRST301' || deleteError.message.includes('permission denied')) {
                    return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
                }
                if (deleteError.code === '23503') {
                    return { success: false, error: 'Tidak dapat menghapus siswa: terdapat data terkait yang masih digunakan' }
                }
                handleApiError(deleteError, 'menghapus data', 'Gagal menghapus siswa')
                return { success: false, error: 'Gagal menghapus siswa' }
            }
        } else {
            if (!canSoftDeleteStudent(profile as UserProfile, student as StudentPermission)) {
                return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
            }

            // Soft delete (Layer 1)
            const { error: updateError } = await softDeleteStudentQuery(adminClient, studentId, user.id)
            if (updateError) {
                if (updateError.code === 'PGRST301' || updateError.message.includes('permission denied')) {
                    return { success: false, error: 'Tidak memiliki izin untuk menghapus siswa ini' }
                }
                handleApiError(updateError, 'menghapus data', 'Gagal menghapus siswa')
                return { success: false, error: 'Gagal menghapus siswa' }
            }
        }

        revalidatePath('/users/siswa')
        revalidatePath('/absensi')
        return { success: true }
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Gagal menghapus siswa'
        handleApiError(error, 'menghapus data', errorMessage)
        return { success: false, error: errorMessage }
    }
}

/**
 * Helper: Mendapatkan semua kelas siswa berdasarkan studentId
 */
export async function getStudentClasses(studentId: string): Promise<Array<{ id: string; name: string }>> {
    try {
        const supabase = await createClient()

        const { data: studentClasses, error } = await supabase
            .from('student_classes')
            .select(`
        classes:class_id(id, name)
      `)
            .eq('student_id', studentId)

        if (error) throw error

        return (studentClasses || [])
            .map((sc: any) => sc.classes)
            .filter(Boolean)
            .map((cls: any) => ({
                id: String(cls.id || ''),
                name: String(cls.name || '')
            }))
    } catch (error) {
        console.error('Error getting student classes:', error)
        return []
    }
}

/**
 * Assign siswa yang sudah ada ke kelas tertentu (batch)
 */
export async function assignStudentsToClass(
    studentIds: string[],
    classId: string
): Promise<{ success: boolean; assigned: number; skipped: string[] }> {
    try {
        const supabase = await createClient()

        await getUserProfile()

        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('id', classId)
            .single()

        if (classError || !classData) throw new Error('Kelas tidak ditemukan')

        if (!studentIds || studentIds.length === 0) throw new Error('Pilih minimal satu siswa')

        const { data: existingAssignments } = await supabase
            .from('student_classes')
            .select('student_id')
            .eq('class_id', classId)
            .in('student_id', studentIds)

        const existingStudentIds = new Set(existingAssignments?.map(a => a.student_id) || [])
        const newStudentIds = studentIds.filter(id => !existingStudentIds.has(id))

        if (newStudentIds.length > 0) {
            const assignments = newStudentIds.map(studentId => ({
                student_id: studentId,
                class_id: classId
            }))

            const { error } = await insertStudentClassesBatch(supabase, assignments)

            if (error) {
                if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
                    throw new Error('Tidak memiliki izin untuk mengassign siswa ke kelas ini')
                }
                throw error
            }
        }

        revalidatePath('/users/siswa')
        return {
            success: true,
            assigned: newStudentIds.length,
            skipped: Array.from(existingStudentIds)
        }
    } catch (error) {
        handleApiError(error, 'mengupdate data', 'Gagal mengupdate siswa ke kelas')
        throw error
    }
}

/**
 * Membuat siswa dalam batch
 */
export async function createStudentsBatch(
    students: Array<{ name: string; gender: string }>,
    classId: string
) {
    try {
        const supabase = await createClient()
        const adminClient = await createAdminClient()

        const profile = await getUserProfile()

        const { data: classData, error: classError } = await supabase
            .from('classes')
            .select('id, name')
            .eq('id', classId)
            .single()

        if (classError || !classData) throw new Error('Kelas tidak ditemukan')

        const validStudents = students.filter(s => s.name.trim() !== '')

        if (validStudents.length === 0) throw new Error('Tidak ada siswa yang valid untuk ditambah')

        const studentsToInsert = validStudents.map(s => ({
            name: s.name.trim(),
            gender: s.gender,
            class_id: classId,
            kelompok_id: profile.kelompok_id,
            desa_id: profile.desa_id,
            daerah_id: profile.daerah_id
        }))

        // Batch insert (Layer 1)
        const { data: insertedStudents, error: insertError } = await insertStudentsBatch(adminClient, studentsToInsert)

        if (insertError) {
            console.error('Batch insert error:', insertError)
            throw insertError
        }

        if (insertedStudents && insertedStudents.length > 0) {
            const junctionInserts = insertedStudents.map(student => ({
                student_id: student.id,
                class_id: classId
            }))

            const { error: junctionError } = await insertStudentClassesBatch(adminClient, junctionInserts)
            if (junctionError && junctionError.code !== '23505') {
                console.error('Error inserting to junction table:', junctionError)
            }
        }

        revalidatePath('/users/siswa')
        return {
            success: true,
            imported: insertedStudents?.length || 0,
            total: validStudents.length,
            errors: []
        }
    } catch (error) {
        handleApiError(error, 'menyimpan data', 'Gagal mengimport siswa')
        throw error
    }
}

/**
 * Mendapatkan role user saat ini
 */
export async function getCurrentUserRole(): Promise<string | null> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return null

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        return profile?.role || null
    } catch (error) {
        console.error('Error getting user role:', error)
        return null
    }
}

export interface StudentInfo {
    id: string
    name: string
    gender: string | null
    class_id?: string | null
    classes: Array<{
        id: string
        name: string
    }>
}

export interface AttendanceLog {
    id: string
    date: string
    status: string
    reason: string | null
    meeting_id: string
    meetings: {
        id: string
        title: string
        topic: string | null
        description: string | null
        meeting_type_code?: string | null
        classes?: {
            id: string
            name: string
            class_master_mappings?: Array<{
                class_master?: {
                    category?: {
                        is_sambung_capable: boolean
                    }
                }
            }>
        } | null
    }
}

export interface MonthlyStats {
    total: number
    hadir: number
    izin: number
    sakit: number
    absen: number
}

export interface AttendanceHistoryResponse {
    attendanceLogs: AttendanceLog[]
    stats: MonthlyStats
}

/**
 * Mendapatkan informasi siswa berdasarkan ID
 */
export async function getStudentInfo(studentId: string): Promise<StudentInfo> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, daerah_id, desa_id, kelompok_id, teacher_classes(class_id)')
            .eq('id', user.id)
            .single()

        if (!profile) throw new Error('User profile not found')

        // Query student (Layer 1)
        const { data: student, error } = await fetchStudentById(supabase, studentId)

        if (error) {
            if (error.code === 'PGRST116') throw new Error('Siswa tidak ditemukan')
            if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
                throw new Error('Tidak memiliki izin untuk melihat siswa ini')
            }
            throw error
        }

        const studentClasses = (student as any).student_classes || []
        const classesArray = studentClasses
            .map((sc: any) => sc.classes)
            .filter(Boolean)
            .map((cls: any) => ({
                id: String(cls.id || ''),
                name: String(cls.name || '')
            }))

        const primaryClass = classesArray[0] || null

        return {
            id: student.id,
            name: student.name,
            gender: student.gender,
            class_id: primaryClass?.id || student.class_id || null,
            classes: classesArray
        } as StudentInfo
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat informasi siswa')
        throw new Error(errorInfo.message)
    }
}

/**
 * Mendapatkan riwayat kehadiran siswa untuk bulan tertentu
 */
export async function getStudentAttendanceHistory(
    studentId: string,
    year: number,
    month: number
): Promise<AttendanceHistoryResponse> {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error('User not authenticated')

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, daerah_id, desa_id, kelompok_id, teacher_classes(class_id)')
            .eq('id', user.id)
            .single()

        if (!profile) throw new Error('User profile not found')

        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`
        const lastDayOfMonth = new Date(year, month, 0).getDate()
        const endDate = `${year}-${month.toString().padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`

        // Query attendance (Layer 1)
        const { data: attendanceLogs, error } = await fetchStudentAttendanceHistory(
            supabase,
            studentId,
            startDate,
            endDate
        )

        if (error) {
            if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
                throw new Error('Tidak memiliki izin untuk melihat riwayat kehadiran siswa ini')
            }
            throw error
        }

        const stats = {
            total: attendanceLogs?.length || 0,
            hadir: attendanceLogs?.filter(log => log.status === 'H').length || 0,
            izin: attendanceLogs?.filter(log => log.status === 'I').length || 0,
            sakit: attendanceLogs?.filter(log => log.status === 'S').length || 0,
            absen: attendanceLogs?.filter(log => log.status === 'A').length || 0
        }

        return {
            attendanceLogs: (attendanceLogs || []) as unknown as AttendanceLog[],
            stats: stats as MonthlyStats
        }
    } catch (error) {
        const errorInfo = handleApiError(error, 'memuat data', 'Gagal memuat riwayat kehadiran siswa')
        throw new Error(errorInfo.message)
    }
}

/**
 * Get student with complete biodata
 */
export async function getStudentBiodata(
    studentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const supabase = await createClient()
        const { data, error } = await fetchStudentBiodata(supabase, studentId)

        if (error) throw error

        return { success: true, data }
    } catch (error) {
        console.error('Error fetching student biodata:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch student biodata',
        }
    }
}

/**
 * Update student biodata
 */
export async function updateStudentBiodata(
    studentId: string,
    biodata: any
): Promise<{ success: boolean; error?: string }> {
    try {
        const supabase = await createClient()

        const updateData: any = {}

        if (biodata.name !== undefined) updateData.name = biodata.name
        if (biodata.nomor_induk !== undefined) updateData.nomor_induk = biodata.nomor_induk
        if (biodata.gender !== undefined) updateData.gender = biodata.gender
        if (biodata.tempat_lahir !== undefined) updateData.tempat_lahir = biodata.tempat_lahir
        if (biodata.tanggal_lahir !== undefined) updateData.tanggal_lahir = biodata.tanggal_lahir
        if (biodata.anak_ke !== undefined) updateData.anak_ke = biodata.anak_ke
        if (biodata.alamat !== undefined) updateData.alamat = biodata.alamat
        if (biodata.nomor_telepon !== undefined) updateData.nomor_telepon = biodata.nomor_telepon
        if (biodata.nama_ayah !== undefined) updateData.nama_ayah = biodata.nama_ayah
        if (biodata.nama_ibu !== undefined) updateData.nama_ibu = biodata.nama_ibu
        if (biodata.alamat_orangtua !== undefined) updateData.alamat_orangtua = biodata.alamat_orangtua
        if (biodata.telepon_orangtua !== undefined) updateData.telepon_orangtua = biodata.telepon_orangtua
        if (biodata.pekerjaan_ayah !== undefined) updateData.pekerjaan_ayah = biodata.pekerjaan_ayah
        if (biodata.pekerjaan_ibu !== undefined) updateData.pekerjaan_ibu = biodata.pekerjaan_ibu
        if (biodata.nama_wali !== undefined) updateData.nama_wali = biodata.nama_wali
        if (biodata.alamat_wali !== undefined) updateData.alamat_wali = biodata.alamat_wali
        if (biodata.pekerjaan_wali !== undefined) updateData.pekerjaan_wali = biodata.pekerjaan_wali

        updateData.updated_at = new Date().toISOString()

        const { error } = await updateStudentBiodataQuery(supabase, studentId, updateData)

        if (error) throw error

        revalidatePath('/users/siswa')
        revalidatePath(`/users/siswa/${studentId}`)
        revalidatePath('/rapot')

        return { success: true }
    } catch (error) {
        console.error('Error updating student biodata:', error)
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update student biodata',
        }
    }
}
