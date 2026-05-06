import type { SupabaseClient } from '@supabase/supabase-js'

export interface MateriReportFilters {
    classId: string
    academicYearId: string
    semester: 1 | 2
    categoryId?: string
    month?: number
}

export interface MateriReportRow {
    material_item_id: string
    material_name: string
    material_type_name: string
    category_name: string
    tuntas_count: number
    total_students: number
    percentage: number
    avg_nilai: number
}

export interface MateriSiswaRow {
    student_id: string
    student_name: string
    tuntas_count: number
    total_materials: number
    percentage: number
    avg_nilai: number
}

export interface MateriReportData {
    rows: MateriReportRow[]
    siswaRows: MateriSiswaRow[]
    summary: {
        total_materials: number
        avg_completion_rate: number
        class_name: string
    }
}

export async function fetchMateriReport(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<MateriReportData> {
    const { classId, academicYearId, semester, categoryId, month } = filters

    // Step 1: Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')

    if (enrollError) throw new Error(enrollError.message)
    const studentIds = (enrollments || []).map((e: any) => e.student_id)
    const totalStudents = studentIds.length

    if (totalStudents === 0) {
        return { rows: [], siswaRows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: '' } }
    }

    // Step 2: Get class name
    const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .single()
    const className = classData?.name || ''

    // Step 3: Resolve material items
    let materialItemIds = await getMaterialItemIds(supabase, filters)

    if (materialItemIds.length === 0) {
        return { rows: [], siswaRows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Step 4: Get material item details with type + category
    const { data: materialItems } = await supabase
        .from('material_items')
        .select(`
            id,
            name,
            material_types!inner(
                name,
                material_categories!inner(id, name)
            )
        `)
        .in('id', materialItemIds)

    if (!materialItems || materialItems.length === 0) {
        return { rows: [], siswaRows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Re-scope materialItemIds to filtered result
    materialItemIds = materialItems.map((m: any) => m.id)

    // Step 5: Get progress for all students × all material items
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, hafal')
        .in('student_id', studentIds)
        .in('material_item_id', materialItemIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    // Step 6: Aggregate per material_item
    const progressByMaterial = new Map<string, any[]>()
    ;(progress || []).forEach((p: any) => {
        if (!progressByMaterial.has(p.material_item_id)) {
            progressByMaterial.set(p.material_item_id, [])
        }
        progressByMaterial.get(p.material_item_id)!.push(p)
    })

    const rows: MateriReportRow[] = materialItems.map((item: any) => {
        const studentProgressList = progressByMaterial.get(item.id) || []
        
        // Tuntas if Nilai >= 70 OR marked as Hafal
        const tuntasCount = studentProgressList.filter(p => 
            (p.nilai !== null && p.nilai >= 70) || p.hafal === true
        ).length

        const nilaiList = studentProgressList
            .map(p => p.nilai)
            .filter(n => n !== null && n !== undefined)

        const avgNilai = nilaiList.length > 0
            ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length)
            : 0
        const percentage = totalStudents > 0
            ? Math.round((tuntasCount / totalStudents) * 100)
            : 0

        return {
            material_item_id: item.id,
            material_name: item.name,
            material_type_name: item.material_types?.name || '',
            category_name: item.material_types?.material_categories?.name || '',
            tuntas_count: tuntasCount,
            total_students: totalStudents,
            percentage,
            avg_nilai: avgNilai,
        }
    })

    const avgCompletionRate = rows.length > 0
        ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
        : 0

    // Step 7: Get per-siswa breakdown
    const siswaRows = await fetchMateriReportBySiswa(supabase, filters)

    return {
        rows,
        siswaRows,
        summary: {
            total_materials: rows.length,
            avg_completion_rate: avgCompletionRate,
            class_name: className,
        }
    }
}

async function getMaterialItemIds(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<string[]> {
    const { classId, academicYearId, semester, categoryId, month } = filters

    // 1. Get class_master_ids for this class
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_master_id')
        .eq('class_id', classId)
    const classMasterIds = (mappings || []).map((m: any) => m.class_master_id)

    if (classMasterIds.length === 0) return []

    // 2. Get material items via monthly_targets
    let targetQuery = supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (month) {
        targetQuery = targetQuery.eq('month', month)
    }

    const { data: targets } = await targetQuery
    let materialItemIds = [...new Set((targets || []).map((t: any) => t.material_item_id))]

    if (materialItemIds.length === 0) return []

    // 3. Filter by category if provided
    if (categoryId) {
        const { data: materialItems } = await supabase
            .from('material_items')
            .select(`
                id,
                material_types!inner(
                    material_categories!inner(id)
                )
            `)
            .in('id', materialItemIds)
            .eq('material_types.material_categories.id', categoryId)

        if (!materialItems || materialItems.length === 0) return []
        materialItemIds = materialItems.map((m: any) => m.id)
    }

    return materialItemIds
}

export async function fetchMateriReportBySiswa(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<MateriSiswaRow[]> {
    // Step 1: Get enrolled students
    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id, students(id, name)')
        .eq('class_id', filters.classId)
        .eq('academic_year_id', filters.academicYearId)
        .eq('status', 'active')

    if (!enrollments?.length) return []

    const studentMap = new Map(
        enrollments.map(e => [e.student_id, (e.students as any)?.name || ''])
    )
    const studentIds = [...studentMap.keys()]

    // Step 2: Get material item IDs (reuse helper)
    const materialItemIds = await getMaterialItemIds(supabase, filters)
    if (!materialItemIds.length) return []

    // Step 3: Get progress per student
    const { data: progressList } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, hafal')
        .in('student_id', studentIds)
        .in('material_item_id', materialItemIds)
        .eq('academic_year_id', filters.academicYearId)
        .eq('semester', filters.semester)

    // Step 4: Aggregate per student
    const progressByStudent = new Map<string, any[]>()
    ;(progressList || []).forEach((p: any) => {
        if (!progressByStudent.has(p.student_id)) {
            progressByStudent.set(p.student_id, [])
        }
        progressByStudent.get(p.student_id)!.push(p)
    })

    return studentIds.map(studentId => {
        const studentProgress = progressByStudent.get(studentId) || []
        
        // Tuntas if Nilai >= 70 OR marked as Hafal
        const tuntasCount = studentProgress.filter(p => 
            (p.nilai !== null && p.nilai >= 70) || p.hafal === true
        ).length

        const nilaiList = studentProgress
            .map(p => p.nilai)
            .filter(n => n !== null && n !== undefined)

        const avgNilai = nilaiList.length > 0
            ? Math.round(nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length)
            : 0

        return {
            student_id: studentId,
            student_name: studentMap.get(studentId) || '',
            tuntas_count: tuntasCount,
            total_materials: materialItemIds.length,
            percentage: Math.round((tuntasCount / materialItemIds.length) * 100),
            avg_nilai: avgNilai,
        }
    }).sort((a, b) => a.student_name.localeCompare(b.student_name))
}
