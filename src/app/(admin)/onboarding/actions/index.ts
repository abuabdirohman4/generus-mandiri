'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { handleApiError } from '@/lib/errorUtils'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activityLogger'
import { canOnboard } from './orchestration/logic'
import { insertDaerahReturningId, insertDesaReturningId, insertKelompokReturningId } from './orchestration/queries'

// ─── Org creation actions (return id for cascading) ───────────────────────


/**
 * Create a new Daerah and return its id.
 * Used by the onboarding wizard Step 1.
 */
export async function onboardCreateDaerah(name: string): Promise<{ success: boolean; data?: { id: string }; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!canOnboard(profile)) {
      throw new Error('Anda tidak memiliki akses untuk membuat organisasi')
    }

    if (!name?.trim()) throw new Error('Nama daerah harus diisi')

    const supabase = await createClient()
    const { data, error } = await insertDaerahReturningId(supabase, { name })
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Gagal mendapatkan id daerah yang dibuat')

    revalidatePath('/organisasi')
    revalidatePath('/onboarding')

    void logActivity({
      userId: profile!.id,
      action: 'create_daerah',
      entityType: 'daerah',
      entityLabel: name,
      pagePath: '/onboarding',
    })

    return { success: true, data: { id: data.id } }
  } catch (error) {
    const info = handleApiError(error, 'menyimpan data', 'Gagal membuat daerah')
    return { success: false, message: info.message }
  }
}

/**
 * Create a new Desa under the given daerah and return its id.
 */
export async function onboardCreateDesa(name: string, daerahId: string): Promise<{ success: boolean; data?: { id: string }; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!canOnboard(profile)) {
      throw new Error('Anda tidak memiliki akses untuk membuat organisasi')
    }

    if (!name?.trim()) throw new Error('Nama desa harus diisi')
    if (!daerahId) throw new Error('Daerah harus dipilih')

    const supabase = await createClient()
    const { data, error } = await insertDesaReturningId(supabase, { name, daerah_id: daerahId })
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Gagal mendapatkan id desa yang dibuat')

    revalidatePath('/organisasi')
    revalidatePath('/onboarding')

    void logActivity({
      userId: profile!.id,
      action: 'create_desa',
      entityType: 'desa',
      entityLabel: name,
      pagePath: '/onboarding',
    })

    return { success: true, data: { id: data.id } }
  } catch (error) {
    const info = handleApiError(error, 'menyimpan data', 'Gagal membuat desa')
    return { success: false, message: info.message }
  }
}

/**
 * Create a new Kelompok under the given desa and return its id.
 */
export async function onboardCreateKelompok(name: string, desaId: string): Promise<{ success: boolean; data?: { id: string }; message?: string }> {
  try {
    const profile = await getCurrentUserProfile()
    if (!canOnboard(profile)) {
      throw new Error('Anda tidak memiliki akses untuk membuat organisasi')
    }

    if (!name?.trim()) throw new Error('Nama kelompok harus diisi')
    if (!desaId) throw new Error('Desa harus dipilih')

    const supabase = await createClient()
    const { data, error } = await insertKelompokReturningId(supabase, { name, desa_id: desaId })
    if (error) throw new Error(error.message)
    if (!data?.id) throw new Error('Gagal mendapatkan id kelompok yang dibuat')

    revalidatePath('/organisasi')
    revalidatePath('/onboarding')

    void logActivity({
      userId: profile!.id,
      action: 'create_kelompok',
      entityType: 'kelompok',
      entityLabel: name,
      pagePath: '/onboarding',
    })

    return { success: true, data: { id: data.id } }
  } catch (error) {
    const info = handleApiError(error, 'menyimpan data', 'Gagal membuat kelompok')
    return { success: false, message: info.message }
  }
}
