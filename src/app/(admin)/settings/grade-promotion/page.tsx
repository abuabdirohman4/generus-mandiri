import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import { getPromotionEnabled } from '../../naik-kelas/actions'
import PromotionToggleClient from './PromotionToggleClient'

export const metadata = {
    title: 'Mode Naik Kelas | Generus Mandiri',
}

export default async function GradePromotionSettingsPage() {
    const profile = await getCurrentUserProfile()
    if (!profile || !(isSuperAdmin(profile) || isAdminDaerah(profile))) {
        redirect('/settings')
    }
    const res = await getPromotionEnabled()
    return <PromotionToggleClient initialEnabled={res.data?.enabled === true} />
}
