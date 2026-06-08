import type { SupabaseClient } from '@supabase/supabase-js'

const SETTING_KEY = 'grade_promotion_enabled'

/** Layer 1: ambil row toggle naik-kelas dari app_settings */
export async function fetchPromotionEnabled(supabase: SupabaseClient) {
    return await supabase
        .from('app_settings')
        .select('value')
        .eq('key', SETTING_KEY)
        .maybeSingle()
}

/** Layer 1: upsert toggle naik-kelas ke app_settings (reuse tabel existing) */
export async function upsertPromotionEnabled(
    supabase: SupabaseClient,
    value: object,
    userId: string
) {
    return await supabase
        .from('app_settings')
        .upsert(
            {
                key: SETTING_KEY,
                value,
                updated_by: userId,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'key' }
        )
        .select()
        .single()
}
