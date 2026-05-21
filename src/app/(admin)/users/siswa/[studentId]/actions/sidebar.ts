'use server'

import { getAllStudents } from '@/app/(admin)/users/siswa/actions/students/actions'
import { getCurrentUserProfile } from '@/lib/accessControlServer'

export interface SidebarStudent {
    id: string
    name: string
    class_id: string | null
    class_name: string | null
    kelompok_id: string | null
    kelompok_name: string | null
    desa_id: string | null
    desa_name: string | null
    daerah_id: string | null
    status: string
    classes: { id: string; name: string }[]
}

export async function getStudentsForSidebar(): Promise<SidebarStudent[]> {
    const profile = await getCurrentUserProfile()
    if (!profile) return []

    // getAllStudents handles RLS and teacher scope filtering
    const result = await getAllStudents()
    if (!result.success || !result.data) return []

    return result.data.map((s: any) => ({
        id: s.id,
        name: s.name,
        class_id: s.class_id || null,
        class_name: s.class_name || null,
        kelompok_id: s.kelompok_id || null,
        kelompok_name: s.kelompok_name || null,
        desa_id: s.desa_id || null,
        desa_name: s.desa_name || null,
        daerah_id: s.daerah_id || null,
        status: s.status || 'active',
        classes: s.classes || []
    }))
}
