'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import { revalidatePath } from 'next/cache'
import type { PromotionEnabledValue } from '@/types/promotion'
import { fetchPromotionEnabled, upsertPromotionEnabled } from './queries'

/** 
 * Baca status "Mode Naik Kelas". 
 * Aktif jika: end_date diset dan belum lewat hari ini (Jakarta TZ), ATAU fallback enabled=true.
 */
export async function getPromotionEnabled() {
    const supabase = await createAdminClient()
    const { data, error } = await fetchPromotionEnabled(supabase)
    if (error) return { success: false, data: { enabled: false, endDate: null }, message: error.message }
    
    const value = (data?.value as PromotionEnabledValue | undefined) ?? null
    const endDateStr = value?.end_date ?? null
    
    let isActive = false
    if (endDateStr) {
        // Cek dengan Jakarta TZ
        const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
        const endDate = new Date(new Date(endDateStr).toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
        
        // Cek akhir hari (23:59:59)
        endDate.setHours(23, 59, 59, 999)
        
        isActive = now <= endDate
    } else {
        // Fallback untuk legacy row
        isActive = value?.enabled === true
    }
    
    return { success: true, data: { enabled: isActive, endDate: endDateStr }, message: '' }
}

/**
 * Atur batas waktu naik kelas (end_date). Hanya Superadmin & Admin Daerah.
 */
export async function updatePromotionEndDate(endDate: string | null) {
    const profile = await getCurrentUserProfile()
    if (!profile || !(isSuperAdmin(profile) || isAdminDaerah(profile))) {
        return { success: false, data: null, message: 'Anda tidak memiliki izin mengubah mode naik kelas' }
    }

    const supabase = await createAdminClient()
    const nowIso = new Date().toISOString()
    const value: PromotionEnabledValue = {
        enabled: endDate !== null, // legacy flag
        end_date: endDate,
        enabled_by: profile.id,
        enabled_at: nowIso,
    }

    const { error } = await upsertPromotionEnabled(supabase, value, profile.id)
    if (error) return { success: false, data: null, message: error.message }

    revalidatePath('/settings/grade-promotion')
    revalidatePath('/naik-kelas')
    
    const msg = endDate 
        ? `Batas waktu naik kelas diatur ke ${endDate}` 
        : 'Mode naik kelas ditutup / dinonaktifkan'
        
    return {
        success: true,
        data: { enabled: endDate !== null, endDate },
        message: msg,
    }
}
