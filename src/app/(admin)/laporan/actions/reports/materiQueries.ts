import type { SupabaseClient } from '@supabase/supabase-js'
import { getMonthName } from '@/app/(admin)/materi/types'

export interface MateriReportFilters {
    classId: string
    academicYearId: string
    semester: 1 | 2
    categoryId?: string
    month?: number
    reportMode?: 'monthly' | 'cumulative'
    viewMode?: 'per_materi' | 'per_siswa'
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

export interface MateriMonthlyPoint {
    month: number          // 1-12
    month_label: string    // "Jul", "Agu", dst
    target_count: number   // jumlah materi yang ditargetkan s.d. bulan ini
    tuntas_count: number   // jumlah siswa×materi yang tuntas s.d. bulan ini
    percentage: number     // tuntas / (total_students × target) * 100
    tercapai: string       // Format "X/Y" untuk detail tooltip
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
        .select('student_id, students!inner(status)')
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')
        .eq('students.status', 'active')

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
    // For cumulative mode: materialItemIds for avgCompletionRate (filtered s.d. month)
    // For rows/table: always use all-semester IDs so table shows 24, not 21
    let materialItemIds = await getMaterialItemIds(supabase, filters)

    if (materialItemIds.length === 0) {
        return { rows: [], siswaRows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Hitung totalUnikSemester (semua materi semester, tanpa filter bulan)
    const classMasterIdsForAll = await getClassMasterIds(supabase, classId)
    const { data: allTargets } = await supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIdsForAll)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
    const allSemesterItemIds = [...new Set((allTargets || []).map((t: any) => t.material_item_id as string))]
    const totalUnikSemester = allSemesterItemIds.length

    // IDs untuk tabel rows: cumulative → semua semester, monthly → s.d. bulan ini
    const tableItemIds = filters.reportMode === 'cumulative' ? allSemesterItemIds : materialItemIds

    // Apply category filter to tableItemIds if needed
    let filteredTableItemIds = tableItemIds
    if (filters.categoryId && tableItemIds.length > 0) {
        const { data: catItems } = await supabase
            .from('material_items')
            .select('id, material_types!inner(material_categories!inner(id))')
            .in('id', tableItemIds)
            .eq('material_types.material_categories.id', filters.categoryId)
        filteredTableItemIds = (catItems || []).map((m: any) => m.id)
    }

    if (filteredTableItemIds.length === 0) {
        return { rows: [], siswaRows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Step 4: Get material item details with type + category (for table)
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
        .in('id', filteredTableItemIds)

    if (!materialItems || materialItems.length === 0) {
        return { rows: [], siswaRows: [], summary: { total_materials: 0, avg_completion_rate: 0, class_name: className } }
    }

    // Step 5: Get progress for all students × all table material items
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, hafal')
        .in('student_id', studentIds)
        .in('material_item_id', filteredTableItemIds)
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

    let avgCompletionRate: number
    if (filters.reportMode === 'cumulative' && filters.month && totalUnikSemester > 0) {
        // Selalu pakai rata-rata per siswa — konsisten dengan per_siswa dan Tab Semua
        let totalPctSum = 0
        for (const studentId of studentIds) {
            const siswaCount = (progress || []).filter((p: any) =>
                p.student_id === studentId &&
                materialItemIds.includes(p.material_item_id) &&
                ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            ).length
            totalPctSum += (siswaCount / totalUnikSemester) * 100
        }
        avgCompletionRate = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
    } else {
        avgCompletionRate = rows.length > 0
            ? Math.round(rows.reduce((sum, r) => sum + r.percentage, 0) / rows.length)
            : 0
    }

    // Step 7: Get per-siswa breakdown
    const siswaRows = await fetchMateriReportBySiswa(supabase, filters)

    return {
        rows,
        siswaRows,
        summary: {
            total_materials: totalUnikSemester,

            avg_completion_rate: avgCompletionRate,
            class_name: className,
        }
    }
}

async function getClassMasterIds(supabase: SupabaseClient, classId: string): Promise<string[]> {
    const { data: mappings } = await supabase
        .from('class_master_mappings')
        .select('class_master_id')
        .eq('class_id', classId)
    return (mappings || []).map((m: any) => m.class_master_id)
}

async function getMaterialItemIds(
    supabase: SupabaseClient,
    filters: MateriReportFilters
): Promise<string[]> {
    const { classId, academicYearId, semester, categoryId, month } = filters

    // 1. Get class_master_ids for this class
    const classMasterIds = await getClassMasterIds(supabase, classId)

    if (classMasterIds.length === 0) return []

    // 2. Get material items via monthly_targets
    let targetQuery = supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (month) {
        if (filters.reportMode === 'cumulative') {
            targetQuery = targetQuery.lte('month', month)
        } else {
            targetQuery = targetQuery.eq('month', month)
        }
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
        .select('student_id, students!inner(id, name, status)')
        .eq('class_id', filters.classId)
        .eq('academic_year_id', filters.academicYearId)
        .eq('status', 'active')
        .eq('students.status', 'active')

    if (!enrollments?.length) return []

    const studentMap = new Map(
        enrollments.map(e => [e.student_id, (e.students as any)?.name || ''])
    )
    const studentIds = [...studentMap.keys()]

    // Step 2: Get material item IDs (reuse helper)
    const materialItemIds = await getMaterialItemIds(supabase, filters)
    if (!materialItemIds.length) return []

    // Hitung totalUnikSemester (denominator fixed = semua materi semester ini)
    const classMasterIds = await getClassMasterIds(supabase, filters.classId)
    const { data: allTargets } = await supabase
        .from('material_monthly_targets')
        .select('material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', filters.academicYearId)
        .eq('semester', filters.semester)
    const totalUnikSemester = new Set((allTargets || []).map((t: any) => t.material_item_id)).size

    // Denominator: cumulative = fixed semester total, monthly = only this month's targets
    const denominator = filters.reportMode === 'cumulative'
        ? totalUnikSemester
        : materialItemIds.length

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
            total_materials: denominator,
            percentage: denominator > 0 ? Math.round((tuntasCount / denominator) * 100) : 0,
            avg_nilai: avgNilai,
        }
    }).sort((a, b) => a.student_name.localeCompare(b.student_name))
}


export async function getMateriCumulativeProgress(
    supabase: SupabaseClient,
    params: {
        classId: string
        academicYearId: string
        semester: 1 | 2
        upToMonth: number
        viewMode: 'per_materi' | 'per_siswa'
    }
): Promise<MateriMonthlyPoint[]> {
    const { classId, academicYearId, semester, upToMonth, viewMode } = params

    // 1. Get class_master_ids for this class
    const classMasterIds = await getClassMasterIds(supabase, classId)
    if (classMasterIds.length === 0) return []

    // 2. Get all material items targeted for this class + academic_year + semester
    const { data: targets } = await supabase
        .from('material_monthly_targets')
        .select('month, material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)
    
    if (!targets || targets.length === 0) return []

    const totalUnikSemester = new Set(targets.map((t: any) => t.material_item_id)).size

    // 3. Get total students
    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')
    const totalStudents = enrollments?.length || 0
    if (totalStudents === 0) return []
    const studentIds = enrollments!.map(e => e.student_id)

    // 4. Get all progress for this semester (without filtering by month)
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, hafal')
        .in('student_id', studentIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    // 5. Define month range for the semester
    const semesterMonths = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6]
    
    // 6. Calculate cumulative progress per month
    const result: MateriMonthlyPoint[] = []
    const accumulatedMaterialIds = new Set<string>()

    for (const m of semesterMonths) {
        // Akumulasi materi s.d. bulan ini (termasuk bulan setelah upToMonth)
        targets
            .filter((t: any) => t.month === m)
            .forEach((t: any) => accumulatedMaterialIds.add(t.material_item_id))
        const currentIds = Array.from(accumulatedMaterialIds)

        let percentage = 0
        let tuntasCount = 0

        // Rata-rata per siswa untuk semua viewMode (per_materi dan per_siswa konsisten)
        let totalPctSum = 0
        for (const studentId of studentIds) {
            const siswaCount = currentIds.filter(materialId => {
                const p = (progress || []).find((p: any) =>
                    p.student_id === studentId && p.material_item_id === materialId
                )
                return p && ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            }).length
            totalPctSum += totalUnikSemester > 0
                ? (siswaCount / totalUnikSemester) * 100
                : 0
        }
        percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
        tuntasCount = totalStudents > 0
            ? Math.round((totalPctSum / totalStudents / 100) * totalUnikSemester)
            : 0

        result.push({
            month: m,
            month_label: getMonthName(m as any).substring(0, 3),
            target_count: totalUnikSemester,
            tuntas_count: tuntasCount,
            percentage,
            tercapai: `${tuntasCount}/${totalUnikSemester}`
        })
    }

    return result
}

export async function getMateriMonthlyChart(
    supabase: SupabaseClient,
    params: {
        classId: string
        academicYearId: string
        semester: 1 | 2
    }
): Promise<MateriMonthlyPoint[]> {
    const { classId, academicYearId, semester } = params

    const classMasterIds = await getClassMasterIds(supabase, classId)
    if (classMasterIds.length === 0) return []

    // Fetch semua targets semester ini (semua bulan)
    const { data: targets } = await supabase
        .from('material_monthly_targets')
        .select('month, material_item_id')
        .in('class_master_id', classMasterIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (!targets || targets.length === 0) return []

    // Get students
    const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('student_id')
        .eq('class_id', classId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')
    const totalStudents = enrollments?.length || 0
    if (totalStudents === 0) return []
    const studentIds = enrollments!.map((e: any) => e.student_id)

    // Get all progress semester ini
    const { data: progress } = await supabase
        .from('student_material_progress')
        .select('student_id, material_item_id, nilai, hafal')
        .in('student_id', studentIds)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    const semesterMonths = semester === 1 ? [7, 8, 9, 10, 11, 12] : [1, 2, 3, 4, 5, 6]
    const result: MateriMonthlyPoint[] = []

    for (const m of semesterMonths) {
        const monthTargets = targets.filter((t: any) => t.month === m)
        const monthMaterialIds = [...new Set(monthTargets.map((t: any) => t.material_item_id))]

        let totalPctSum = 0
        for (const studentId of studentIds) {
            const siswaCount = (progress || []).filter((p: any) =>
                p.student_id === studentId &&
                monthMaterialIds.includes(p.material_item_id) &&
                ((p.nilai !== null && p.nilai >= 70) || p.hafal === true)
            ).length
            totalPctSum += monthMaterialIds.length > 0
                ? (siswaCount / monthMaterialIds.length) * 100
                : 0
        }

        const percentage = totalStudents > 0 ? Math.round(totalPctSum / totalStudents) : 0
        const avgTuntas = totalStudents > 0
            ? Math.round((totalPctSum / totalStudents / 100) * monthMaterialIds.length)
            : 0

        result.push({
            month: m,
            month_label: getMonthName(m as any).substring(0, 3),
            target_count: monthMaterialIds.length,
            tuntas_count: avgTuntas,
            percentage,
            tercapai: `${avgTuntas}/${monthMaterialIds.length}`
        })
    }

    return result
}
