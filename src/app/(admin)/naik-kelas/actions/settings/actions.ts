'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import { revalidatePath } from 'next/cache'
import type { PromotionEnabledValue } from '@/types/promotion'
import { fetchPromotionEnabled, upsertPromotionEnabled } from './queries'

/** Baca status toggle "Mode Naik Kelas". Dipakai sidebar + halaman wizard + settings. */
export async function getPromotionEnabled() {
    const supabase = await createAdminClient()
    const { data, error } = await fetchPromotionEnabled(supabase)
    if (error) return { success: false, data: { enabled: false }, message: error.message }
    const value = (data?.value as PromotionEnabledValue | undefined) ?? null
    return { success: true, data: { enabled: value?.enabled === true }, message: '' }
}

/** Aktif/nonaktifkan toggle. Hanya Superadmin & Admin Daerah. */
export async function togglePromotionEnabled(enabled: boolean) {
    const profile = await getCurrentUserProfile()
    if (!profile || !(isSuperAdmin(profile) || isAdminDaerah(profile))) {
        return { success: false, data: null, message: 'Anda tidak memiliki izin mengubah mode naik kelas' }
    }

    const supabase = await createAdminClient()
    const value: PromotionEnabledValue = {
        enabled,
        enabled_by: profile.id,
        enabled_at: new Date().toISOString(),
    }

    const { error } = await upsertPromotionEnabled(supabase, value, profile.id)
    if (error) return { success: false, data: null, message: error.message }

    revalidatePath('/settings/grade-promotion')
    revalidatePath('/naik-kelas')
    return {
        success: true,
        data: { enabled },
        message: enabled ? 'Mode naik kelas diaktifkan' : 'Mode naik kelas dinonaktifkan',
    }
}
