import { redirect } from 'next/navigation'
import { getAcademicYears, getActiveAcademicYear } from '../tahun-ajaran/actions/academic-years'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import PromotionClient from './PromotionClient'

export const dynamic = 'force-dynamic'

export const metadata = {
    title: 'Naik Kelas | Generus Mandiri',
    description: 'Kenaikan kelas massal per tahun ajaran',
}

export default async function NaikKelasPage() {
    // Gate sudah pindah ke backend/dropdown logic. Halaman selalu bisa diakses.

    const [years, activeYear, profile] = await Promise.all([
        getAcademicYears(),
        getActiveAcademicYear(),
        getCurrentUserProfile(),
    ])

    const academicYears = (years || []).map(y => ({ id: y.id, name: y.name }))
    const defaultYearId = activeYear?.id ?? academicYears[0]?.id ?? ''
    const canPickYear = !!profile && (isSuperAdmin(profile) || isAdminDaerah(profile))

    return (
        <PromotionClient
            academicYears={academicYears}
            defaultYearId={defaultYearId}
            canPickYear={canPickYear}
        />
    )
}
