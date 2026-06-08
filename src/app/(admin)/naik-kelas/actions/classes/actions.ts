'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import type { PromotionSourceOption, PromotionStudentRow } from '@/types/promotion'
import {
    fetchClassMastersWithPromote,
    resolveKelompokIdsInScope,
    fetchClassesWithMasterInKelompok,
    fetchStudentsInClasses,
    fetchTeacherClassIds,
} from './queries'
import { filterPromotableMasters, resolveTargetClassInKelompok } from './logic'

/** Apakah profile = guru biasa (punya assignment teacher_classes), bukan guru hierarki. */
async function isRegularTeacher(supabase: any, profile: any): Promise<boolean> {
    if (profile.role !== 'teacher') return false
    const ids = await fetchTeacherClassIds(supabase, profile.id)
    return ids.length > 0
}

/**
 * Step 1 — opsi kelas asal.
 * - Admin & guru hierarki → daftar class_master yang promotable (kind='class_master')
 * - Guru biasa → kelas yang dia ajar (kind='class')
 */
export async function getPromotionSourceOptions(): Promise<{ success: boolean; data: PromotionSourceOption[]; message: string }> {
    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: [], message: 'Tidak terautentikasi' }

    const supabase = await createAdminClient()
    const { data: masters } = await fetchClassMastersWithPromote(supabase)
    const masterList = masters || []
    const masterById = new Map(masterList.map((m: any) => [m.id, m]))

    // Guru biasa → kelas yang dia ajar
    if (await isRegularTeacher(supabase, profile)) {
        const teacherClassIds = await fetchTeacherClassIds(supabase, profile.id)
        const kelompokIds = await resolveKelompokIdsInScope(supabase, getDataFilter(profile))
        const { classes } = await fetchClassesWithMasterInKelompok(supabase, kelompokIds)
        const mine = classes.filter(c => teacherClassIds.includes(c.class_id))
        const options: PromotionSourceOption[] = mine
            .map(c => {
                const master: any = masterById.get(c.class_master_id)
                const toMaster: any = master?.promote_to_class_master_id ? masterById.get(master.promote_to_class_master_id) : null
                if (!toMaster) return null // stopper → tidak ditampilkan
                return {
                    kind: 'class' as const,
                    id: c.class_id,
                    name: c.class_name,
                    to_name: toMaster.name,
                }
            })
            .filter(Boolean) as PromotionSourceOption[]
        return { success: true, data: options, message: '' }
    }

    // Admin & guru hierarki → class_master promotable
    const promotable = filterPromotableMasters(masterList as any[])
    const options: PromotionSourceOption[] = promotable.map((m: any) => {
        const toMaster: any = masterById.get(m.promote_to_class_master_id)
        return {
            kind: 'class_master' as const,
            id: m.id,
            name: m.name,
            to_name: toMaster?.name ?? null,
        }
    })
    return { success: true, data: options, message: '' }
}

/**
 * Step 2 — siswa yang akan dinaikkan dari satu/lebih source terpilih.
 * Mendukung multi-select (termasuk "pilih semua").
 * - kind='class_master' → semua kelas dgn master itu dalam scope.
 * - kind='class' → 1 kelas (guru biasa).
 * Kelas tujuan di-resolve per-siswa berdasar master kelas asalnya (promoteMap), di kelompok yg sama.
 * fromClassIds di-dedup → tiap siswa hanya muncul sekali.
 */
export async function getStudentsToPromote(
    sources: { kind: 'class_master' | 'class'; id: string }[]
): Promise<{ success: boolean; data: PromotionStudentRow[]; message: string }> {
    const profile = await getCurrentUserProfile()
    if (!profile) return { success: false, data: [], message: 'Tidak terautentikasi' }
    if (!sources || sources.length === 0) return { success: true, data: [], message: '' }

    const supabase = await createAdminClient()
    const { data: masters } = await fetchClassMastersWithPromote(supabase)
    const masterList = masters || []

    // promoteMap: from_master_id → to_master_id|null (sekali bangun)
    const promoteMap = new Map<string, string | null>(
        masterList.map((m: any) => [m.id, m.promote_to_class_master_id ?? null])
    )

    const kelompokIds = await resolveKelompokIdsInScope(supabase, getDataFilter(profile))
    const { classes } = await fetchClassesWithMasterInKelompok(supabase, kelompokIds)
    const classById = new Map(classes.map(c => [c.class_id, c]))

    // kumpulkan kelas asal gabungan dari semua source, dedup
    const fromClassIdSet = new Set<string>()
    for (const source of sources) {
        if (source.kind === 'class') {
            if (classById.has(source.id)) fromClassIdSet.add(source.id)
        } else {
            // class_master → semua kelas dgn master itu dalam scope
            classes.filter(c => c.class_master_id === source.id).forEach(c => fromClassIdSet.add(c.class_id))
        }
    }
    const fromClassIds = [...fromClassIdSet]
    if (fromClassIds.length === 0) return { success: true, data: [], message: '' }

    const { data: students } = await fetchStudentsInClasses(supabase, fromClassIds)
    const classesForResolve = classes.map(c => ({
        class_id: c.class_id,
        class_master_id: c.class_master_id,
        kelompok_id: c.kelompok_id,
    }))

    const rows: PromotionStudentRow[] = (students || []).map((s: any) => {
        const fromClass = classById.get(s.class_id)
        const fromMasterId = fromClass?.class_master_id ?? ''
        const targetMasterId = promoteMap.get(fromMasterId) ?? null
        const toClassId = resolveTargetClassInKelompok(targetMasterId, s.kelompok_id, classesForResolve)
        const toClass = toClassId ? classById.get(toClassId) : null
        return {
            student_id: s.id,
            student_name: s.name,
            gender: s.gender ?? null,
            kelompok_id: s.kelompok_id,
            kelompok_name: s.kelompok?.name ?? fromClass?.kelompok_name ?? '',
            from_class_id: s.class_id,
            from_class_name: fromClass?.class_name ?? '',
            to_class_id: toClassId,
            to_class_name: toClass?.class_name ?? null,
            excluded: false,
        }
    })

    return { success: true, data: rows, message: '' }
}
