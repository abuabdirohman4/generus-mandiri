'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, canManageMaterials } from '@/lib/accessControlServer'

export interface ClassMateriSummary {
    class_id: string
    class_name: string
    kelompok_name: string
    total_materials: number
    avg_completion_rate: number  // % siswa capai target (nilai >= 70) rata-rata lintas materi
    avg_nilai: number
}

export interface MateriDashboardFilters {
    academicYearId: string
    semester: 1 | 2
    categoryId?: string
    daerahId?: string
    desaId?: string
    kelompokId?: string
    classIds?: string[]  // override — jika diisi, hanya kelas ini yang dihitung
    month?: number
}

export async function getMateriDashboardSummary(
    filters: MateriDashboardFilters
): Promise<ClassMateriSummary[]> {
    const supabase = await createClient()
    const profile = await getCurrentUserProfile()

    if (!profile || !canManageMaterials(profile)) return []
    if (!filters.academicYearId) return []

    // Step 1: Tentukan kelas yang accessible
    let classQuery = supabase
        .from('classes')
        .select('id, name, kelompok:kelompok_id(id, name, desa_id)')
    
    if (filters.classIds?.length) {
        classQuery = classQuery.in('id', filters.classIds)
    } else if (profile.role === 'teacher' && profile.classes?.length) {
        classQuery = classQuery.in('id', profile.classes.map(c => c.id))
    }
    
    // Admin/Superadmin: filter by org scope
    if (filters.kelompokId) {
        classQuery = classQuery.eq('kelompok_id', filters.kelompokId)
    } else if (filters.desaId) {
        // Since we don't have direct desa_id in classes, we filter by kelompok's desa_id
        const { data: kelompoks } = await supabase
            .from('kelompok')
            .select('id')
            .eq('desa_id', filters.desaId)
        
        const kIds = (kelompoks || []).map(k => k.id)
        if (kIds.length) {
            classQuery = classQuery.in('kelompok_id', kIds)
        } else {
            return [] // No groups in this desa
        }
    } else if (filters.daerahId) {
        const { data: desas } = await supabase
            .from('desa')
            .select('id')
            .eq('daerah_id', filters.daerahId)
        
        const dIds = (desas || []).map(d => d.id)
        if (dIds.length) {
            const { data: kelompoks } = await supabase
                .from('kelompok')
                .select('id')
                .in('desa_id', dIds)
            
            const kIds = (kelompoks || []).map(k => k.id)
            if (kIds.length) {
                classQuery = classQuery.in('kelompok_id', kIds)
            } else {
                return []
            }
        } else {
            return []
        }
    }

    const { data: classes } = await classQuery
    if (!classes?.length) return []

    // Step 2: Untuk setiap kelas, hitung ringkasan materi
    const results: ClassMateriSummary[] = []

    for (const cls of classes) {
        // 2a: enrolled students
        const { data: enrollments } = await supabase
            .from('student_enrollments')
            .select('student_id')
            .eq('class_id', cls.id)
            .eq('academic_year_id', filters.academicYearId)
            .eq('status', 'active')

        if (!enrollments?.length) {
            results.push({
                class_id: cls.id,
                class_name: cls.name,
                kelompok_name: Array.isArray(cls.kelompok) 
                    ? (cls.kelompok[0] as any)?.name || '' 
                    : (cls.kelompok as any)?.name || '',
                total_materials: 0,
                avg_completion_rate: 0,
                avg_nilai: 0,
            })
            continue
        }

        const studentIds = enrollments.map(e => e.student_id)

        // 2b: material item IDs via class_master_mappings → material_monthly_targets
        const { data: mappings } = await supabase
            .from('class_master_mappings')
            .select('class_master_id')
            .eq('class_id', cls.id)
        
        if (!mappings?.length) {
             results.push({
                class_id: cls.id,
                class_name: cls.name,
                kelompok_name: Array.isArray(cls.kelompok) 
                    ? (cls.kelompok[0] as any)?.name || '' 
                    : (cls.kelompok as any)?.name || '',
                total_materials: 0,
                avg_completion_rate: 0,
                avg_nilai: 0,
            })
            continue
        }
        const classMasterIds = mappings.map(m => m.class_master_id)

        let targetQuery = supabase
            .from('material_monthly_targets')
            .select('material_item_id')
            .in('class_master_id', classMasterIds)
            .eq('academic_year_id', filters.academicYearId)
            .eq('semester', filters.semester)

        if (filters.month) {
            targetQuery = targetQuery.lte('month', filters.month)
        }

        if (filters.categoryId) {
            // Filter by category via material_items → material_types → material_categories
            const { data: itemsInCategory } = await supabase
                .from('material_items')
                .select('id, material_types!inner(material_category_id)')
                .eq('material_types.material_category_id', filters.categoryId)
            
            const categoryItemIds = (itemsInCategory || []).map(i => i.id)
            if (categoryItemIds.length) {
                targetQuery = targetQuery.in('material_item_id', categoryItemIds)
            } else {
                // Category exists but has no items
                results.push({
                    class_id: cls.id,
                    class_name: cls.name,
                    kelompok_name: Array.isArray(cls.kelompok) 
                        ? (cls.kelompok[0] as any)?.name || '' 
                        : (cls.kelompok as any)?.name || '',
                    total_materials: 0,
                    avg_completion_rate: 0,
                    avg_nilai: 0,
                })
                continue
            }
        }

        const { data: targets } = await targetQuery
        if (!targets?.length) {
             results.push({
                class_id: cls.id,
                class_name: cls.name,
                kelompok_name: Array.isArray(cls.kelompok) 
                    ? (cls.kelompok[0] as any)?.name || '' 
                    : (cls.kelompok as any)?.name || '',
                total_materials: 0,
                avg_completion_rate: 0,
                avg_nilai: 0,
            })
            continue
        }

        const materialItemIds = [...new Set(targets.map(t => t.material_item_id))]

        // 2c: progress
        const { data: progressList } = await supabase
            .from('student_material_progress')
            .select('student_id, material_item_id, nilai')
            .in('student_id', studentIds)
            .in('material_item_id', materialItemIds)
            .eq('academic_year_id', filters.academicYearId)
            .eq('semester', filters.semester)

        // 2d: aggregate per material, then average
        let totalCompletionRate = 0
        let totalNilaiSum = 0
        let nilaiCount = 0

        for (const materialId of materialItemIds) {
            const matProgress = (progressList || []).filter(p => p.material_item_id === materialId)
            const tuntasCount = matProgress.filter(p => (p.nilai ?? 0) >= 70).length
            totalCompletionRate += studentIds.length > 0
                ? (tuntasCount / studentIds.length) * 100
                : 0
            
            const scored = matProgress.filter(p => (p.nilai ?? 0) > 0)
            if (scored.length) {
                totalNilaiSum += scored.reduce((s, p) => s + (p.nilai ?? 0), 0) / scored.length
                nilaiCount++
            }
        }

        results.push({
            class_id: cls.id,
            class_name: cls.name,
            kelompok_name: Array.isArray(cls.kelompok) 
                ? (cls.kelompok[0] as any)?.name || '' 
                : (cls.kelompok as any)?.name || '',
            total_materials: materialItemIds.length,
            avg_completion_rate: materialItemIds.length > 0
                ? Math.round(totalCompletionRate / materialItemIds.length)
                : 0,
            avg_nilai: nilaiCount > 0 ? Math.round(totalNilaiSum / nilaiCount) : 0,
        })
    }

    return results.sort((a, b) => b.avg_completion_rate - a.avg_completion_rate)
}
