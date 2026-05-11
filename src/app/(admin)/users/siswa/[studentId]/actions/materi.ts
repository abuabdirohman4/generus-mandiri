'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getRateGrade, getRateStyle } from '@/lib/percentages'

export interface StudentMateriProgressItem {
    material_item_id: string
    material_name: string
    type_name: string
    category_name: string
    nilai: number | null
    grade: string
    colorClass: string
    month: number | null // For backward compatibility or single month display
    months: number[] // All months this item is targeted for in this semester
}

export interface StudentMateriProgressResult {
    grouped: Record<string, StudentMateriProgressItem[]>
    totalTuntas: number
    totalItems: number
    allProgress: StudentMateriProgressItem[]
}

export async function getStudentMateriProgress(
    studentId: string,
    academicYearId: string,
    semester: number
): Promise<StudentMateriProgressResult> {
    const supabase = await createAdminClient()

    // 1. Fetch student's class to get monthly targets
    const { data: enrollment } = await supabase
        .from('student_enrollments')
        .select('class_id')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('status', 'active')
        .single()

    let targetedItemIds: string[] = []
    let monthMap = new Map<string, number[]>()

    if (enrollment?.class_id) {
        // Get class master mappings
        const { data: classMappings } = await supabase
            .from('class_master_mappings')
            .select('class_master_id')
            .eq('class_id', enrollment.class_id)
        
        const classMasterIds = classMappings?.map(m => m.class_master_id) || []

        if (classMasterIds.length > 0) {
            // Get targets for these class masters
            const { data: targets } = await supabase
                .from('material_monthly_targets')
                .select('material_item_id, month')
                .in('class_master_id', classMasterIds)
                .eq('academic_year_id', academicYearId)
                .eq('semester', semester)
            
            targetedItemIds = Array.from(new Set(targets?.map(t => t.material_item_id) || []))
            targets?.forEach(t => {
                const existing = monthMap.get(t.material_item_id) || []
                if (!existing.includes(t.month)) {
                    monthMap.set(t.material_item_id, [...existing, t.month])
                }
            })
        }
    }

    // 2. Fetch progress records for this student
    const { data: progressData } = await supabase
        .from('student_material_progress')
        .select('material_item_id, nilai')
        .eq('student_id', studentId)
        .eq('academic_year_id', academicYearId)
        .eq('semester', semester)

    const progressMap = new Map<string, number | null>()
    progressData?.forEach(p => {
        progressMap.set(p.material_item_id, p.nilai)
    })

    // 3. Combine unique material item IDs (Targets + Progress)
    const progressItemIds = progressData?.map(p => p.material_item_id) || []
    const allItemIds = Array.from(new Set([...targetedItemIds, ...progressItemIds]))

    if (allItemIds.length === 0) {
        return { grouped: {}, totalTuntas: 0, totalItems: 0, allProgress: [] }
    }

    // 4. Fetch material item details
    const { data: itemsData } = await supabase
        .from('material_items')
        .select(`
            id,
            name,
            material_types!inner (
                id,
                name,
                material_categories!inner ( id, name )
            )
        `)
        .in('id', allItemIds)

    // Build lookup map
    const itemInfoMap = new Map<string, { name: string; typeName: string; categoryName: string }>()
    for (const item of (itemsData || [])) {
        const type = item.material_types as any
        itemInfoMap.set(item.id, {
            name: item.name,
            typeName: type?.name ?? '—',
            categoryName: type?.material_categories?.name ?? '—',
        })
    }

    // 5. Build final items list
    const items: StudentMateriProgressItem[] = allItemIds.map(id => {
        const info = itemInfoMap.get(id)
        const nilai = progressMap.has(id) ? progressMap.get(id) ?? null : null
        const gradeInfo = getRateGrade(nilai ?? 0)
        const colorClass = getRateStyle(nilai ?? 0, 'text-pure')
        const targetMonths = monthMap.get(id) || []

        return {
            material_item_id: id,
            material_name: info?.name ?? '—',
            type_name: info?.typeName ?? '—',
            category_name: info?.categoryName ?? '—',
            nilai,
            grade: nilai !== null ? gradeInfo.grade : '-',
            colorClass: nilai !== null ? colorClass : 'text-gray-400',
            month: targetMonths.length > 0 ? targetMonths[0] : null,
            months: targetMonths,
        }
    })

    // 6. Group by category
    const grouped: Record<string, StudentMateriProgressItem[]> = {}
    for (const item of items) {
        const category = item.category_name
        if (!grouped[category]) grouped[category] = []
        grouped[category].push(item)
    }

    const totalTuntas = items.filter(i => i.nilai !== null && i.nilai >= 70).length

    return { 
        grouped, 
        totalTuntas, 
        totalItems: items.length,
        allProgress: items 
    }
}
