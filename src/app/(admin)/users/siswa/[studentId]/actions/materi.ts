'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getGrade, getProgressTextColor } from '@/lib/percentages'

export interface StudentMateriProgressItem {
    material_item_id: string
    material_name: string
    type_name: string
    category_name: string
    nilai: number | null
    grade: string
    colorClass: string
}

export interface StudentMateriProgressResult {
    grouped: Record<string, StudentMateriProgressItem[]>
    totalTuntas: number
    totalItems: number
}

export async function getStudentMateriProgress(
    studentId: string,
    academicYearId: string,
    semester: number
): Promise<StudentMateriProgressResult> {
    const supabase = await createAdminClient()

    // 1. Fetch progress records for this student
    const { data: progressData, error: progressError } = await supabase
        .from('student_material_progress')
        .select('material_item_id, nilai')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    if (progressError || !progressData || progressData.length === 0) {
        return { grouped: {}, totalTuntas: 0, totalItems: 0 }
    }

    const materialItemIds = progressData.map(p => p.material_item_id)

    // 2. Fetch material item details separately (avoid unreliable nested join)
    const { data: itemsData } = await supabase
        .from('material_items')
        .select(`
            id,
            name,
            material_types (
                id,
                name,
                material_categories ( id, name )
            )
        `)
        .in('id', materialItemIds)

    // Build lookup map
    const itemMap = new Map<string, { name: string; typeName: string; categoryName: string }>()
    for (const item of (itemsData || [])) {
        const type = item.material_types as any
        itemMap.set(item.id, {
            name: item.name,
            typeName: type?.name ?? '—',
            categoryName: type?.material_categories?.name ?? '—',
        })
    }

    // 3. Combine progress + item details
    const items: StudentMateriProgressItem[] = progressData.map(p => {
        const info = itemMap.get(p.material_item_id)
        const nilai = p.nilai ?? null
        const gradeInfo = getGrade(nilai ?? 0)
        const colorClass = getProgressTextColor(nilai ?? 0)

        return {
            material_item_id: p.material_item_id,
            material_name: info?.name ?? '—',
            type_name: info?.typeName ?? '—',
            category_name: info?.categoryName ?? '—',
            nilai,
            grade: nilai !== null ? gradeInfo.grade : '-',
            colorClass: nilai !== null ? colorClass : 'text-gray-400',
        }
    })

    // 4. Group by category
    const grouped: Record<string, StudentMateriProgressItem[]> = {}
    for (const item of items) {
        if (!grouped[item.category_name]) grouped[item.category_name] = []
        grouped[item.category_name].push(item)
    }

    const totalTuntas = items.filter(i => i.nilai !== null && i.nilai >= 70).length

    return { grouped, totalTuntas, totalItems: items.length }
}
