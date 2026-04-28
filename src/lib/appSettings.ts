import { createAdminClient } from '@/lib/supabase/server'
import type { AppSettingPassingScore } from '@/types/material'

const DEFAULT_PASSING_SCORE = 70

/**
 * Get passing score from app_settings table.
 * If category_id provided, returns category-specific score.
 * Falls back to default (70) if setting not found.
 */
export async function getPassingScore(categoryId?: string): Promise<number> {
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'passing_score')
      .single()

    if (error || !data) return DEFAULT_PASSING_SCORE

    const setting = data.value as AppSettingPassingScore

    if (categoryId && setting.by_category[categoryId] !== undefined) {
      return setting.by_category[categoryId]
    }

    return setting.default ?? DEFAULT_PASSING_SCORE
  } catch {
    return DEFAULT_PASSING_SCORE
  }
}
